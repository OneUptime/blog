# How to Use .tfvars Files to Set Variables in OpenTofu - Set Variables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Variable, tfvars, Configuration Files, Infrastructure as Code, DevOps

Description: Learn how to use .tfvars files to organize and pass variable values to OpenTofu configurations, keeping values separate from variable declarations.

---

`.tfvars` files separate variable values from variable declarations, making your configuration reusable across environments. You define variables once in `.tf` files and provide values in `.tfvars` files - one per environment, team, or use case.

---

## Creating a .tfvars File

```hcl
# terraform.tfvars - values for your variables (NOT definitions)

# This file is automatically loaded by OpenTofu

region         = "us-east-1"
instance_count = 2
environment    = "development"
instance_type  = "t3.micro"

tags = {
  Environment = "development"
  Team        = "platform"
  ManagedBy   = "opentofu"
}

allowed_ports = [80, 443]
```

---

## Variable Definition vs Value File

```hcl
# variables.tf - WHERE variables are DEFINED (structure only)
variable "region" {
  type        = string
  description = "AWS region"
}

variable "instance_count" {
  type    = number
  default = 1
}
```

```hcl
# terraform.tfvars - WHERE values are SET
region         = "us-east-1"
instance_count = 3
```

---

## Environment-Specific tfvars Files

Create separate `.tfvars` files for each environment:

```text
infrastructure/
├── variables.tf
├── main.tf
├── terraform.tfvars        # auto-loaded (usually dev defaults)
├── staging.tfvars          # load with -var-file
└── production.tfvars       # load with -var-file
```

```hcl
# production.tfvars
region         = "us-east-1"
instance_count = 10
instance_type  = "t3.xlarge"
environment    = "production"

tags = {
  Environment = "production"
  CostCenter  = "engineering"
  Critical    = "true"
}
```

```bash
# Deploy to production
tofu plan -var-file="production.tfvars"
tofu apply -var-file="production.tfvars"
```

---

## Automatic Loading Behavior

OpenTofu automatically loads specific `.tfvars` files:

| File Name | Auto-Loaded? |
|---|---|
| `terraform.tfvars` | Yes |
| `terraform.tfvars.json` | Yes |
| `*.auto.tfvars` | Yes (all matching files) |
| `*.auto.tfvars.json` | Yes (all matching files) |
| `production.tfvars` | No - must use `-var-file` |
| `staging.tfvars` | No - must use `-var-file` |

```bash
# terraform.tfvars is loaded automatically:
tofu plan

# Use -var-file for files that are not auto-loaded:
tofu plan -var-file="production.tfvars"
```

---

## Multiple -var-file Flags

```bash
# Load multiple tfvars files - later files override earlier ones
tofu apply \
  -var-file="common.tfvars" \
  -var-file="production.tfvars" \
  -var-file="us-east-1.tfvars"

# Values in us-east-1.tfvars override those in production.tfvars
# which override those in common.tfvars
```

---

## .gitignore for Sensitive tfvars

```gitignore
# .gitignore - never commit files with real secrets
*.tfvars
*.tfvars.json

# Allow non-sensitive example files
!example.tfvars
!terraform.tfvars.example
```

---

## Summary

`.tfvars` files provide a clean separation between variable declarations (in `.tf` files) and their values (in `.tfvars` files). `terraform.tfvars` is auto-loaded; environment-specific files like `production.tfvars` require `-var-file`. Keep files with real credentials out of version control using `.gitignore`, and commit example files to document the expected structure.
