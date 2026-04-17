# How to Use Write-Only Attributes Introduced in OpenTofu 1.11

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Write-Only Attributes, OpenTofu 1.11, Security, Infrastructure as Code

Description: Learn how to use write-only attributes introduced in OpenTofu 1.11 to pass sensitive values to resources without storing them in state.

## Introduction

OpenTofu 1.11 introduced write-only attributes for resource schemas. A write-only attribute is sent to the provider during create and update operations but is never read back or stored in state. This is the correct pattern for passwords, API keys, and other secrets that you set on a resource but never need to retrieve.

## What Are Write-Only Attributes

Write-only attributes flow in one direction - into the provider - and are never written to the state file.

```hcl
Normal attribute lifecycle:
  tofu apply → provider creates resource → attribute stored in state ← tofu plan reads

Write-only attribute lifecycle:
  tofu apply → attribute sent to provider → NOT stored in state
               (never read back, never in state file)
```

## Using a Write-Only Attribute

Provider schemas mark certain attributes as write-only. Use them like any other attribute.

```hcl
resource "aws_db_instance" "main" {
  identifier        = "myapp-prod"
  engine            = "postgres"
  engine_version    = "15.4"
  instance_class    = "db.t3.medium"
  allocated_storage = 20

  db_name  = "myapp"
  username = "admin"

  # password_wo is a write-only attribute in supported provider versions
  # It is sent to AWS but never stored in the state file
  password_wo         = var.db_password
  password_wo_version = var.db_password_version  # increment to trigger rotation
}
```

## Write-Only vs Sensitive Attributes

Sensitive attributes are still stored in state (in plaintext by default, just masked in CLI output); write-only attributes are not stored at all.

```hcl
# Sensitive attribute - stored in state, masked in output

resource "aws_db_instance" "with_sensitive" {
  password = var.db_password  # stored in state as sensitive
}

# Write-only attribute - NOT stored in state at all
resource "aws_db_instance" "with_write_only" {
  password_wo         = var.db_password  # never in state
  password_wo_version = 1
}
```

## Triggering Password Rotation

Use a version attribute to force re-application of the write-only value.

```hcl
variable "db_password_version" {
  type        = number
  description = "Increment this value to rotate the database password"
  default     = 1
}

resource "aws_db_instance" "main" {
  identifier = "myapp-prod"
  # Other config...

  password_wo         = var.db_password
  password_wo_version = var.db_password_version
}
```

```bash
# To rotate the password, update the variable and apply
# In terraform.tfvars:
# db_password_version = 2

tofu apply -var="db_password_version=2"
```

## Combining Write-Only with Ephemeral Resources

Fetch the password ephemerally and pass it as a write-only attribute.

```hcl
ephemeral "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "prod/myapp/db-password"
}

resource "aws_db_instance" "main" {
  identifier = "myapp-prod"
  engine     = "postgres"

  username            = "admin"
  password_wo         = ephemeral.aws_secretsmanager_secret_version.db_password.secret_string
  password_wo_version = var.db_password_version
}
```

## Write-Only in Custom Provider Development

Provider developers can mark attributes as write-only in the Plugin Framework.

```go
// In a provider schema definition (Go)
"password": schema.StringAttribute{
    Required:  true,
    WriteOnly: true,  // attribute is write-only
    Sensitive: true,
},
```

## Summary

Write-only attributes in OpenTofu 1.11 give providers a way to accept sensitive input values that should never be stored anywhere. For users, this means database passwords, API secrets, and encryption keys can be set on resources without leaving traces in state files. Use write-only attributes together with a version counter for clean secret rotation workflows, and combine them with ephemeral resources to ensure secrets never touch persistent storage at any point.
