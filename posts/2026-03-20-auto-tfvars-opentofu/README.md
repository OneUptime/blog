# How to Use .auto.tfvars for Automatic Variable Loading in OpenTofu - Opentofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Variable, Auto.tfvars, Infrastructure as Code, DevOps

Description: A guide to using .auto.tfvars files for automatic variable loading in OpenTofu without explicit -var-file flags.

## Introduction

Files with the `.auto.tfvars` suffix are automatically loaded by OpenTofu without requiring the `-var-file` flag. This is useful for providing default or environment-specific values that should always be included when running from a specific directory.

## How .auto.tfvars Works

```bash
# Files automatically loaded:

# 1. terraform.tfvars
# 2. terraform.tfvars.json
# 3. *.auto.tfvars and *.auto.tfvars.json (in lexical filename order)

# All of these are loaded automatically:
ls *.tfvars
# terraform.tfvars       <- auto-loaded
# common.auto.tfvars     <- auto-loaded
# networking.auto.tfvars <- auto-loaded (loaded after common.auto.tfvars)
```

## Creating .auto.tfvars Files

```hcl
# common.auto.tfvars - Common variables auto-loaded
aws_region = "us-east-1"
project_name = "myapp"

tags = {
  ManagedBy = "OpenTofu"
  Project   = "myapp"
}
```

```hcl
# networking.auto.tfvars - Network variables auto-loaded
vpc_cidr = "10.0.0.0/16"
public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnet_cidrs = ["10.0.11.0/24", "10.0.12.0/24"]

availability_zones = ["us-east-1a", "us-east-1b"]
```

```hcl
# compute.auto.tfvars - Compute variables auto-loaded
instance_type  = "t3.micro"
instance_count = 2
enable_monitoring = true
```

## Alphabetical Loading Order

Since `.auto.tfvars` and `.auto.tfvars.json` files are loaded in lexical filename order, you can control overriding:

```hcl
# 01-base.auto.tfvars - Loaded first (base values)
instance_type = "t3.micro"
instance_count = 1
environment = "dev"
```

```hcl
# 02-environment.auto.tfvars - Loaded second (overrides base)
environment = "staging"
instance_count = 2
# instance_type remains t3.micro from base
```

## Environment-Specific Auto-loading

Structure per-environment directories:

```text
environments/
├── dev/
│   ├── main.tf          # Symlink or copy of root main.tf
│   └── env.auto.tfvars  # Dev-specific values (auto-loaded)
├── staging/
│   ├── main.tf
│   └── env.auto.tfvars  # Staging-specific values
└── prod/
    ├── main.tf
    └── env.auto.tfvars  # Prod-specific values
```

```hcl
# environments/dev/env.auto.tfvars
environment   = "dev"
instance_type = "t3.micro"
multi_az      = false
db_class      = "db.t3.micro"
```

```hcl
# environments/prod/env.auto.tfvars
environment   = "prod"
instance_type = "t3.large"
multi_az      = true
db_class      = "db.r5.large"
```

```bash
# Working in each environment:
cd environments/dev
tofu plan  # Automatically uses dev/env.auto.tfvars

cd environments/prod
tofu plan  # Automatically uses prod/env.auto.tfvars
```

## Combining auto.tfvars with -var-file

```bash
# auto.tfvars files load automatically, then command-line options can override them
tofu plan -var-file="overrides.tfvars"
# Overall precedence (later values win):
# 1. Environment variables
# 2. terraform.tfvars (if exists)
# 3. terraform.tfvars.json (if exists)
# 4. *.auto.tfvars and *.auto.tfvars.json (lexical order)
# 5. -var and -var-file options, in the order provided

# Override auto.tfvars values:
tofu apply -var="instance_count=10"
```

## When to Use .auto.tfvars

```text
Use .auto.tfvars for:
- Common variables shared across all plans in a directory
- Per-environment directories where all plans need the same variables
- Values that should always be included without explicit flags

Use terraform.tfvars for:
- Project-level defaults
- Development convenience values

Use -var-file for:
- Explicit, auditable variable loading in CI/CD
- Variables that should be optionally included
- Secrets and sensitive files
```

## Conclusion

`.auto.tfvars` files provide a clean way to organize variables by concern (networking, compute, security) or by loading priority using numeric prefixes. Combined with directory-based environment separation, they enable a clear and maintainable pattern for multi-environment infrastructure management without requiring explicit `-var-file` flags in everyday commands.
