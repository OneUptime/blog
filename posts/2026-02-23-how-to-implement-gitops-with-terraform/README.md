# How to Implement GitOps with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GitOps, CI/CD, Git, Infrastructure as Code, DevOps

Description: Learn how to implement GitOps principles with Terraform, using Git as the single source of truth for infrastructure state, automated reconciliation, and pull request-driven workflows.

---

GitOps is the practice of using Git as the single source of truth for your infrastructure. Every change goes through a pull request, every deployment is triggered by a Git merge, and the actual state of your infrastructure always matches what is in the repository. Terraform is a natural fit for GitOps because it already defines infrastructure declaratively in code. The challenge is building the automation that closes the loop between Git and your actual infrastructure.

## GitOps Principles for Terraform

The four GitOps principles applied to Terraform:

1. **Declarative** - Infrastructure is defined in Terraform HCL files (already done)
2. **Versioned and immutable** - All changes are committed to Git with full history
3. **Pulled automatically** - The CI/CD system watches Git and applies changes
4. **Continuously reconciled** - Drift is detected and corrected automatically

## The GitOps Workflow

```
Developer creates feature branch
    |
    v
Developer modifies Terraform files
    |
    v
Developer opens pull request
    |
    v
CI automatically runs: fmt, validate, plan
    |
    v
Team reviews code + plan output
    |
    v
PR is approved and merged to main
    |
    v
CI automatically runs: terraform apply
    |
    v
Scheduled job detects drift and auto-reconciles
```

The key difference from regular CI/CD is the last step: continuous reconciliation. In pure GitOps, if someone makes a manual change to the infrastructure, the system automatically reverts it to match what is in Git.

## Branch Strategy

Use a branch strategy that maps to your environments:

```
main       -> production environment (auto-apply)
staging    -> staging environment (auto-apply)
develop    -> dev environment (auto-apply)
feature/*  -> plan only (no apply)
```

```yaml
# .github/workflows/gitops-terraform.yml
name: Terraform GitOps

on:
  push:
    branches: [main, staging, develop]
  pull_request:
    branches: [main, staging, develop]

jobs:
  determine-environment:
    runs-on: ubuntu-latest
    outputs:
      environment: ${{ steps.env.outputs.environment }}
      should_apply: ${{ steps.env.outputs.should_apply }}

    steps:
      - name: Determine environment from branch
        id: env
        run: |
          if [ "${{ github.event_name }}" = "pull_request" ]; then
            echo "should_apply=false" >> $GITHUB_OUTPUT
            echo "environment=plan-only" >> $GITHUB_OUTPUT
          elif [ "${{ github.ref }}" = "refs/heads/main" ]; then
            echo "should_apply=true" >> $GITHUB_OUTPUT
            echo "environment=production" >> $GITHUB_OUTPUT
          elif [ "${{ github.ref }}" = "refs/heads/staging" ]; then
            echo "should_apply=true" >> $GITHUB_OUTPUT
            echo "environment=staging" >> $GITHUB_OUTPUT
          elif [ "${{ github.ref }}" = "refs/heads/develop" ]; then
            echo "should_apply=true" >> $GITHUB_OUTPUT
            echo "environment=dev" >> $GITHUB_OUTPUT
          fi

  plan:
    needs: determine-environment
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0
          terraform_wrapper: false

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/terraform-cicd
          aws-region: us-east-1

      - name: Terraform Plan
        run: |
          ENV=${{ needs.determine-environment.outputs.environment }}
          cd terraform
          terraform init -no-color
          terraform workspace select $ENV || terraform workspace new $ENV
          terraform plan -no-color -var-file="envs/${ENV}.tfvars" -out=tfplan

      - name: Upload plan
        uses: actions/upload-artifact@v4
        with:
          name: tfplan
          path: terraform/tfplan

  apply:
    needs: [determine-environment, plan]
    if: needs.determine-environment.outputs.should_apply == 'true'
    runs-on: ubuntu-latest
    environment: ${{ needs.determine-environment.outputs.environment }}

    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/terraform-cicd
          aws-region: us-east-1

      - name: Download plan
        uses: actions/download-artifact@v4
        with:
          name: tfplan
          path: terraform

      - name: Terraform Apply
        run: |
          ENV=${{ needs.determine-environment.outputs.environment }}
          cd terraform
          terraform init -no-color
          terraform workspace select $ENV
          terraform apply -no-color -auto-approve tfplan
```

## Continuous Reconciliation

The true GitOps piece is automatically correcting drift. Schedule a reconciliation workflow:

