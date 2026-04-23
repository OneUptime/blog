# How to Handle Resources with External Dependencies in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, External Dependencies, Data Source, Infrastructure as Code, Best Practice

Description: Learn how to handle resources that depend on external systems, pre-existing infrastructure, and third-party services using data sources and preconditions in OpenTofu.

## Introduction

Not all dependencies live in the same OpenTofu configuration. Some resources depend on infrastructure managed by other teams, external SaaS services, or manual prerequisites. OpenTofu provides data sources, `precondition` blocks, and `external` data sources to handle these gracefully.

## Data Sources for Existing Resources

```hcl
# Reference a VPC created by another team

data "aws_vpc" "shared" {
  tags = {
    Name        = "shared-vpc"
    Environment = var.environment
  }
}

# Reference subnets in the shared VPC
data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.shared.id]
  }

  tags = {
    Tier = "private"
  }
}

# Use the discovered subnets
resource "aws_db_subnet_group" "main" {
  name       = "${var.app_name}-db-subnets"
  subnet_ids = data.aws_subnets.private.ids
}
```

## Preconditions for External Validation

```hcl
data "aws_caller_identity" "current" {}

data "aws_route53_zone" "main" {
  name         = var.domain
  private_zone = false
}

resource "aws_s3_bucket" "data" {
  bucket = "${var.app_name}-data-${data.aws_caller_identity.current.account_id}"

  lifecycle {
    precondition {
      # Ensure we're deploying to the expected AWS account
      condition     = data.aws_caller_identity.current.account_id == var.expected_account_id
      error_message = "Deploying to wrong AWS account. Expected ${var.expected_account_id}, got ${data.aws_caller_identity.current.account_id}."
    }

    precondition {
      # Ensure the required external DNS zone exists
      condition     = data.aws_route53_zone.main.zone_id != ""
      error_message = "Required Route53 zone ${var.domain} not found. Create it first."
    }
  }
}
```

## External Data Source for Third-Party APIs

```hcl
data "external" "vault_secret" {
  program = ["python3", "${path.module}/scripts/get_vault_secret.py"]

  query = {
    secret_path = "secret/data/${var.app_name}/db-password"
    vault_addr  = var.vault_addr
  }
}

resource "aws_db_instance" "main" {
  password = data.external.vault_secret.result["password"]
  # ... other config ...
}
```

The external script:

```python
#!/usr/bin/env python3
# scripts/get_vault_secret.py
import json
import sys
import hvac

query = json.loads(sys.stdin.read())
client = hvac.Client(url=query["vault_addr"])

secret = client.secrets.kv.v2.read_secret_version(
    path=query["secret_path"].replace("secret/data/", ""),
    mount_point="secret"
)

print(json.dumps({"password": secret["data"]["data"]["password"]}))
```

## Handling Optional External Resources

```hcl
variable "existing_certificate_arn" {
  type        = string
  description = "ARN of existing ACM certificate. If empty, a new one is created."
  default     = ""
}

# Create certificate only if one was not provided
resource "aws_acm_certificate" "new" {
  count             = var.existing_certificate_arn == "" ? 1 : 0
  domain_name       = var.domain_name
  validation_method = "DNS"
}

locals {
  # Use provided cert or newly created one
  certificate_arn = var.existing_certificate_arn != "" ? var.existing_certificate_arn : aws_acm_certificate.new[0].arn
}
```

## Waiting for External Resources

```hcl
resource "terraform_data" "wait_for_external_api" {
  triggers_replace = [
    var.external_api_url
  ]

  provisioner "local-exec" {
    command = <<-SCRIPT
      # Wait until an external API is reachable before deploying
      until curl -sf "${var.external_api_url}/health"; do
        echo "Waiting for external API..."
        sleep 10
      done
      echo "External API is available"
    SCRIPT
  }
}

resource "aws_lambda_function" "webhook" {
  depends_on = [terraform_data.wait_for_external_api]
  # ...
}
```

## Summary

External dependencies in OpenTofu are managed through data sources for existing resources, preconditions for validation, external data sources for third-party APIs, and conditional resource creation for optional dependencies. These patterns make your configurations robust against missing or changing external prerequisites.
