# Contact relay

Lets visitors send the audit draft from cloudgeist.cloud without leaving the page. The site posts the message to a Lambda function URL in `eu-central-1`. The Lambda checks it and emails it to the owner through SES, with the visitor as reply-to. Messages stay in the EU and are not stored; DynamoDB keeps only hashed rate-limit counters and send IDs, which expire on their own.

```
browser ──POST──▶ Lambda function URL (CORS: cloudgeist.cloud) ──▶ SES ──▶ botond@cloudgeist.cloud
                         │
                         └──▶ DynamoDB: hourly count per network, daily count for the site, send-ID claims (all expire via TTL)
```

## Protection
The Origin check and CORS only stop browsers on other sites; a script can fake the Origin header. What actually limits scripted spam:
- **Proof of work:** the browser finds a nonce so that SHA-256(`key:ts:nonce`) starts with 18 zero bits (`assets/js/lib/pow.js`, about 0.3 s on a laptop and around a second on a phone). The Lambda checks it before any database write. A solution is bound to its send ID and is valid for 15 minutes.
- **Daily cap:** at most 20 messages a day for the whole site (UTC), however many networks they come from. This bounds worst-case inbox spam.
- **Per network:** 5 messages an hour per hashed source IP.
- **Bots:** a hidden trap field and a minimum of 3 s between page load and send. Both get a fake success so bots learn nothing.
- **Duplicates:** each draft carries a UUID. A retry gets "already sent" instead of a second email, and retries count against neither limit. A claim stuck in "pending" for over 60 s can be retried.
- **Cost:** the SES sandbox quota (200 emails a day) and a $5 monthly account budget with email alerts. The account's Lambda concurrency limit (10) is too low to reserve concurrency for the function.
- **Failures:** SES errors free the claim and return 502; store errors return 503. The site then shows the error and keeps the copy and mail-app fallback.

Keep `pow_bits` (Terraform) and `params.contactPowBits` (hugo.toml) equal.

## One-time bootstrap
The Terraform state bucket has to exist before `terraform init`:

```sh
export AWS_PROFILE=cloudgeist
B=cloudgeist-tfstate-671863377671
aws s3api create-bucket --bucket $B --region eu-central-1 --create-bucket-configuration LocationConstraint=eu-central-1
aws s3api put-bucket-versioning --bucket $B --versioning-configuration Status=Enabled
aws s3api put-public-access-block --bucket $B --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
aws s3api put-bucket-tagging --bucket $B --tagging 'TagSet=[{Key=project,Value=cloudgeist},{Key=component,Value=tfstate}]'
```

## Deploy
```sh
aws sso login --sso-session cloudgeist
export AWS_PROFILE=cloudgeist
node --test lambda/          # contract tests
terraform init
terraform plan -out tfplan
terraform apply tfplan
terraform output dkim_records
terraform output function_url
```

1. Add the three `dkim_records` as CNAME records at Namecheap (Advanced DNS; host = the `host` value, target = the `value`). The existing Proton Mail records stay as they are. Wait until `aws sesv2 get-email-identity --email-identity cloudgeist.cloud --query DkimAttributes.Status` says `SUCCESS`.
2. Put `function_url` into `params.contactEndpoint` in `hugo.toml` and push. The Send button appears only when that value is set.

## Operating
- Logs: `aws logs tail /aws/lambda/cloudgeist-contact --follow`. Each line is one outcome (`sent`, `dropped`, `rate-limited`, `ses-error`, `store-error`), without message content.
- SES stays in sandbox mode; that is enough because it only ever mails the verified domain.
- Remove everything: set `contactEndpoint = ""` and push, then `terraform destroy`.
