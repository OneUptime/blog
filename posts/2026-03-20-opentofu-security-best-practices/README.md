# How to Explain OpenTofu Security Best Practices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Security, Best Practice, Secrets Management, Infrastructure as Code

Description: Learn the essential security best practices for OpenTofu including secrets management, state security, provider authentication, and least privilege configuration.

## Introduction

Security in OpenTofu spans multiple layers: how credentials are managed, how state is stored and encrypted, what gets logged in CI/CD, and how the configuration itself is written. Following these practices reduces the attack surface of your infrastructure automation.

## 1. Never Store Credentials in Configuration Files

Use environment variables or cloud-native authentication instead.

```hcl
# BAD: Static credentials in configuration

provider "aws" {
  access_key = "AKIAIOSFODNN7EXAMPLE"  # never do this
  secret_key = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
}

# GOOD: Use IAM roles or environment variables
provider "aws" {
  region = "us-east-1"
  # Credentials from: environment, instance profile, EKS pod role
}
```

## 2. Mark Sensitive Variables

Mark variables containing secrets as sensitive to prevent them from appearing in plan output and logs.

```hcl
variable "db_password" {
  type        = string
  description = "Database master password"
  sensitive   = true  # prevents value from appearing in CLI output
}

output "connection_string" {
  value     = "postgresql://user:${var.db_password}@${aws_db_instance.main.endpoint}/db"
  sensitive = true  # prevents sensitive data in output
}
```

## 3. Encrypt State at Rest

Enable encryption for all remote backends.

```hcl
terraform {
  backend "s3" {
    bucket       = "my-tofu-state"
    key          = "prod/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true  # required
    kms_key_id   = "arn:aws:kms:us-east-1:123456789012:key/my-key-id"
  }
}
```

## 4. Use State Encryption for Sensitive Data (OpenTofu 1.7+)

Encrypt the state file itself with OpenTofu's built-in state encryption.

```hcl
terraform {
  encryption {
    key_provider "pbkdf2" "my_passphrase" {
      passphrase = var.state_encryption_passphrase
    }

    method "aes_gcm" "default" {
      keys = key_provider.pbkdf2.my_passphrase
    }

    state {
      method = method.aes_gcm.default
    }
  }
}
```

## 5. Use Ephemeral Resources for Secrets

Never store secrets in state - use ephemeral resources.

```hcl
# BAD: Secret stored in state as a data source
data "aws_secretsmanager_secret_version" "db_pass" {
  secret_id = "prod/db/password"
}

# GOOD: Ephemeral resource - never stored in state
ephemeral "aws_secretsmanager_secret_version" "db_pass" {
  secret_id = "prod/db/password"
}
```

## 6. Apply Least Privilege to CI/CD IAM Roles

The IAM role used by OpenTofu in CI/CD should have only the permissions needed.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::my-tofu-state",
        "arn:aws:s3:::my-tofu-state/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "ec2:Describe*",
        "ec2:CreateVpc",
        "ec2:DeleteVpc"
      ],
      "Resource": "*"
    }
  ]
}
```

## 7. Enable Required Approval Before Apply

Never run `tofu apply` automatically on every push to the main branch.

```yaml
# GitHub Actions: require manual approval for apply
jobs:
  apply:
    environment: production  # environments have required reviewers
    steps:
      - run: tofu apply plan.tfplan
```

## 8. Pin Provider and Module Versions

Pinning prevents supply chain attacks from unexpected version updates.

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "= 5.50.0"  # exact pin for production
    }
  }
}
```

## Summary

OpenTofu security requires attention to credentials (use IAM roles, never static keys), state (encrypt at rest, use state encryption for sensitive values), secrets (use ephemeral resources, mark variables as sensitive), access control (least privilege CI/CD roles, approval gates for apply), and supply chain (pin provider and module versions, commit the lock file). Each of these layers independently reduces risk; together they provide defense in depth for your infrastructure automation.
