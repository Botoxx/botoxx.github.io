terraform {
  required_version = ">= 1.10"

  required_providers {
    aws     = { source = "hashicorp/aws", version = "~> 6.70" }
    archive = { source = "hashicorp/archive", version = "~> 2.7" }
    random  = { source = "hashicorp/random", version = "~> 3.7" }
  }

  # State lives in a versioned bucket in the same account; see README.md for the one-time bootstrap.
  backend "s3" {
    bucket       = "cloudgeist-tfstate-671863377671"
    key          = "contact-relay/terraform.tfstate"
    region       = "eu-central-1"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      project    = "cloudgeist"
      component  = "contact-relay"
      managed-by = "terraform"
      repo       = "Botoxx/botoxx.github.io"
    }
  }
}
