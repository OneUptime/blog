# How to Pass Variables via .auto.tfvars Files in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Variables, Configuration, Infrastructure as Code, Automation

Description: Learn how .auto.tfvars files work in Terraform, how they differ from terraform.tfvars, and how to use them for layered configuration management across environments.

---

Terraform has a feature that many people overlook: any file ending in `.auto.tfvars` or `.auto.tfvars.json` is automatically loaded when you run Terraform commands. This is similar to `terraform.tfvars` but gives you the ability to split your variable assignments across multiple files that all get picked up without any `-var-file` flags.

This post explains how `.auto.tfvars` files work, when to use them, and some practical patterns that take advantage of their auto-loading behavior.

## How .auto.tfvars Files Work

Terraform scans the working directory for files matching these patterns and loads them automatically:

1. `terraform.tfvars` (loaded first)
2. `terraform.tfvars.json` (loaded second)
3. `*.auto.tfvars` (loaded in alphabetical order)
4. `*.auto.tfvars.json` (loaded in alphabetical order)

You do not need to pass any flags. Just name your file with the `.auto.tfvars` suffix and Terraform picks it up.

```bash
# All of these are auto-loaded:
# terraform.tfvars
# network.auto.tfvars
# compute.auto.tfvars
# database.auto.tfvars

# No -var-file flags needed
terraform plan
```

## A Simple Example

Suppose you have a project with network, compute, and database resources. Instead of cramming everything into one `terraform.tfvars` file, you split them:

```hcl
# network.auto.tfvars

vpc_cidr = "10.0.0.0/16"

public_subnets = [
  "10.0.1.0/24",
  "10.0.2.0/24",
]

private_subnets = [
  "10.0.10.0/24",
  "10.0.11.0/24",
]

availability_zones = [
  "us-east-1a",
  "us-east-1b",
]
```

```hcl
# compute.auto.tfvars

instance_type  = "t3.large"
instance_count = 3
ami_id         = "ami-0c55b159cbfafe1f0"

asg_min_size     = 2
asg_max_size     = 10
asg_desired_size = 3
```

```hcl
# database.auto.tfvars

db_engine         = "postgres"
db_engine_version = "15.4"
db_instance_class = "db.r6g.large"
db_storage_gb     = 100
db_multi_az       = true
db_backup_days    = 30
```

All three files are loaded automatically. Your `terraform plan` command stays clean and simple:

```bash
terraform plan
```

## Loading Order and Precedence

The loading order matters because if the same variable is defined in multiple auto-loaded files, the last one loaded wins. The order is:

1. `terraform.tfvars`
2. `terraform.tfvars.json`
3. `*.auto.tfvars` files in lexicographic (alphabetical) order
4. `*.auto.tfvars.json` files in lexicographic order

So if you have:

```text
a-defaults.auto.tfvars    # loaded first
b-overrides.auto.tfvars   # loaded second (wins if same var)
z-final.auto.tfvars       # loaded last (wins over everything above)
```

You can use this ordering to your advantage:

```hcl
# 00-defaults.auto.tfvars
# Base defaults loaded first
instance_type = "t3.micro"
environment   = "dev"
```

```hcl
# 99-overrides.auto.tfvars
# Overrides loaded last, taking priority
instance_type = "t3.large"
```

In this case, `instance_type` ends up as `"t3.large"` because `99-overrides.auto.tfvars` is loaded after `00-defaults.auto.tfvars`.

## Practical Patterns

### Pattern 1: Layered Configuration

Use numbered prefixes to create clear layering:

```text
project/
  main.tf
  variables.tf
  outputs.tf
  00-base.auto.tfvars         # Project-wide defaults
  10-network.auto.tfvars      # Network settings
  20-compute.auto.tfvars      # Compute settings
  30-database.auto.tfvars     # Database settings
  90-environment.auto.tfvars  # Environment-specific overrides
```

```hcl
# 00-base.auto.tfvars

# Project-wide settings
project     = "web-store"
owner       = "platform-team"
cost_center = "engineering"

tags = {
  ManagedBy = "terraform"
  Project   = "web-store"
}
```

```hcl
# 90-environment.auto.tfvars

# Environment-specific values that override
# anything set in the earlier files
environment   = "production"
instance_type = "t3.xlarge"
db_multi_az   = true
```

### Pattern 2: Generated Configuration Files

In CI/CD pipelines, you can generate `.auto.tfvars` files before running Terraform. Since they are auto-loaded, you do not need to modify any commands.

