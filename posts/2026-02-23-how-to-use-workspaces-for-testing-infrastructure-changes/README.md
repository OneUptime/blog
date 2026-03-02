# How to Use Workspaces for Testing Infrastructure Changes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Workspace, Testing, Infrastructure as Code, DevOps, CI/CD

Description: Learn how to use Terraform workspaces to safely test infrastructure changes before applying them to production environments.

---

Testing infrastructure changes is nerve-wracking when your only option is to apply directly to production. Terraform workspaces give you a practical way to spin up isolated copies of your infrastructure, test changes against them, and tear them down when you are done. This post covers the workflow, patterns, and scripts you need to make workspace-based testing part of your routine.

## Why Workspaces Work Well for Testing

The core idea is simple: create a temporary workspace, apply your changes there, validate that everything works, then merge the changes and apply to your real environments. Each workspace has its own state, so your test environment is completely independent of production.

This is different from just running `terraform plan`. A plan tells you what Terraform intends to do. A workspace-based test actually creates the resources so you can verify they work end to end - networking, permissions, application behavior, the whole stack.

```bash
# Create a test workspace for your feature branch
terraform workspace new test-add-redis-cache

# Apply the configuration in the test workspace
terraform apply

# Run your validation tests against the new infrastructure
# ...

# When done, destroy the test resources and delete the workspace
terraform destroy -auto-approve
terraform workspace select dev
terraform workspace delete test-add-redis-cache
```

## Setting Up Workspace-Aware Configuration

Your Terraform configuration needs to handle test workspaces gracefully. The key is using `terraform.workspace` to vary resource names and sizes based on the workspace.

```hcl
# variables.tf
variable "environment_config" {
  description = "Configuration per environment type"
  type = map(object({
    instance_type    = string
    instance_count   = number
    db_instance_class = string
    multi_az         = bool
  }))
  default = {
    prod = {
      instance_type    = "t3.large"
      instance_count   = 3
      db_instance_class = "db.r5.large"
      multi_az         = true
    }
    staging = {
      instance_type    = "t3.medium"
      instance_count   = 2
      db_instance_class = "db.t3.medium"
      multi_az         = false
    }
    # Default config for any test workspace
    test = {
      instance_type    = "t3.small"
      instance_count   = 1
      db_instance_class = "db.t3.small"
      multi_az         = false
    }
  }
}

locals {
  # Determine if this is a test workspace
  is_test = !contains(["prod", "staging", "dev"], terraform.workspace)

  # Use test config for any non-standard workspace name
  env_key = local.is_test ? "test" : terraform.workspace

  # Look up configuration for the current environment
  config = var.environment_config[local.env_key]

  # Generate a unique name prefix
  name_prefix = "myapp-${terraform.workspace}"
}
```

Now use these locals throughout your resources:

```hcl
# main.tf
resource "aws_instance" "app" {
  count         = local.config.instance_count
  ami           = data.aws_ami.app.id
  instance_type = local.config.instance_type
  subnet_id     = aws_subnet.private[count.index % length(aws_subnet.private)].id

  tags = {
    Name        = "${local.name_prefix}-app-${count.index + 1}"
    Environment = terraform.workspace
    # Tag test resources so they are easy to find and clean up
    IsTest      = local.is_test ? "true" : "false"
  }
}

resource "aws_db_instance" "main" {
  identifier     = "${local.name_prefix}-db"
  instance_class = local.config.db_instance_class
  multi_az       = local.config.multi_az

  # Use smaller storage for test environments
  allocated_storage = local.is_test ? 20 : 100

  # Skip final snapshot for test environments
  skip_final_snapshot = local.is_test

  # Shorter backup retention for tests
  backup_retention_period = local.is_test ? 0 : 7

  tags = {
    Name        = "${local.name_prefix}-db"
    Environment = terraform.workspace
    IsTest      = local.is_test ? "true" : "false"
  }
}
```

## A Full Testing Workflow

Here is a step-by-step workflow for testing an infrastructure change:

### 1. Create the Test Workspace

```bash
#!/bin/bash
# create-test-env.sh
# Usage: ./create-test-env.sh feature-name

FEATURE_NAME=$1
WORKSPACE_NAME="test-${FEATURE_NAME}"

if [ -z "$FEATURE_NAME" ]; then
  echo "Usage: $0 <feature-name>"
  exit 1
fi

# Create and switch to the test workspace
terraform workspace new "$WORKSPACE_NAME" 2>/dev/null || \
  terraform workspace select "$WORKSPACE_NAME"

echo "Workspace: $WORKSPACE_NAME"
echo "Running terraform plan..."

# Plan first to see what will be created
terraform plan -out="test-${FEATURE_NAME}.tfplan"

echo ""
echo "Review the plan above. To apply, run:"
echo "  terraform apply test-${FEATURE_NAME}.tfplan"
```

### 2. Apply and Run Tests

