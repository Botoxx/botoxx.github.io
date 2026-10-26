locals {
  name = "cloudgeist-contact"
}

data "aws_caller_identity" "current" {}

# SES domain identity with Easy DKIM. The three CNAME records in the `dkim_records` output go into the
# domain's DNS (Namecheap); until they resolve, the identity stays unverified and sending fails.
resource "aws_sesv2_email_identity" "domain" {
  email_identity = var.domain
}

# One table for both the per-network rate limit and the idempotency claims; TTL clears old items.
resource "aws_dynamodb_table" "relay" {
  name         = local.name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"

  attribute {
    name = "pk"
    type = "S"
  }

  ttl {
    attribute_name = "expires"
    enabled        = true
  }
}

# Salt for hashing source IPs, so the table never holds a raw address.
resource "random_password" "ip_salt" {
  length  = 32
  special = false
}

resource "aws_cloudwatch_log_group" "relay" {
  name              = "/aws/lambda/${local.name}"
  retention_in_days = 14
}

data "aws_iam_policy_document" "assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "relay" {
  name               = local.name
  assume_role_policy = data.aws_iam_policy_document.assume.json
}

# Least privilege: send from this one identity, use this one table, write this one log group.
data "aws_iam_policy_document" "relay" {
  statement {
    sid       = "SendFromDomain"
    actions   = ["ses:SendEmail"]
    resources = [aws_sesv2_email_identity.domain.arn]
  }
  statement {
    sid       = "RelayTable"
    actions   = ["dynamodb:UpdateItem", "dynamodb:PutItem", "dynamodb:GetItem", "dynamodb:DeleteItem"]
    resources = [aws_dynamodb_table.relay.arn]
  }
  statement {
    sid       = "Logs"
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["${aws_cloudwatch_log_group.relay.arn}:*"]
  }
}

resource "aws_iam_role_policy" "relay" {
  name   = local.name
  role   = aws_iam_role.relay.id
  policy = data.aws_iam_policy_document.relay.json
}

data "archive_file" "relay" {
  type        = "zip"
  source_dir  = "${path.module}/lambda"
  output_path = "${path.module}/.build/relay.zip"
  excludes    = ["handler.test.mjs"]
}

resource "aws_lambda_function" "relay" {
  function_name    = local.name
  role             = aws_iam_role.relay.arn
  runtime          = "nodejs24.x"
  architectures    = ["arm64"]
  handler          = "index.handler"
  filename         = data.archive_file.relay.output_path
  source_code_hash = data.archive_file.relay.output_base64sha256
  memory_size      = 128
  timeout          = 10

  environment {
    variables = {
      ALLOWED_ORIGIN = var.allowed_origin
      TO_ADDRESS     = var.to_address
      FROM_ADDRESS   = var.from_address
      TABLE_NAME     = aws_dynamodb_table.relay.name
      RATE_LIMIT     = tostring(var.rate_limit_per_hour)
      DAILY_CAP      = tostring(var.daily_cap)
      POW_BITS       = tostring(var.pow_bits)
      IP_SALT        = random_password.ip_salt.result
    }
  }

  logging_config {
    log_format = "Text"
    log_group  = aws_cloudwatch_log_group.relay.name
  }

  depends_on = [aws_iam_role_policy.relay]
}

# Public HTTPS endpoint. Browsers get CORS for the site only; the handler checks the Origin again.
resource "aws_lambda_function_url" "relay" {
  function_name      = aws_lambda_function.relay.function_name
  authorization_type = "NONE"

  cors {
    allow_origins = [var.allowed_origin]
    allow_methods = ["POST"]
    allow_headers = ["content-type"]
    max_age       = 86400
  }
}

# A public function URL needs both statements: one for the URL, one for the invocation it makes.
resource "aws_lambda_permission" "url" {
  statement_id           = "PublicFunctionUrl"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.relay.function_name
  principal              = "*"
  function_url_auth_type = "NONE"
}

resource "aws_lambda_permission" "invoke_via_url" {
  statement_id             = "InvokeViaFunctionUrl"
  action                   = "lambda:InvokeFunction"
  function_name            = aws_lambda_function.relay.function_name
  principal                = "*"
  invoked_via_function_url = true
}

# Cost guardrail for the whole account.
resource "aws_budgets_budget" "account" {
  name         = "cloudgeist-monthly"
  budget_type  = "COST"
  limit_amount = tostring(var.budget_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.alert_email]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.alert_email]
  }
}
