output "function_url" {
  description = "Set this as params.contactEndpoint in hugo.toml."
  value       = aws_lambda_function_url.relay.function_url
}

output "dkim_records" {
  description = "CNAME records to add at the DNS host (Namecheap: host is the part before the domain)."
  value = [for t in aws_sesv2_email_identity.domain.dkim_signing_attributes[0].tokens : {
    type  = "CNAME"
    name  = "${t}._domainkey.${var.domain}"
    host  = "${t}._domainkey"
    value = "${t}.dkim.amazonses.com"
  }]
}

output "account_id" {
  value = data.aws_caller_identity.current.account_id
}
