# OpenTofu vs Terraform: Feature Parity and Differences

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Feature Parity, Comparison, Infrastructure as Code, Migration

Description: Understand what features OpenTofu and Terraform share, where they've diverged, and what OpenTofu-exclusive features are available - helping you evaluate the migration path and capabilities.

## Introduction

OpenTofu forked from Terraform 1.5.7 in 2023 when HashiCorp changed Terraform's license from MPL 2.0 to BSL. Since the fork, both projects have continued development independently. This guide covers the current feature parity and the areas where they've diverged.

## Shared Features (Complete Parity)

Everything from Terraform ≤ 1.5.7 works identically:

```hcl
# All of these work identically in both tools

# Resources, data sources, providers

resource "aws_instance" "web" { /* ... */ }
data "aws_ami" "latest" { /* ... */ }

# Variables, locals, outputs
variable "environment" { type = string }
locals { name_prefix = "${var.environment}-${var.project}" }
output "vpc_id" { value = aws_vpc.main.id }

# Modules
module "vpc" { source = "terraform-aws-modules/vpc/aws" }

# Count and for_each
resource "aws_subnet" "private" {
  count = 3
  cidr_block = cidrsubnet("10.0.0.0/16", 8, count.index)
}

# Dynamic blocks
dynamic "ingress" {
  for_each = var.ingress_rules
  content {
    from_port = ingress.value.from_port
    to_port   = ingress.value.to_port
    protocol  = ingress.value.protocol
  }
}

# Lifecycle rules
lifecycle {
  create_before_destroy = true
  prevent_destroy       = true
  ignore_changes        = [tags]
}

# Moved blocks
moved {
  from = aws_instance.old_name
  to   = aws_instance.new_name
}

# Check blocks (assertions)
check "health" {
  data "http" "endpoint" { url = "https://example.com/health" }
  assert {
    condition     = data.http.endpoint.status_code == 200
    error_message = "Health check failed"
  }
}
```

## Notable OpenTofu Features

### 1. Provider Iteration (OpenTofu 1.9+)

```hcl
# Deploy to multiple regions without aliases
variable "aws_regions" {
  default = ["us-east-1", "eu-west-1", "ap-southeast-1"]
}

provider "aws" {
  for_each = toset(var.aws_regions)
  alias    = each.key
  region   = each.key
}

# Use all providers in a module
module "regional_vpc" {
  for_each = toset(var.aws_regions)
  source   = "./modules/vpc"
  providers = { aws = aws[each.key] }
}
```

### 2. Write-Only Attributes (OpenTofu 1.11+)

Also available in Terraform 1.11+. Providers expose write-only variants of sensitive arguments using the `_wo` suffix, paired with a `_wo_version` argument that you increment to trigger an update.

```hcl
# Passwords and secrets never stored in state
resource "aws_db_instance" "postgres" {
  identifier     = "prod-postgres"
  engine         = "postgres"
  instance_class = "db.t3.medium"

  # password_wo is write-only: written to AWS, never stored in .tfstate
  password_wo         = var.db_password
  password_wo_version = 1
}
```

### 3. Native State Encryption (OpenTofu 1.7+)

```hcl
terraform {
  encryption {
    key_provider "pbkdf2" "my_key" {
      passphrase = var.state_encryption_passphrase
    }

    method "aes_gcm" "default" {
      keys = key_provider.pbkdf2.my_key
    }

    state {
      method = method.aes_gcm.default
    }
  }
}
```

### 4. Loopable Import Blocks (OpenTofu 1.7+)

Also available in Terraform 1.7+.

```hcl
# Import multiple resources with for_each
import {
  for_each = var.existing_bucket_names
  to       = aws_s3_bucket.existing[each.key]
  id       = each.value
}
```

## Terraform-Exclusive Features (BUSL-Licensed)

These features exist in Terraform but not in OpenTofu:

| Feature | Terraform | OpenTofu |
|---------|-----------|----------|
| Stacks (preview) | Yes (BSL) | No |
| Cloud workspaces | TF Cloud only | No |
| Sentinel policies | TF Enterprise | OPA alternative |

## Version Alignment

| OpenTofu | Approx. Terraform | Key OpenTofu Additions |
|----------|-------------------|------------------------|
| 1.6.x | ~1.6.x | Fork stabilization, `tofu test` |
| 1.7.x | ~1.7.x | Native state encryption, loopable import blocks, provider-defined functions, removed blocks |
| 1.8.x | ~1.8.x | Early variable/locals evaluation, `.tofu` file extension, provider mocking in tests |
| 1.9.x | ~1.9.x | Provider iteration (`for_each` on providers), `-exclude` flag |
| 1.10.x | ~1.10.x | OCI registry support, native S3 state locking, deprecation marks, external key providers |
| 1.11.x | ~1.11.x | Write-only attributes, ephemeral resources, `enabled` meta-argument |

## State File Compatibility

```bash
# OpenTofu and Terraform state files are identical format (v4)
# You can switch between tools without state migration

# Verify format
cat terraform.tfstate | jq '.version'
# Both output: 4
```

## Conclusion

OpenTofu maintains full compatibility with Terraform ≤ 1.5.7 and has since added several notable features, including some that are OpenTofu-exclusive (provider iteration, native state encryption) and others that have parallel implementations in Terraform (loopable import blocks, write-only attributes, ephemeral resources). Terraform has continued development under BUSL with its own features like Stacks. For open-source licensing requirements or access to the OpenTofu-exclusive features, OpenTofu is the clear choice. For organizations already invested in Terraform Enterprise and Terraform Cloud, the migration decision depends on licensing preferences and which feature set better matches requirements.
