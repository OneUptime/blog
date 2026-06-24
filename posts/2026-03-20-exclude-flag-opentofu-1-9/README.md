# How to Use the -exclude Flag Introduced in OpenTofu 1.9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Exclude Flag, OpenTofu 1.9, CLI, Infrastructure as Code

Description: Learn how to use the -exclude flag introduced in OpenTofu 1.9 to skip specific resources during plan and apply operations.

## Introduction

OpenTofu 1.9 introduced the `-exclude` flag for `tofu plan` and `tofu apply`. While `-target` lets you focus on specific resources and their dependencies, `-exclude` does the opposite - it focuses on everything except the named resources and anything that depends on them. OpenTofu recommends using resource targeting only in exceptional circumstances, such as recovering from mistakes or working around limitations. This is valuable when you need to apply most of your configuration but skip a problematic or long-running resource.

## Basic Usage

Exclude a single resource from a plan or apply.

```bash
# Plan everything except the RDS instance and anything depending on it

tofu plan -exclude=aws_db_instance.main

# Apply everything except the RDS instance and anything depending on it
tofu apply -exclude=aws_db_instance.main
```

## Excluding Multiple Resources

Pass multiple `-exclude` flags to skip several resources at once.

```bash
# Skip multiple slow resources
tofu apply \
  -exclude=aws_db_instance.main \
  -exclude=aws_elasticache_replication_group.cache \
  -exclude=aws_opensearch_domain.search
```

## Excluding a Module

Exclude all resources inside a module.

```bash
# Skip an entire module during apply
tofu apply -exclude=module.data_warehouse

# Or skip a specific resource within a module
tofu apply -exclude=module.networking.aws_vpc.main
```

## Common Use Cases

### Skipping During Incremental Deploys

When iterating on application resources, skip the slow database tier.

```bash
# Deploy while excluding the database and cache modules
tofu apply \
  -exclude=module.database \
  -exclude=module.cache \
  -auto-approve
```

### Bypassing a Broken Resource Temporarily

When a resource is in a bad state and you need to apply other changes:

```bash
# Apply all changes except the broken resource and anything depending on it
tofu apply -exclude=aws_lambda_function.problematic -auto-approve

# Fix the resource separately
# Then focus on that resource and its dependencies
tofu apply -target=aws_lambda_function.problematic
```

### Skipping Read-Heavy Data Sources

Exclude data sources that make expensive API calls during development.

```bash
# Skip a slow AMI lookup data source
tofu plan -exclude=data.aws_ami.latest_amazon_linux
```

## Using -exclude and -target Separately

`-exclude` and `-target` both activate resource targeting, but OpenTofu does not allow them in the same command.

```bash
# Target only the app module
tofu plan -target=module.app

# Or exclude one resource from an otherwise broader plan
tofu plan -exclude=module.app.aws_cloudwatch_log_group.verbose_logs
```

## Difference Between -target and -exclude

| Flag | Effect |
|------|--------|
| `-target=X` | Only process resource X (and its dependencies) |
| `-exclude=X` | Process resources other than X and anything that depends on X |

Use `-target` when you want to focus on a small set. Use `-exclude` when you want to apply most of your configuration but skip one or two resources and anything downstream from them.

## Checking What Would Be Excluded

Use plan first to verify the exclusion before applying.

```bash
# Verify the plan without the excluded resource and its dependents
tofu plan -exclude=aws_db_instance.main -out=plan.tfplan

# Inspect the plan
tofu show plan.tfplan

# Apply the saved plan
tofu apply plan.tfplan
```

## Summary

The `-exclude` flag in OpenTofu 1.9 is the complement to `-target`, letting you skip specific resources or modules and anything that depends on them while applying the rest of your configuration. It reduces the need for complex workarounds when dealing with slow, broken, or intentionally-deferred resources, but it should still be reserved for exceptional situations. Always use a saved plan file with `-exclude` in production to ensure what you reviewed is exactly what gets applied.
