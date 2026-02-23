# How to Use Version Constraints for Terraform Modules

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Versioning, Version Constraints, Infrastructure as Code

Description: A detailed guide to Terraform module version constraint syntax including operators, semantic versioning, constraint strategies, and best practices for production safety.

---

Terraform version constraints let you control exactly which versions of a module are acceptable for your configuration. Get this right and your infrastructure stays stable. Get it wrong and a module update can break your production deployment without warning.

This guide covers the constraint syntax in depth, explains each operator, and shows which constraint strategy works best for different situations.

## Where Version Constraints Apply

Version constraints work with the `version` argument in module blocks, but only for modules sourced from a Terraform registry (public or private):

```hcl
# Version constraints work here
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.5"  # This is a version constraint
}

# Version constraints do NOT work here (Git, S3, GCS, local, HTTP)
module "vpc" {
  source = "git::https://github.com/myorg/modules.git//vpc?ref=v5.5.0"
  # No version argument available - pin with ?ref= instead
}
```

For non-registry sources, version pinning happens through the source URL itself (Git tags, S3 object paths, etc.).

## The Constraint Operators

Terraform supports six version constraint operators. Here is what each one does.

### Exact Match (= or no operator)

```hcl
# These are equivalent - both require exactly version 5.5.1
version = "5.5.1"
version = "= 5.5.1"
```

Use this for: production environments where you want total predictability. You test with 5.5.1, you deploy with 5.5.1.

### Greater Than or Equal (>=)

```hcl
# Accept version 5.5.1 or any newer version
version = ">= 5.5.1"
```

Use this for: development environments or when you want to always get the latest. Not recommended for production because there is no upper bound.

### Less Than or Equal (<=)

```hcl
# Accept version 5.5.1 or any older version
version = "<= 5.5.1"
```

Rarely used alone, but useful in combination constraints.

### Greater Than (>)

```hcl
# Accept any version newer than 5.5.1 (not including 5.5.1 itself)
version = "> 5.5.1"
```

### Less Than (<)

```hcl
# Accept any version older than 6.0.0
version = "< 6.0.0"
```

### Not Equal (!=)

```hcl
# Accept any version except 5.5.2 (maybe it has a known bug)
version = "!= 5.5.2"
```

### Pessimistic Constraint (~>)

This is the most useful operator and the one you should reach for most often:

```hcl
# ~> 5.5.0 means >= 5.5.0, < 5.6.0 (allows patch updates)
version = "~> 5.5.0"

# ~> 5.5 means >= 5.5, < 6.0 (allows minor and patch updates)
version = "~> 5.5"

# ~> 5 means >= 5, < 6 (allows everything within major version 5)
version = "~> 5"
```

The `~>` operator allows the rightmost version component to increment. So `~> 5.5.0` allows `5.5.1`, `5.5.2`, `5.5.99` but not `5.6.0`. And `~> 5.5` allows `5.6`, `5.7`, `5.99` but not `6.0`.

## Combining Constraints

You can combine multiple constraints in a single string, separated by commas. All constraints must be satisfied simultaneously:

```hcl
# Accept version 5.x but at least 5.5.0
version = ">= 5.5.0, < 6.0.0"

# Accept 5.5.x but not the buggy 5.5.2 release
version = "~> 5.5.0, != 5.5.2"

# Accept versions between 5.5.0 and 5.8.0 (exclusive)
version = ">= 5.5.0, < 5.8.0"
```

## Understanding Semantic Versioning

Version constraints make the most sense when modules follow semantic versioning (semver). The format is `MAJOR.MINOR.PATCH`:

- **MAJOR** (5.x.x -> 6.x.x): Breaking changes. Input variables renamed, removed, or retyped. Outputs changed. Behavior significantly different.
- **MINOR** (5.5.x -> 5.6.x): New features added in a backward-compatible way. New optional variables, new outputs, new resources.
- **PATCH** (5.5.1 -> 5.5.2): Bug fixes only. No new features, no breaking changes.