```bash
#!/bin/bash
# test-infrastructure.sh
# Applies the plan and runs validation tests

set -e

WORKSPACE=$(terraform workspace show)
echo "Testing in workspace: $WORKSPACE"

# Apply the infrastructure
terraform apply -auto-approve

# Wait for resources to stabilize
echo "Waiting 30 seconds for resources to initialize..."
sleep 30

# Get outputs for testing
APP_URL=$(terraform output -raw app_endpoint 2>/dev/null)
DB_ENDPOINT=$(terraform output -raw db_endpoint 2>/dev/null)

echo "App URL: $APP_URL"
echo "DB Endpoint: $DB_ENDPOINT"

# Run basic connectivity tests
echo "Testing application endpoint..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL/health" || echo "000")

if [ "$HTTP_STATUS" = "200" ]; then
  echo "PASS: Application health check returned 200"
else
  echo "FAIL: Application health check returned $HTTP_STATUS"
  exit 1
fi

# Run database connectivity test
echo "Testing database connectivity..."
if nc -z -w5 "$DB_ENDPOINT" 5432; then
  echo "PASS: Database is accepting connections"
else
  echo "FAIL: Cannot connect to database"
  exit 1
fi

echo ""
echo "All tests passed."
```

### 3. Clean Up After Testing

```bash
#!/bin/bash
# cleanup-test-env.sh
# Destroys test infrastructure and removes the workspace

set -e

WORKSPACE=$(terraform workspace show)

# Safety check - never clean up real environments
if [[ "$WORKSPACE" == "prod" || "$WORKSPACE" == "staging" || "$WORKSPACE" == "dev" ]]; then
  echo "ERROR: Cannot clean up $WORKSPACE - this is not a test workspace"
  exit 1
fi

echo "Destroying resources in workspace: $WORKSPACE"
terraform destroy -auto-approve

# Switch away so we can delete the workspace
terraform workspace select dev

# Delete the test workspace
terraform workspace delete "$WORKSPACE"
echo "Workspace $WORKSPACE has been deleted"
```

## Integrating With CI/CD

The real power comes when you automate this in your CI/CD pipeline. Here is an example GitHub Actions workflow:

```yaml
# .github/workflows/test-infrastructure.yml
name: Test Infrastructure Changes

on:
  pull_request:
    paths:
      - 'terraform/**'

jobs:
  test-infra:
    runs-on: ubuntu-latest
    env:
      TF_WORKSPACE: test-pr-${{ github.event.pull_request.number }}
      AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
      AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0

      - name: Terraform Init
        working-directory: terraform
        run: terraform init

      - name: Create Test Workspace
        working-directory: terraform
        run: |
          terraform workspace new "$TF_WORKSPACE" 2>/dev/null || \
            terraform workspace select "$TF_WORKSPACE"

      - name: Terraform Plan
        working-directory: terraform
        run: terraform plan -out=tfplan

      - name: Terraform Apply
        working-directory: terraform
        run: terraform apply -auto-approve tfplan

      - name: Run Integration Tests
        working-directory: terraform
        run: |
          # Run your test suite against the test infrastructure
          APP_URL=$(terraform output -raw app_endpoint)
          ../scripts/run-integration-tests.sh "$APP_URL"

      - name: Cleanup
        if: always()
        working-directory: terraform
        run: |
          terraform destroy -auto-approve
          terraform workspace select default
          terraform workspace delete "$TF_WORKSPACE"
```

## Cost Control for Test Workspaces

Test workspaces create real resources that cost money. Here are some practical ways to control costs:

```hcl
# cost_control.tf

# Use spot instances for test workspaces
resource "aws_spot_instance_request" "test_app" {
  count = local.is_test ? local.config.instance_count : 0

  ami                  = data.aws_ami.app.id
  instance_type        = local.config.instance_type
  spot_price           = "0.05"
  wait_for_fulfillment = true

  tags = {
    Name = "${local.name_prefix}-app-spot"
  }
}

# Use on-demand instances for real environments
resource "aws_instance" "prod_app" {
  count = local.is_test ? 0 : local.config.instance_count

  ami           = data.aws_ami.app.id
  instance_type = local.config.instance_type

  tags = {
    Name = "${local.name_prefix}-app"
  }
}
```

Also set up a scheduled job to find and destroy abandoned test workspaces:

```bash
#!/bin/bash
# find-stale-test-workspaces.sh
# Finds test workspaces older than 24 hours

MAX_AGE_HOURS=24

terraform workspace list | grep "test-" | tr -d ' *' | while read ws; do
  terraform workspace select "$ws"

  # Check the last modified time of the state
  last_modified=$(terraform state pull | jq -r '.serial')

  echo "Workspace: $ws (serial: $last_modified)"
  echo "  Consider destroying if no longer needed"
done
```

## Parallel Testing With Multiple Workspaces

One advantage of workspace-based testing is that multiple developers can test simultaneously without conflicts:

```bash
# Developer A tests their feature
terraform workspace new test-feature-auth-redesign
terraform apply

# Developer B tests their feature at the same time
terraform workspace new test-feature-new-api-endpoint
terraform apply

# Both have completely independent infrastructure
# No conflicts, no waiting
```

## When Not to Use Workspaces for Testing

Workspaces are not always the right choice. If your infrastructure includes resources that are expensive to create and destroy - like large databases with data migration, or DNS records with long TTL values - you might be better off with a permanent staging environment.

Also, if your configuration does not parameterize resource names based on the workspace, you will get naming collisions. Make sure every resource name includes `terraform.workspace` before adopting this pattern.

## Summary

Workspace-based testing gives you a reliable way to validate infrastructure changes before they reach production. The pattern is straightforward: create a temporary workspace, apply your changes, run tests, clean up. Combined with CI/CD automation and cost controls, it becomes a natural part of your infrastructure development workflow. Check out our post on [handling workspace state isolation](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-workspace-state-isolation-in-terraform/view) for more on keeping your workspaces properly separated.
