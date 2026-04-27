# How to Use Module Version Constraints in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, Module

Description: Learn how to use version constraints in OpenTofu module sources to control which module versions are used and ensure reproducible deployments.

## Introduction

Module version constraints allow you to specify which versions of a module are acceptable for your configuration. Version constraints ensure reproducible deployments, prevent unexpected breaking changes, and enable controlled upgrades. They are available for registry sources and Git sources (via `?ref=`).

## Version Constraint Syntax

### Registry Source Versions

```hcl
module "vpc" {
  source  = "registry.opentofu.org/terraform-aws-modules/vpc/aws"
  version = "~> 5.0"
}
```

### Constraint Operators

| Operator | Meaning | Example |
|----------|---------|---------|
| `= 1.2.0` | Exact version | `version = "= 1.2.0"` |
| `!= 1.3.0` | Not this version | `version = "!= 1.3.0"` |
| `> 1.2.0` | Greater than | `version = "> 1.2.0"` |
| `>= 1.2.0` | At least | `version = ">= 1.2.0"` |
| `< 2.0.0` | Less than | `version = "< 2.0.0"` |
| `<= 1.9.0` | At most | `version = "<= 1.9.0"` |
| `~> 1.2` | Allows >= 1.2, < 2.0 | `version = "~> 1.2"` |
| `~> 1.2.0` | Allows >= 1.2.0, < 1.3.0 | `version = "~> 1.2.0"` |

## Practical Examples

### Pessimistic Constraint (Most Common)

```hcl
module "vpc" {
  source  = "registry.opentofu.org/terraform-aws-modules/vpc/aws"
  # Allow any 5.x.y version but not 6.x
  version = "~> 5.0"

  name = "my-vpc"
  cidr = "10.0.0.0/16"
  azs  = ["us-east-1a", "us-east-1b", "us-east-1c"]
}
```

### Exact Version Pin

```hcl
module "security_groups" {
  source  = "registry.opentofu.org/terraform-aws-modules/security-group/aws"
  # Pin exactly for maximum reproducibility
  version = "= 4.17.2"

  name   = "app-sg"
  vpc_id = module.vpc.vpc_id
}
```

### Range Constraint

```hcl
module "rds" {
  source  = "registry.opentofu.org/terraform-aws-modules/rds/aws"
  # Accept 6.1.0 or newer, but not 7.0+
  version = ">= 6.1.0, < 7.0.0"

  identifier = "app-db"
  engine     = "postgres"
}
```

### Multiple Constraints

```hcl
module "lambda" {
  source  = "registry.opentofu.org/terraform-aws-modules/lambda/aws"
  version = ">= 4.0, < 6.0, != 5.0.0"  # Exclude a known bad version
}
```

## Git Source Version Control

For Git sources, use tags as versions:

```hcl
# Tag-based pinning (recommended)

module "internal_vpc" {
  source = "github.com/myorg/terraform-modules//vpc?ref=v2.1.0"
  # No "version" attribute - use ?ref= instead
}

# Specific commit (maximum reproducibility)
module "critical_module" {
  source = "github.com/myorg/terraform-modules//vpc?ref=a1b2c3d4e5f6789"
}
```

## Step-by-Step Usage

1. Start with a loose constraint like `~> 5.0`.
2. After testing, consider tightening to `= 5.1.2` for production.
3. Run `tofu init -upgrade` to update to the latest allowed version.
4. Review the lock file changes.

```bash
# Initialize with version constraints
tofu init

# Upgrade to latest version within constraints
tofu init -upgrade

# Review lock file
cat .terraform.lock.hcl
```

## Lock File for Modules

The `.terraform.lock.hcl` file records exact module versions:

```hcl
# .terraform.lock.hcl
provider "registry.opentofu.org/hashicorp/aws" {
  version = "5.31.0"
  # ...
}
```

Note: Module versions are not currently recorded in the lock file (only providers are). Always use explicit version constraints for reproducibility.

## Best Practices

1. **Production**: Use exact versions or tight pessimistic constraints (`~> 5.1.2`)
2. **Development**: Use looser constraints (`~> 5.0`)
3. **Never use `latest`**: Always pin to a specific version
4. **Test upgrades**: Review changelog before updating version constraints

## Conclusion

Module version constraints ensure your infrastructure deployments are reproducible and protected from unexpected breaking changes. Use pessimistic constraints (`~> x.y`) for development and exact pins (`= x.y.z`) for production. For Git-based modules, always use tagged releases rather than branch names.
