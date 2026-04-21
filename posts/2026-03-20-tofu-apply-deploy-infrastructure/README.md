# How to Use tofu apply to Deploy Infrastructure - Tofu Deploy Infrastructure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use tofu apply to deploy and update infrastructure, apply saved plans, and manage the apply workflow in production environments.

## Introduction

`tofu apply` executes the changes described in an OpenTofu plan. It creates, modifies, and destroys cloud resources to bring your infrastructure into the desired state. Understanding how apply works - including confirmation prompts, saved plans, and error handling - is essential for safe infrastructure management.

## Basic Usage

```bash
# Apply changes (with interactive confirmation)

tofu apply

# OpenTofu shows the plan and asks:
# Do you want to perform these actions?
#   OpenTofu will perform the actions described above.
#   Only 'yes' will be accepted to approve.
#
#   Enter a value: yes
```

## Applying a Saved Plan

The safest approach is to save a plan and apply it exactly:

```bash
# Step 1: Create and review the plan
tofu plan -out=prod.tfplan
tofu show prod.tfplan  # Review before applying

# Step 2: Apply the saved plan (no confirmation needed)
tofu apply prod.tfplan
```

Benefits of saved plans:
- No implicit re-planning between review and apply
- What you approved is exactly what runs
- Audit trail of reviewed plans

## Auto-Approve for CI/CD

```bash
# Skip the confirmation prompt
tofu apply -auto-approve

# Use in CI/CD pipelines
tofu apply -auto-approve -var-file=prod.tfvars
```

Use `-auto-approve` only in automated pipelines where a review step exists before apply.

## Apply with Variables

```bash
# Inline variables
tofu apply -var="instance_type=t3.large"

# Variable file
tofu apply -var-file=production.tfvars

# Multiple variable files
tofu apply \
  -var-file=common.tfvars \
  -var-file=production.tfvars
```

## Apply with Parallelism

```bash
# Default: 10 concurrent resource operations
tofu apply

# Increase for faster applies with many independent resources
tofu apply -parallelism=20

# Reduce for rate-limited APIs
tofu apply -parallelism=5
```

## Targeted Apply

```bash
# Apply only specific resources (use sparingly)
tofu apply -target=aws_instance.web

# Apply only a module
tofu apply -target=module.database

# Apply while excluding specific resources
tofu apply -exclude=module.monitoring
```

## Understanding Apply Output

```bash
# During apply:
aws_vpc.main: Creating...
aws_vpc.main: Still creating... [10s elapsed]
aws_vpc.main: Creation complete after 15s [id=vpc-0a1b2c3d]
aws_subnet.public[0]: Creating...
aws_subnet.public[0]: Creation complete after 2s [id=subnet-0a1b2c3d]

# Summary at completion:
Apply complete! Resources: 5 added, 1 changed, 0 destroyed.

# Outputs:
vpc_id = "vpc-0a1b2c3d"
subnet_ids = ["subnet-0a1b2c3d", "subnet-0e1f2a3b"]
```

## Handling Apply Failures

When an apply partially fails:

```bash
# Apply fails mid-way
# Error: error creating Instance: InvalidSubnetID.NotFound

# State is updated as resources complete - some resources may have been created
tofu state list  # Shows what was created

# Fix the issue and re-run apply
# OpenTofu uses state to avoid recreating resources it successfully recorded
tofu apply
```

## Apply in Production Workflows

```bash
#!/bin/bash
# production-deploy.sh

echo "Starting production deployment..."

# Ensure we're in production workspace
tofu workspace select production

# Generate a plan
tofu plan \
  -var-file=production.tfvars \
  -out=prod.tfplan

# Show plan summary
echo "Changes to be applied:"
tofu show prod.tfplan | tail -5

# Require explicit confirmation
echo ""
echo "Type 'deploy-production' to confirm deployment:"
read -r CONFIRM
if [ "$CONFIRM" != "deploy-production" ]; then
  echo "Deployment cancelled"
  rm prod.tfplan
  exit 1
fi

# Apply
tofu apply prod.tfplan

echo "Deployment complete!"
```

## Checking Apply Output Values

```bash
# Show outputs after apply
tofu output

# Get a specific output
tofu output vpc_id

# JSON format for scripting
tofu output -json | jq '.vpc_id.value'
```

## Conclusion

`tofu apply` is where infrastructure changes become real. Always review the plan before applying, save plan files for production deployments to ensure what you reviewed is what runs, and use `-auto-approve` only in automated pipelines with proper review gates. When applies fail partially, OpenTofu's state tracking means you can usually re-run after fixing the issue without duplicating resources that were successfully recorded in state.
