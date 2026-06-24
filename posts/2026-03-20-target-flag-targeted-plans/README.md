# How to Use the -target Flag for Targeted Plans in OpenTofu - Targeted Plans

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use the OpenTofu -target flag to limit plan and apply operations to specific resources or modules, and understand when this is appropriate.

## Introduction

The `-target` flag limits `tofu plan` and `tofu apply` to specific resources or modules and any objects they depend on. While powerful for specific use cases, it should be used carefully because the resulting plan may not include every change requested by the current configuration.

## Basic Usage

```bash
# Target a specific resource

tofu plan -target=aws_instance.web
tofu apply -target=aws_instance.web

# Target a module
tofu plan -target=module.networking
tofu apply -target=module.networking

# Target multiple resources
tofu plan -target=aws_instance.web -target=aws_security_group.web
```

## When to Use -target

### Bootstrapping Chicken-and-Egg Issues

When a resource needs to exist before the rest of the configuration can work:

```bash
# Create just the KMS key first
tofu apply -target=aws_kms_key.state_encryption

# Then apply the rest
tofu apply
```

### Testing New Resources in Isolation

```bash
# Test a new resource configuration before applying the full stack
tofu plan -target=module.new_feature
```

### Emergency Fixes to Specific Resources

```bash
# Fix a specific broken resource without touching others
tofu apply -target=aws_security_group.app
```

## Targeting Syntax

```bash
# Single resource
-target=aws_instance.web

# Resource with count index
-target='aws_instance.web[0]'

# Resource with for_each key
-target='aws_instance.web["prod"]'

# Module
-target=module.networking

# Resource within a module
-target=module.networking.aws_vpc.main

# Nested module
-target=module.environment.module.networking
```

Current OpenTofu documentation warns not to rely on individual resource instance addresses with `-target`; prefer whole-resource addresses unless OpenTofu specifically directs otherwise.

## Why -target Should Be a Last Resort

OpenTofu shows a warning when you use `-target`:

```hcl
Warning: Resource targeting is in effect
...
the result of this plan may not represent all of the changes requested by
the current configuration.
```

Reasons to be cautious:
- Applies may succeed while non-targeted resources or outputs are out of sync
- Can leave configuration changes unapplied or output values not fully updated
- Subsequent full applies may behave unexpectedly
- Narrows planning to the target and its dependencies, so the plan can miss other required changes

## Follow Up with a Full Plan

After using `-target`, always follow up with a full plan:

```bash
# After targeted apply
tofu apply -target=module.new_feature

# Verify full state is consistent
tofu plan
# Should show no unexpected changes
```

## Alternative to -target

Instead of targeting, consider:

1. **Split configurations**: Move the target resource to its own state
2. **Use references or `depends_on`**: Fix actual dependency issues
3. **Lifecycle rules**: Use `create_before_destroy` or `ignore_changes`

## Conclusion

The `-target` flag is a useful escape hatch for specific scenarios but should be used sparingly. After any targeted operation, run a full `tofu plan` to verify your entire configuration is consistent. For regular workflows, prefer full plans and applies over targeted ones to maintain state integrity.
