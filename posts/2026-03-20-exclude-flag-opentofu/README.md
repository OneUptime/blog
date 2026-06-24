# How to Use the -exclude Flag in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use the OpenTofu -exclude flag to skip specific resources during plan and apply operations, the inverse of the -target flag.

## Introduction

The `-exclude` flag (available in OpenTofu 1.9+) is the negative-targeting counterpart to `-target`. While `-target` focuses operations on specific resources and their dependencies, `-exclude` focuses on everything except the specified resources and anything that depends on them. This is useful when you want to apply most of your configuration but skip certain problematic resources.

## Basic Usage

```bash
# Exclude a specific resource from the plan

tofu plan -exclude=aws_instance.web

# Exclude multiple resources
tofu plan \
  -exclude=aws_instance.web \
  -exclude=aws_db_instance.database

# Exclude a module
tofu plan -exclude=module.monitoring

# Apply while excluding specific resources
tofu apply -exclude=module.monitoring
```

## Use Cases

### Skipping a Broken Resource

When one resource is failing and blocking the entire apply:

```bash
# Apply everything except the problematic resource
tofu apply -exclude=aws_lambda_function.flaky_function

# Fix the issue, then apply the excluded resource
tofu apply -target=aws_lambda_function.flaky_function
```

### Gradual Migrations

Apply most of the configuration while migrating a specific component:

```bash
# Apply everything except the old database (being migrated separately)
tofu apply -exclude=aws_db_instance.legacy_database
```

### Excluding Third-Party Resources

When some resources are managed by another team:

```bash
# Don't touch the shared security groups
tofu apply -exclude=module.shared_security_groups
```

## Syntax for Different Resource Types

```bash
# Single resource
-exclude=aws_instance.web

# Indexed resource (count)
-exclude='aws_instance.web[0]'

# for_each resource
-exclude='aws_instance.web["prod"]'

# Module
-exclude=module.networking

# Resource within a module
-exclude=module.networking.aws_subnet.public
```

## -exclude vs -target Comparison

| Aspect | -target | -exclude |
|--------|---------|----------|
| Applies to | Specified resources and their dependencies | Non-excluded resources, excluding anything that depends on excluded addresses |
| Use when | Isolating specific resources | Skipping specific resources |
| Blast radius | Small (targeted) | Large (everything else that is not dependent on excluded addresses) |

## Combining with -target

You cannot combine `-target` and `-exclude` in the same command - pick one approach:

```bash
# These options are mutually exclusive
# -target is more explicit for isolation
# -exclude is better for "skip this one thing"
```

## Follow Up with Full Plan

After using `-exclude`, run a full plan to verify consistency:

```bash
tofu apply -exclude=module.monitoring

# Verify state is consistent
tofu plan
# Should show any remaining changes, including excluded resources
# and anything affected by them (if applicable)
```

## Conclusion

The `-exclude` flag is OpenTofu's negative-targeting counterpart to `-target`, offering a "skip this" rather than "only this" approach. Use it when you want to apply most of your configuration but need to temporarily skip a specific resource or module. Like `-target`, it's an escape hatch rather than a routine workflow tool - always follow up with a full plan to ensure state consistency.