```yaml
# .github/workflows/reconcile.yml
name: GitOps Reconciliation

on:
  schedule:
    # Run every 4 hours
    - cron: "0 */4 * * *"

jobs:
  reconcile:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [dev, staging, production]
      fail-fast: false

    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0
          terraform_wrapper: false

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/terraform-cicd
          aws-region: us-east-1

      - name: Check and reconcile drift
        run: |
          ENV=${{ matrix.environment }}
          cd terraform
          terraform init -no-color
          terraform workspace select $ENV

          set +e
          terraform plan -detailed-exitcode -no-color \
            -var-file="envs/${ENV}.tfvars" -out=driftplan 2>&1 | tee plan-output.txt
          EXIT_CODE=${PIPESTATUS[0]}
          set -e

          if [ $EXIT_CODE -eq 2 ]; then
            echo "Drift detected in $ENV - auto-reconciling"

            # For production, only alert (do not auto-apply)
            if [ "$ENV" = "production" ]; then
              echo "Production drift detected. Manual intervention required."
              # Send alert to team
              curl -X POST ${{ secrets.SLACK_WEBHOOK_URL }} \
                -d '{"text": "Production infrastructure drift detected. Review required."}'
              exit 1
            fi

            # Auto-reconcile dev and staging
            terraform apply -no-color -auto-approve driftplan
            echo "Drift reconciled in $ENV"
          else
            echo "No drift detected in $ENV"
          fi
```

## Preventing Manual Changes

A key GitOps principle is that all changes go through Git. Prevent manual changes:

### IAM Policies

```hcl
# iam.tf - Restrict console access
resource "aws_iam_policy" "readonly_console" {
  name = "ReadOnlyConsoleAccess"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ec2:Describe*",
          "rds:Describe*",
          "s3:Get*",
          "s3:List*"
        ]
        Resource = "*"
      },
      {
        Effect = "Deny"
        Action = [
          "ec2:Create*",
          "ec2:Delete*",
          "ec2:Modify*",
          "rds:Create*",
          "rds:Delete*",
          "rds:Modify*"
        ]
        Resource = "*"
        Condition = {
          StringNotEquals = {
            "aws:PrincipalArn" = "arn:aws:iam::123456789012:role/terraform-cicd"
          }
        }
      }
    ]
  })
}
```

### AWS Service Control Policies

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyManualChanges",
      "Effect": "Deny",
      "Action": [
        "ec2:RunInstances",
        "ec2:TerminateInstances",
        "rds:CreateDBInstance",
        "rds:DeleteDBInstance"
      ],
      "Resource": "*",
      "Condition": {
        "StringNotLike": {
          "aws:PrincipalArn": [
            "arn:aws:iam::*:role/terraform-cicd",
            "arn:aws:iam::*:role/break-glass"
          ]
        }
      }
    }
  ]
}
```

## Git-Based State of the World

Maintain a record of the desired state in Git, not just in Terraform state:

```yaml
# environments.yaml - Desired state definition
environments:
  production:
    app_version: "2.4.1"
    instance_count: 5
    instance_type: "t3.large"
    features:
      new_checkout: true
      v2_api: true

  staging:
    app_version: "2.5.0-rc1"
    instance_count: 2
    instance_type: "t3.medium"
    features:
      new_checkout: true
      v2_api: true
      beta_search: true
```

```hcl
# main.tf - Read desired state from YAML
locals {
  environments = yamldecode(file("${path.module}/environments.yaml"))
  config       = local.environments.environments[terraform.workspace]
}

resource "aws_instance" "app" {
  count         = local.config.instance_count
  instance_type = local.config.instance_type
  # ...
}
```

## Audit Trail

GitOps gives you a complete audit trail through Git history:

```bash
# See who changed what and when
git log --oneline --all -- terraform/

# Find who last modified a specific resource
git log -1 --format="%H %an %ai" -- terraform/modules/database/main.tf

# Compare current state with a specific date
git diff HEAD@{2024-01-15} -- terraform/environments/production/
```

## Pull Request as Change Request

Every infrastructure change has a PR that serves as documentation:

```markdown
## Infrastructure Change Request

### What is changing
- Scaling production app instances from 3 to 5
- Upgrading RDS from db.r6g.large to db.r6g.xlarge

### Why
- Current instances hitting 85% CPU during peak hours
- Database query latency increasing during batch jobs

### Terraform Plan Summary
```
Plan: 0 to add, 2 to change, 0 to destroy.
```

### Rollback Plan
- Revert this PR to restore previous instance count and size

### Testing
- [x] Tested scaling in staging environment
- [x] Verified no downtime during RDS modification
```

## Summary

Implementing GitOps with Terraform means treating Git as the absolute source of truth for your infrastructure. Every change goes through a pull request, every merge triggers an automated deployment, and scheduled reconciliation ensures the actual state matches the desired state in Git. The biggest cultural shift is preventing manual changes and routing everything through Git, which requires both tooling (IAM restrictions) and team discipline.

For more on the practical aspects, see our guides on [implementing plan and apply stages](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-plan-and-apply-stages-in-cicd-for-terraform/view) and [drift detection in Terraform CI/CD](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-drift-detection-in-terraform-cicd/view).
