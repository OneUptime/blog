# How to Migrate Terraform Modules to OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Module, Migration, Infrastructure as Code

Description: Learn how to migrate existing Terraform modules to OpenTofu - updating module sources, handling registry differences, and validating compatibility with OpenTofu-specific features.

## Introduction

Terraform modules are fully compatible with OpenTofu - the HCL syntax is identical, and OpenTofu reads the same module format. Migration involves updating module source references to use the OpenTofu registry when applicable, and optionally adopting OpenTofu-specific enhancements like write-only attributes and native state encryption.

## Step 1: Verify Compatibility

Most Terraform modules work without changes:

```bash
# Clone an existing Terraform module repo

git clone https://github.com/my-org/terraform-aws-vpc.git

cd terraform-aws-vpc/

# Test with OpenTofu
tofu init
tofu validate

# If validate passes, the module is compatible
```

## Step 2: Update Module Source References

### Registry Modules

Terraform registry modules continue to work - OpenTofu mirrors the registry:

```hcl
# This works unchanged in OpenTofu
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "prod-vpc"
  cidr = "10.0.0.0/16"
  # ...
}
```

### Git-Based Modules

Git-based modules work unchanged:

```hcl
module "security_baseline" {
  source = "git::https://github.com/my-org/terraform-aws-security-baseline.git?ref=v2.1.0"
  # ... no changes needed
}
```

### Local Modules

Local modules work unchanged:

```hcl
module "networking" {
  source = "../modules/networking"
  # ... no changes needed
}
```

## Step 3: Handle Deprecated Syntax

OpenTofu follows Terraform's deprecation schedule and also introduces its own. Fix these common patterns:

```hcl
# DEPRECATED: Old-style interpolation (string-only)
name = "${var.environment}"   # Unnecessary interpolation

# PREFERRED: Direct reference
name = var.environment

# DEPRECATED: Interpolation inside list literals
subnets = ["${aws_subnet.a.id}", "${aws_subnet.b.id}"]

# PREFERRED: Direct list
subnets = [aws_subnet.a.id, aws_subnet.b.id]

# DEPRECATED: template_file data source
data "template_file" "user_data" {
  template = file("user-data.sh.tpl")
  vars     = { env = var.environment }
}

# PREFERRED: templatefile() function
user_data = templatefile("user-data.sh.tpl", { env = var.environment })
```

## Step 4: Adopt OpenTofu-Specific Features (Optional)

Newer OpenTofu features worth considering after migration:

```hcl
# OpenTofu 1.9+: Provider iteration (not available in Terraform)
provider "aws" {
  for_each = toset(["us-east-1", "eu-west-1"])
  alias    = each.key
  region   = each.key
}

# OpenTofu 1.11+: Write-only attributes (values never stored in state)
# The provider exposes a *_wo attribute (e.g. password_wo) with a paired
# *_wo_version field used to trigger updates.
resource "aws_db_instance" "postgres" {
  identifier     = "prod-postgres"
  engine         = "postgres"
  instance_class = "db.t3.medium"
  username       = "admin"

  password_wo         = var.db_password
  password_wo_version = 1
}
```

## Step 5: Update Module Tests

If your modules use Terratest, update the binary:

```go
// Before
opts := &terraform.Options{
    TerraformDir: "../examples/complete",
}

// After: specify tofu binary
opts := &terraform.Options{
    TerraformDir:    "../examples/complete",
    TerraformBinary: "tofu",   // Use tofu instead of terraform
}
```

## Step 6: Update Module README

```markdown
## Requirements

| Name | Version |
|------|---------|
| opentofu | >= 1.8 |
| aws | >= 5.0 |

## Usage

\```hcl
module "vpc" {
  source  = "my-org/vpc/aws"
  version = "~> 2.0"
  # ...
}
\```
```

## Migration Checklist

```hcl
[ ] Run tofu validate on all module directories
[ ] Update .terraform.lock.hcl (delete and re-run tofu init)
[ ] Replace deprecated interpolation syntax
[ ] Replace template_file with templatefile() function
[ ] Update Terratest to use TerraformBinary: "tofu"
[ ] Update module README requirements table
[ ] Rename CI workflow files (terraform.yml → opentofu.yml)
[ ] Update repository description/topics on GitHub
[ ] Tag a new semver release for module consumers
```

## Conclusion

Migrating Terraform modules to OpenTofu is low-risk - the HCL syntax and module interface are identical. The main steps are: validate with `tofu validate`, regenerate the lock file, fix deprecated syntax, and update test tooling. Optionally adopt OpenTofu-exclusive features like provider iteration and write-only attributes when ready. Tag a new module version to signal OpenTofu compatibility to consumers.