Based on this:
- `~> 5.5.0` (allow patches) is safe because patches should only fix bugs.
- `~> 5.5` (allow minor updates) is moderately safe because minor updates add features but should not break existing usage.
- `~> 5` (allow everything in major version) is the same as `>= 5.0.0, < 6.0.0` and assumes the module author respects semver boundaries.

## Constraint Strategies for Different Environments

### Production: Exact Pin

```hcl
# Production - no surprises
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.5.1"
}
```

You tested this exact version. You know it works. No one can accidentally upgrade it.

### Staging: Pessimistic Patch

```hcl
# Staging - allow bug fixes, catch minor issues before prod
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.5.0"
}
```

This picks up patch releases automatically, which is useful for catching bugs that get fixed quickly. If a patch breaks something, you find out in staging before it hits production.

### Development: Pessimistic Minor

```hcl
# Development - allow new features
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.5"
}
```

In dev, you want to test with newer versions to prepare for upgrades.

### Libraries/Shared Modules: Wide Range

If you are writing a module that calls other modules internally, use wider constraints so consumers do not hit version conflicts:

```hcl
# Inside a shared module - be flexible about dependencies
module "subnet_calc" {
  source  = "hashicorp/subnets/cidr"
  version = ">= 1.0.0, < 2.0.0"
}
```

## Pre-Release Versions

Terraform understands pre-release version syntax:

```hcl
# Pre-release versions are excluded by default
version = "~> 5.5.0"  # Does NOT match 5.5.1-beta1

# To explicitly include a pre-release
version = "5.5.1-beta1"
```

Pre-release versions must be specified exactly. Constraint operators like `~>` do not match pre-release versions by default.

## Checking Available Versions

You can check which versions are available on the registry:

```bash
# Using the Terraform Registry API
curl -s "https://registry.terraform.io/v1/modules/terraform-aws-modules/vpc/aws/versions" | jq '.modules[0].versions[].version' | head -20

# Or just visit the registry website
# https://registry.terraform.io/modules/terraform-aws-modules/vpc/aws/latest
```

## Resolving Version Conflicts

If two modules require different versions of the same nested module, Terraform may not be able to resolve the conflict:

```hcl
# Module A requires subnets module ~> 1.0
# Module B requires subnets module ~> 2.0
# This is a conflict - both cannot be satisfied simultaneously
```

In practice, this is rare because Terraform installs separate copies of modules (unlike providers, which are shared). Each module block gets its own copy of its source.

## Documenting Version Decisions

When you pin versions, leave a comment explaining why:

```hcl
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  # Pinned to 5.5.1 - v5.6.0 changed default NAT gateway behavior
  # See: https://github.com/terraform-aws-modules/terraform-aws-vpc/releases/tag/v5.6.0
  # TODO: Upgrade after updating NAT config (INFRA-1234)
  version = "5.5.1"
}
```

This helps the next person understand why a specific version was chosen and when it might be safe to upgrade.

## Automated Constraint Validation

You can use `terraform validate` to check that your constraints are syntactically correct:

```bash
# Validate the configuration including version constraints
terraform validate

# If a constraint is invalid, you will get an error like:
# Error: Invalid version constraint
# ...
```

## Summary

Version constraints give you fine-grained control over which module versions your configuration accepts. Use exact pins for production stability, pessimistic constraints (`~>`) for controlled flexibility, and range constraints for shared modules that need to work across multiple consumer versions. The key insight is that the right constraint strategy depends on the environment and risk tolerance. Production gets exact pins. Development gets wider constraints. And shared modules should be as flexible as possible to avoid version conflicts for consumers.

For the practical side of applying version pins, see [How to Pin Module Versions in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-pin-module-versions-in-terraform/view). For understanding all module source options, check out [How to Use the source Argument in Module Blocks](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-source-argument-in-module-blocks/view).
