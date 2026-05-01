# How to Use the enabled Meta-Argument with Data Sources in OpenTofu - Opentofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Data Source, Enabled, Meta-Arguments, Infrastructure as Code, DevOps

Description: A guide to using the enabled meta-argument with data sources in OpenTofu to conditionally fetch data based on configuration variables.

## Introduction

In OpenTofu v1.11 and later, the `enabled` meta-argument works with data sources just as it does with resources, but it is configured inside a `lifecycle` block. When `enabled = false`, the data source is not queried during plan and apply operations, and the data resource evaluates to `null`. This is useful for conditionally fetching data only when certain features are active.

## Basic enabled with Data Sources

```hcl
variable "use_existing_vpc" {
  type    = bool
  default = false
}

# Only query existing VPC if we're using one

data "aws_vpc" "existing" {
  id      = var.existing_vpc_id

  lifecycle {
    enabled = var.use_existing_vpc
  }
}

# Create new VPC when not using existing
resource "aws_vpc" "new" {
  cidr_block = var.vpc_cidr

  lifecycle {
    enabled = !var.use_existing_vpc
  }
}

locals {
  vpc_id = var.use_existing_vpc ? data.aws_vpc.existing.id : aws_vpc.new.id
}
```

## Conditional Secret Fetching

```hcl
variable "use_secrets_manager" {
  type    = bool
  default = true
}

variable "db_password_direct" {
  type      = string
  default   = null
  sensitive = true
}

# Only fetch from Secrets Manager if using it
data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "myapp/db-password"

  lifecycle {
    enabled = var.use_secrets_manager
  }
}

locals {
  db_password = var.use_secrets_manager ? (
    jsondecode(data.aws_secretsmanager_secret_version.db_password.secret_string).password
  ) : var.db_password_direct
}
```

## Feature-Gated Data Sources

```hcl
variable "features" {
  type = object({
    enable_waf       = bool
    enable_guardduty = bool
    enable_sso       = bool
  })
}

# Only fetch WAF ACL if WAF feature is enabled
data "aws_wafv2_web_acl" "existing" {
  name  = "shared-web-acl"
  scope = "REGIONAL"

  lifecycle {
    enabled = var.features.enable_waf
  }
}

# Only fetch GuardDuty detector if feature is enabled
data "aws_guardduty_detector" "main" {
  lifecycle {
    enabled = var.features.enable_guardduty
  }
}

resource "aws_wafv2_web_acl_association" "app" {
  resource_arn = aws_lb.app.arn
  web_acl_arn  = data.aws_wafv2_web_acl.existing.arn

  lifecycle {
    enabled = var.features.enable_waf
  }
}
```

## Environment-Specific Data Sources

```hcl
variable "environment" {
  type = string
}

# Only look up existing ACM certificate in production
# (dev/staging use self-signed or Let's Encrypt)
data "aws_acm_certificate" "app" {
  domain   = "app.example.com"
  statuses = ["ISSUED"]

  lifecycle {
    enabled = var.environment == "prod"
  }
}

# Only query existing Route53 zone in non-local environments
data "aws_route53_zone" "main" {
  name    = "example.com"

  lifecycle {
    enabled = contains(["staging", "prod"], var.environment)
  }
}
```

## Using enabled to Avoid Errors

```hcl
variable "cluster_exists" {
  type    = bool
  default = false
}

variable "cluster_name" {
  type    = string
  default = ""
}

# Avoid querying a cluster that doesn't exist yet
data "aws_eks_cluster" "existing" {
  name    = var.cluster_name != "" ? var.cluster_name : "placeholder"

  lifecycle {
    enabled = var.cluster_exists && var.cluster_name != ""
  }
}

data "aws_eks_cluster_auth" "existing" {
  name    = var.cluster_name != "" ? var.cluster_name : "placeholder"

  lifecycle {
    enabled = var.cluster_exists && var.cluster_name != ""
  }
}
```

## Handling null Values from Disabled Data Sources

```hcl
variable "use_custom_kms_key" {
  type    = bool
  default = false
}

data "aws_kms_key" "custom" {
  key_id = var.kms_key_alias

  lifecycle {
    enabled = var.use_custom_kms_key
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "app" {
  bucket = aws_s3_bucket.app.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = var.use_custom_kms_key ? "aws:kms" : "AES256"
      kms_master_key_id = var.use_custom_kms_key ? data.aws_kms_key.custom.arn : null
    }
  }
}
```

## Multiple Conditional Data Sources

```hcl
variable "storage_backend" {
  type    = string
  default = "s3"
  # Options: "s3", "gcs", "azure"
}

data "aws_s3_bucket" "storage" {
  bucket  = var.s3_bucket_name

  lifecycle {
    enabled = var.storage_backend == "s3"
  }
}

data "google_storage_bucket" "storage" {
  name    = var.gcs_bucket_name

  lifecycle {
    enabled = var.storage_backend == "gcs"
  }
}

locals {
  storage_endpoint = (
    var.storage_backend == "s3" ? "https://${data.aws_s3_bucket.storage.bucket_regional_domain_name}" :
    var.storage_backend == "gcs" ? "https://storage.googleapis.com/${data.google_storage_bucket.storage.name}" :
    var.azure_storage_endpoint
  )
}
```

## Conclusion

The `enabled` meta-argument on data sources prevents unnecessary queries to cloud APIs when the data isn't needed. This is particularly useful for multi-environment configurations where some infrastructure only exists in certain environments, feature flags that control which external services are used, and avoiding errors when querying resources that may not exist yet. When a data source has `enabled = false`, the data resource evaluates to `null`, so use conditional expressions or `try()` when consuming its attributes.
