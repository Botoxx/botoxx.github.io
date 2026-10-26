variable "region" {
  description = "Region for every resource; the relay keeps messages in the EU."
  type        = string
  default     = "eu-central-1"
}

variable "domain" {
  description = "Domain verified in SES; mail is signed with its DKIM keys."
  type        = string
  default     = "cloudgeist.cloud"
}

variable "to_address" {
  description = "Where messages are delivered."
  type        = string
  default     = "botond@cloudgeist.cloud"
}

variable "from_address" {
  description = "Sender address on the verified domain. It needs no mailbox; replies go to the visitor."
  type        = string
  default     = "contact@cloudgeist.cloud"
}

variable "allowed_origin" {
  description = "The only browser origin allowed to call the function URL."
  type        = string
  default     = "https://cloudgeist.cloud"
}

variable "rate_limit_per_hour" {
  description = "Messages accepted per network (hashed source IP) per hour."
  type        = number
  default     = 5
}

variable "daily_cap" {
  description = "Messages accepted per day for the whole site (UTC), however many networks they come from."
  type        = number
  default     = 20
}

variable "pow_bits" {
  description = "Proof-of-work difficulty in leading zero bits; must match params.contactPowBits in hugo.toml."
  type        = number
  default     = 18
}

variable "budget_usd" {
  description = "Monthly cost budget for the account; alerts at 80% actual and 100% forecast."
  type        = number
  default     = 5
}

variable "alert_email" {
  description = "Receives budget alerts."
  type        = string
  default     = "botond@cloudgeist.cloud"
}
