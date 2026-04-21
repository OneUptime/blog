# How to Use .tfvars Files to Set Variables in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Variable, tfvars, Infrastructure as Code, DevOps

Description: A guide to using .tfvars files for managing OpenTofu variable values across different environments.

## Introduction

`.tfvars` files provide a convenient way to set variable values outside of your main configuration files. They support different values per environment and separate configuration from code. This guide covers creating, using, and organizing `.tfvars` files.

## Basic .tfvars File

```hcl
# terraform.tfvars - Automatically loaded by OpenTofu

environment    = "dev"
aws_region     = "us-east-1"
instance_count = 2
instance_type  = "t3.micro"

# List values

availability_zones = ["us-east-1a", "us-east-1b"]

# Map values
tags = {
  Project   = "myapp"
  ManagedBy = "OpenTofu"
}
```

## Environment-Specific .tfvars Files

```hcl
# dev.tfvars
environment    = "dev"
instance_count = 1
instance_type  = "t3.micro"
multi_az       = false

db_instance_class = "db.t3.micro"
db_storage_gb    = 20
enable_deletion_protection = false
```

```hcl
# staging.tfvars
environment    = "staging"
instance_count = 2
instance_type  = "t3.small"
multi_az       = true

db_instance_class = "db.t3.small"
db_storage_gb    = 50
enable_deletion_protection = false
```

```hcl
# prod.tfvars
environment    = "prod"
instance_count = 4
instance_type  = "t3.large"
multi_az       = true

db_instance_class = "db.r5.large"
db_storage_gb    = 500
enable_deletion_protection = true
```

## Using -var-file Flag

```bash
# Apply with specific tfvars file
tofu plan -var-file="dev.tfvars"
tofu apply -var-file="staging.tfvars"
tofu apply -var-file="prod.tfvars" -auto-approve

# Multiple var files (later files take precedence)
tofu apply \
  -var-file="base.tfvars" \
  -var-file="prod.tfvars" \
  -var-file="us-east-1.tfvars"

# Mix of file and direct variables
tofu apply \
  -var-file="prod.tfvars" \
  -var="instance_count=10"  # Overrides prod.tfvars
```

## tfvars for Complex Types

```hcl
# complex.tfvars

# Object variable
server_config = {
  instance_type   = "t3.small"
  disk_size_gb    = 40
  monitoring      = true
  availability_zone = "us-east-1a"
}

# List of objects
firewall_rules = [
  {
    name        = "http"
    port        = 80
    protocol    = "tcp"
    cidr        = "0.0.0.0/0"
  },
  {
    name        = "https"
    port        = 443
    protocol    = "tcp"
    cidr        = "0.0.0.0/0"
  }
]

# Map of strings
ami_ids = {
  "us-east-1" = "ami-0c55b159cbfafe1f0"
  "us-west-2" = "ami-08d489468314a58df"
}
```

## Sensitive Values in .tfvars

```hcl
# secrets.tfvars - NEVER commit this file!
database_password = "super-secret-password"
api_key           = "sk-xxxxxxxxxxxxxxxxxxxx"
ssl_certificate   = <<-EOT
  -----BEGIN CERTIFICATE-----
  ...
  -----END CERTIFICATE-----
EOT
```

```gitignore
# .gitignore - Exclude sensitive tfvars files
# Exclude all (add exceptions for safe ones)
*.tfvars
# Keep example files
!example.tfvars
# Keep dev if non-sensitive
!dev.tfvars
# Always exclude secrets
secrets.tfvars
# Exclude prod values
prod.tfvars
```

## terraform.tfvars Auto-loading

```bash
# terraform.tfvars, terraform.tfvars.json, and *.auto.tfvars/*.auto.tfvars.json
# are loaded automatically
# No -var-file flag needed

# Just run:
tofu plan   # automatically loads terraform.tfvars and auto tfvars files

# For non-auto-loaded named files, explicit flag required:
tofu plan -var-file="prod.tfvars"
```

## Conclusion

`.tfvars` files cleanly separate variable values from configuration logic. Using environment-specific tfvars files (`dev.tfvars`, `prod.tfvars`) makes managing multiple environments straightforward. Always exclude sensitive files from version control and use secret management systems for production credentials. The `terraform.tfvars` auto-loading is convenient for development but use explicit `-var-file` flags in production pipelines for clarity.