```bash
#!/bin/bash
# generate-config.sh
# Called in CI/CD before terraform plan/apply

# Generate a tfvars file with build metadata
cat > build-metadata.auto.tfvars <<EOF
# Auto-generated - do not edit manually
image_tag      = "${CI_COMMIT_SHA}"
deployed_by    = "${CI_PIPELINE_USER}"
deploy_time    = "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
pipeline_id    = "${CI_PIPELINE_ID}"
EOF
```

```yaml
# .gitlab-ci.yml
deploy:
  script:
    - ./generate-config.sh
    - terraform init
    - terraform apply -auto-approve
    # build-metadata.auto.tfvars is picked up automatically
```

### Pattern 3: Shared and Local Settings

Keep shared settings committed and personal overrides gitignored:

```text
project/
  terraform.tfvars           # Shared team settings (committed)
  local.auto.tfvars          # Personal overrides (gitignored)
  .gitignore
```

```gitignore
# .gitignore
local.auto.tfvars
*.local.auto.tfvars
```

```hcl
# terraform.tfvars (committed)
environment    = "dev"
region         = "us-east-1"
instance_count = 2
```

```hcl
# local.auto.tfvars (gitignored, per-developer)
# Override for local development
instance_count = 1
instance_type  = "t3.nano"
```

Since `.auto.tfvars` files load after `terraform.tfvars`, the local overrides take effect.

### Pattern 4: Tool-Generated Configurations

External tools or scripts can drop configuration files into your Terraform directory:

```hcl
# network-discovery.auto.tfvars
# Generated by: ./scripts/discover-network.sh
# Generated at: 2026-02-23T10:30:00Z
#
# These values were discovered from the existing
# AWS infrastructure and should not be edited manually.

existing_vpc_id       = "vpc-0a1b2c3d4e5f6g7h8"
existing_subnet_ids   = ["subnet-aaa111", "subnet-bbb222"]
existing_sg_id        = "sg-0123456789abcdef0"
```

## .auto.tfvars vs terraform.tfvars

Here is when to use each:

| Feature | terraform.tfvars | .auto.tfvars |
|---------|-----------------|--------------|
| Auto-loaded | Yes | Yes |
| Multiple files | No (only one) | Yes (unlimited) |
| Loading order | First | After terraform.tfvars, alphabetical |
| Best for | Primary variable values | Splitting config, generated values, overrides |

## .auto.tfvars vs -var-file

The key difference is that `.auto.tfvars` files are always loaded, while `-var-file` is explicit:

```bash
# .auto.tfvars files load without any flags
terraform apply

# -var-file requires explicit flags
terraform apply -var-file="production.tfvars"
```

Use `.auto.tfvars` when you want values loaded every time without thinking about it. Use `-var-file` when you want to explicitly choose which configuration to use (like selecting between environments).

## JSON Format

The `.auto.tfvars.json` variant works the same way but uses JSON syntax:

```json
{
  "instance_type": "t3.large",
  "instance_count": 3,
  "availability_zones": ["us-east-1a", "us-east-1b"],
  "tags": {
    "Environment": "production",
    "Team": "platform"
  }
}
```

Save this as `settings.auto.tfvars.json` and it loads automatically. JSON is useful when generating the file programmatically since most languages have built-in JSON support.

## Common Mistakes

### Conflicting Values Across Files

If the same variable is set in multiple `.auto.tfvars` files, the last one alphabetically wins. This can lead to confusion:

```hcl
# a-settings.auto.tfvars
instance_type = "t3.micro"

# b-settings.auto.tfvars
instance_type = "t3.large"  # This wins
```

To avoid confusion, give each variable a single home. Do not repeat the same variable across multiple files unless you are intentionally layering overrides.

### Forgetting That They Always Load

Since `.auto.tfvars` files always load, leaving a test override in place can cause problems:

```hcl
# test-override.auto.tfvars
# Oops, forgot to remove this after testing
instance_count = 1  # This overrides your intended value
```

Be disciplined about cleaning up temporary `.auto.tfvars` files, or use `-var` flags for temporary overrides instead.

## Wrapping Up

The `.auto.tfvars` convention lets you split your Terraform variable values across multiple files that all load automatically. This is great for organizing large configurations, accommodating generated values, and layering overrides. The alphabetical loading order gives you predictable precedence, and the pattern works with both HCL and JSON formats.

For a complete picture of how all variable-setting methods interact, check out our post on [variable precedence in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-understand-variable-precedence-in-terraform/view).
