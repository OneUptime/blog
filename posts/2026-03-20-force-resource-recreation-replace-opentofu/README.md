# How to Force Resource Recreation with -replace in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Resource, Replace, Force Recreation, Infrastructure as Code, DevOps

Description: A guide to using the -replace flag in OpenTofu to force specific resources to be destroyed and recreated during apply.

## Introduction

The `-replace` flag in OpenTofu lets you force a specific resource to be destroyed and recreated, even when no configuration changes would normally trigger replacement. This is useful for replacing degraded resources, applying changes OpenTofu cannot detect automatically, or recovering from damaged remote objects.

## Basic -replace Usage

```bash
# Force replace a specific resource

tofu apply -replace="aws_instance.web"

# Preview what will happen (plan only)
tofu plan -replace="aws_instance.web"

# Replace multiple resources at once
tofu apply -replace="aws_instance.web" -replace="aws_eip.web"
```

## When to Use -replace

```bash
# Scenario 1: Instance is running but degraded (failing health checks)
tofu apply -replace="aws_instance.app"

# Scenario 2: Spot instance was interrupted, force recreation
tofu apply -replace="aws_instance.spot_worker"

# Scenario 3: Certificate has expired but rotation wasn't detected
tofu apply -replace="aws_acm_certificate.domain"

# Scenario 4: Database cluster node needs to be replaced
tofu apply -replace="aws_rds_cluster_instance.replica[0]"
```

## Using -replace with for_each Resources

```bash
# Replace a specific for_each instance by key
tofu apply -replace='aws_instance.web["us-east-1a"]'

# Replace a count-indexed resource
tofu apply -replace='aws_instance.worker[2]'

# Replace a module resource
tofu apply -replace='module.app.aws_instance.server'
```

## Replacing with Plan File

```bash
# Step 1: Create plan with replacement flag
tofu plan -replace="aws_instance.web" -out=replace-plan.tfplan

# Step 2: Review the plan
tofu show -plan=replace-plan.tfplan

# Step 3: Apply the saved plan
tofu apply replace-plan.tfplan
```

## -replace vs Taint

```bash
# Old way: taint then apply (two steps)
tofu taint aws_instance.web
tofu apply

# New way: -replace (one step, preferred)
tofu apply -replace="aws_instance.web"

# -replace keeps the replacement request in the plan/apply workflow
# taint writes a taint marker to state before apply

# For auditing/GitOps workflows, use -replace with plan file:
tofu plan -replace="aws_instance.web" -out=fix-degraded.tfplan
# Review plan, then apply
tofu apply fix-degraded.tfplan
```

## Understanding the Plan Output

```bash
tofu plan -replace="aws_instance.web"
# Output:
# OpenTofu will perform the following actions:
#
#   # aws_instance.web will be replaced, as requested
# -/+ resource "aws_instance" "web" {
#       ~ id            = "i-0abc123" -> (known after apply)
#       ...
#     }
#
# Plan: 1 to add, 0 to change, 1 to destroy.
```

## Combining -replace with -target

```bash
# Force replacement of one resource while focusing the plan
# on selected resources and their dependencies
tofu apply \
  -replace="aws_instance.web" \
  -target="aws_instance.web" \
  -target="aws_eip.web"

# Note: -target limits which resources are considered
# Only use -target for exceptional situations
```

## Forcing Replacement in Automation

```bash
#!/bin/bash
# Script to replace a degraded instance

RESOURCE_ADDRESS=$1

if [ -z "$RESOURCE_ADDRESS" ]; then
  echo "Usage: $0 <resource_address>"
  exit 1
fi

echo "Planning replacement of ${RESOURCE_ADDRESS}..."
tofu plan \
  -replace="${RESOURCE_ADDRESS}" \
  -out=replacement-plan.tfplan

echo "Applying replacement..."
tofu apply replacement-plan.tfplan

echo "Replacement complete!"
```

## Verifying the Replacement

```bash
# Check state before and after
tofu state show aws_instance.web

# Apply replacement
tofu apply -replace="aws_instance.web"

# Verify new instance ID was created
tofu state show aws_instance.web
# id = "i-0xyz789"  # New instance ID
```

## Conclusion

The `-replace` flag provides a clean, explicit way to force resource recreation without modifying configuration files. It is the preferred replacement for the older `tofu taint` command. Use `-replace` when a resource has become degraded, when you need to force rotation of credentials or certificates, or when you need to recover from damaged remote objects that OpenTofu cannot automatically detect. Always preview replacements with `tofu plan -replace` before applying to understand the full impact on dependent resources.
