# How to Use tofu destroy to Remove Infrastructure - Tofu Remove Infrastructure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use tofu destroy to safely remove all managed infrastructure, understand the destruction order, and protect critical resources from accidental deletion.

## Introduction

`tofu destroy` removes all resources managed by your current OpenTofu configuration and workspace. It's the cleanest way to decommission an environment - OpenTofu knows the dependency order and destroys resources in the correct sequence. This guide covers safe destroy practices and how to protect critical resources.

## Basic Usage

```bash
# Destroy all infrastructure managed by the current configuration and workspace (with confirmation)

tofu destroy

# OpenTofu shows what will be destroyed and asks:
# Do you really want to destroy all resources?
#   OpenTofu will destroy all your managed infrastructure, as shown above.
#   There is no undo. Only 'yes' will be accepted to confirm.
#
#   Enter a value: yes
```

## Understanding Destroy Order

OpenTofu destroys resources in reverse dependency order:
- Resources that depend on others are destroyed first
- Foundational resources (VPCs, security groups) are destroyed later
- Independent resources can be destroyed in parallel

```text
Creation order:   VPC → Subnet/Security Group → EC2 Instance
Destruction order: EC2 Instance → Subnet/Security Group → VPC
```

## Auto-Approve for CI/CD

```bash
# Skip confirmation
tofu destroy -auto-approve
```

Use extreme caution - this immediately destroys everything with no confirmation.

## Plan Before Destroy

```bash
# Preview what will be destroyed
tofu plan -destroy

# Or save a destroy plan
tofu plan -destroy -out=destroy.tfplan
tofu show -plan=destroy.tfplan  # Review the destruction plan

# Apply the destruction plan
tofu apply destroy.tfplan
```

## Targeted Destroy

```bash
# Destroy a specific resource
tofu destroy -target=aws_instance.old_server

# Destroy a module
tofu destroy -target=module.old_environment

# Combined with apply:
tofu apply -destroy -target=aws_instance.old_server
```

## Protecting Resources from Destroy

Use `lifecycle.prevent_destroy` for critical resources:

```hcl
resource "aws_rds_cluster" "production" {
  # ...

  lifecycle {
    prevent_destroy = true  # Prevents accidental deletion
  }
}

resource "aws_s3_bucket" "data" {
  bucket = "production-critical-data"

  lifecycle {
    prevent_destroy = true
  }
}
```

When you try to destroy a protected resource:

```bash
tofu destroy
# Error: Instance cannot be destroyed
# Resource "aws_rds_cluster.production" has lifecycle.prevent_destroy
# set to true. To allow this object to be destroyed, remove or change
# this lifecycle setting.
```

## Destroy with Variables

```bash
# Provide variables during destroy
tofu destroy -var-file=production.tfvars

# Needed when variables affect resource configuration
```

## Verifying Destruction

```bash
# After destroy, verify state is empty
tofu state list
# (should return nothing)

# Verify in the cloud
aws ec2 describe-instances --filters "Name=tag:ManagedBy,Values=OpenTofu" \
  --query 'Reservations[*].Instances[*].[InstanceId,State.Name]'
```

## Destroy in Environment Cleanup

```bash
#!/bin/bash
# cleanup-environment.sh

set -euo pipefail

ENVIRONMENT="${1:-}"

if [ -z "$ENVIRONMENT" ]; then
  echo "Usage: $0 <environment>"
  exit 1
fi

# Safety check for production
if [ "$ENVIRONMENT" = "production" ]; then
  echo "DANGER: You are about to destroy PRODUCTION infrastructure!"
  echo "Type 'DESTROY-PRODUCTION-I-AM-SURE' to confirm:"
  read -r CONFIRM
  if [ "$CONFIRM" != "DESTROY-PRODUCTION-I-AM-SURE" ]; then
    echo "Aborted - confirmation did not match"
    exit 1
  fi
fi

# Switch workspace
tofu workspace select "$ENVIRONMENT"

# Create a destroy plan for review
tofu plan -destroy -var-file="${ENVIRONMENT}.tfvars" -out=destroy.tfplan

echo ""
echo "Review the above destruction plan. Type 'yes' to proceed:"
read -r CONFIRM
if [ "$CONFIRM" = "yes" ]; then
  tofu apply destroy.tfplan
  echo "Infrastructure for $ENVIRONMENT destroyed"
else
  echo "Destruction cancelled"
  rm destroy.tfplan
fi
```

## Alternative: Remove from State Without Destroying

```bash
# Remove from state management without destroying the actual resource
tofu state rm aws_instance.web

# The resource still exists in the cloud but is no longer managed
# Use with caution - creates orphaned resources
```

## Conclusion

`tofu destroy` is a powerful but irreversible operation. Always plan first using `tofu plan -destroy`, protect critical production resources with `lifecycle.prevent_destroy`, and implement confirmation gates for production environments. For development and feature branch environments, automated destroy after a time-to-live period helps control cloud costs.
