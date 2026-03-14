# How to Use env0 for Terraform CI/CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Env0, CI/CD, Infrastructure as Code, DevOps, Cost Management

Description: Learn how to use env0 for Terraform CI/CD including environment management, policy enforcement, cost estimation, self-service infrastructure, and team collaboration features.

---

env0 is a Terraform automation platform that focuses on environment management and cost control. Where other platforms treat Terraform runs as pipeline jobs, env0 treats them as managed environments with lifecycle policies. This is particularly useful for teams that spin up temporary environments for development, testing, or demos. This guide covers how to set up and use env0 for your Terraform workflows.

## What Makes env0 Different

env0 stands out from other Terraform CI/CD platforms in a few ways:

- **Environment lifecycle management** - Set TTLs on environments so they auto-destroy after a period
- **Cost tracking and budgets** - Per-environment and per-team cost tracking with budget alerts
- **Self-service templates** - Non-technical users can deploy pre-approved infrastructure
- **Variable management** - Environment-scoped variables with approval workflows for changes
- **Custom flows** - Define multi-step deployment workflows beyond plan and apply

## Getting Started

### Connect Your VCS Provider

1. Sign up at env0.com
2. Go to Organization Settings > VCS Integrations
3. Connect GitHub, GitLab, Bitbucket, or Azure DevOps

### Create a Template

Templates in env0 define what can be deployed. They point to a Terraform directory in your repository:

```text
Template Settings:
  Name: Production Infrastructure
  VCS: GitHub - myorg/infrastructure
  Path: environments/production
  Terraform Version: 1.7.0

  Retry on deploy failure: Yes
  Retry times: 2
```

### Create an Environment from the Template

Environments are instances of templates. You can create multiple environments from the same template with different variable values:

```text
Environment Settings:
  Name: production-us-east-1
  Template: Production Infrastructure

  Variables:
    aws_region: us-east-1
    instance_type: t3.large
    environment: production
```

## Configuring Cloud Credentials

env0 supports multiple credential methods:

### AWS with OIDC

```text
Organization Settings > Credentials > Add Credential

Type: AWS Assumed Role
Role ARN: arn:aws:iam::123456789012:role/env0-terraform
Duration: 3600
```

The IAM role trust policy:

```hcl
# iam.tf - IAM role for env0
resource "aws_iam_role" "env0_terraform" {
  name = "env0-terraform"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = "arn:aws:iam::123456789012:oidc-provider/app.env0.com"
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "app.env0.com:aud" = "your-env0-organization-id"
          }
        }
      }
    ]
  })
}
```

### GCP with Workload Identity

```text
Organization Settings > Credentials > Add Credential

Type: GCP Service Account
Project ID: my-gcp-project
Service Account: terraform@my-gcp-project.iam.gserviceaccount.com
```

## Environment Lifecycle Management

This is where env0 really shines. Set policies on how long environments can live:

```text
Template Settings > Environment Lifecycle:

  TTL:
    Default: 8 hours
    Maximum: 72 hours
    Allow extension: Yes (up to maximum)

  Schedule:
    Auto-deploy: Weekdays 8 AM UTC
    Auto-destroy: Weekdays 8 PM UTC

  Inactivity:
    Destroy after: 24 hours of no commits
```

This prevents forgotten environments from running up cloud bills. A developer spins up a test environment, and it automatically destroys itself at the end of the workday.

## Variable Management

env0 provides multi-level variable scoping:

```text
Organization Variables (apply to all environments):
  TF_VAR_company_name = "MyCompany"

Project Variables (apply to project environments):
  TF_VAR_vpc_cidr = "10.0.0.0/16"

Template Variables (defined in template):
  TF_VAR_instance_type = "t3.medium" (default, can be overridden)

Environment Variables (specific to this environment):
  TF_VAR_environment = "staging"
```

Sensitive variables are encrypted and never displayed:

```text
Variable Settings:
  Name: TF_VAR_db_password
  Value: ********
  Sensitive: Yes

  Requires approval to change: Yes
  Approvers: platform-team
```

## Policy Enforcement

env0 has a built-in policy engine using OPA:

```rego
# policies/cost-guard.rego
package env0

# Deny if estimated monthly cost exceeds budget
deny[msg] {
  input.plan.cost_estimation.monthly > 5000
  msg := sprintf("Estimated monthly cost $%.2f exceeds $5000 budget", [input.plan.cost_estimation.monthly])
}

# Require approval for changes over $500/month
require_approval[msg] {
  input.plan.cost_estimation.delta > 500
  msg := sprintf("Cost increase of $%.2f requires manager approval", [input.plan.cost_estimation.delta])
}
```

```rego
# policies/resource-restrictions.rego
package env0

# Prevent launching large instances without approval
deny[msg] {
  resource := input.plan.resource_changes[_]
  resource.type == "aws_instance"
  resource.change.after.instance_type == "r6g.8xlarge"
  msg := "r6g.8xlarge instances are not allowed. Use r6g.4xlarge or smaller."
}

# Require encryption on all S3 buckets
deny[msg] {
  resource := input.plan.resource_changes[_]
  resource.type == "aws_s3_bucket"
  not resource.change.after.server_side_encryption_configuration
  msg := sprintf("S3 bucket %s must have server-side encryption enabled", [resource.address])
}
```

## Custom Flows

Define multi-step workflows beyond the standard plan-apply:

```yaml
# env0.yml - Custom flow definition
deploy:
  steps:
    setup:
      - name: Install tools
        run: |
          pip install checkov
          curl -s https://raw.githubusercontent.com/aquasecurity/tfsec/master/scripts/install_linux.sh | bash

    pre-plan:
      - name: Security scan
        run: |
          tfsec . --format json --out tfsec-results.json
          checkov -d . --output json > checkov-results.json

      - name: Validate naming conventions
        run: python scripts/validate-names.py

    post-plan:
      - name: Cost check
        run: |
          # Parse plan output for cost estimation
          terraform show -json $ENV0_PLAN_FILE | python scripts/cost-check.py

    post-apply:
      - name: Run smoke tests
        run: |
          python scripts/smoke-test.py --endpoint $TF_VAR_endpoint

      - name: Notify team
        run: |
          curl -X POST $SLACK_WEBHOOK \
            -d '{"text": "Environment deployed successfully: $ENV0_ENVIRONMENT_NAME"}'

destroy:
  steps:
    pre-destroy:
      - name: Backup data
        run: python scripts/pre-destroy-backup.py

    post-destroy:
      - name: Cleanup DNS
        run: python scripts/cleanup-dns.py
```

## Self-Service Infrastructure

Create templates that non-technical users can deploy through the env0 UI:

```text
Template: Developer Sandbox
  Description: "Spin up a personal development environment with VPC, ECS cluster, and RDS"

  User-facing variables:
    team_name:
      description: "Your team name"
      type: text
      required: true

    size:
      description: "Environment size"
      type: dropdown
      options: [small, medium, large]
      default: small

    needs_database:
      description: "Include RDS database?"
      type: boolean
      default: false

  Lifecycle:
    Default TTL: 8 hours
    Maximum TTL: 48 hours

  Budget:
    Maximum monthly: $200
```

Developers can then deploy without understanding Terraform:

1. Go to env0 dashboard
2. Click "Deploy New Environment"
3. Select the "Developer Sandbox" template
4. Fill in the form fields
5. Click "Deploy"

## Cost Tracking and Budgets

env0 provides detailed cost visibility:

```text
Dashboard > Cost:

  Organization total: $12,450/month

  By Project:
    Production: $8,200/month
    Staging: $2,100/month
    Development: $1,350/month
    Sandboxes: $800/month

  By Team:
    Platform: $9,500/month
    Backend: $1,800/month
    Frontend: $1,150/month

  Budget alerts:
    - Development project at 85% of $1,500 budget
    - Frontend team at 92% of $1,200 budget
```

## Drift Detection

Enable scheduled drift detection:

```text
Template Settings > Drift Detection:
  Enabled: Yes
  Schedule: Every 6 hours
  Auto-remediate: No (alert only)
  Notification: Slack #infrastructure-alerts
```

When drift is detected, env0 can:
- Send a notification
- Create a new plan showing the drift
- Auto-apply to remediate (if configured)
- Open a PR with the required changes

## Integrating with Existing CI/CD

env0 can be triggered from your existing pipelines:

```yaml
# .github/workflows/deploy.yml
- name: Trigger env0 deployment
  run: |
    curl -X POST "https://api.env0.com/environments/${ENV0_ENVIRONMENT_ID}/deployments" \
      -H "Authorization: Bearer ${ENV0_API_KEY}" \
      -H "Content-Type: application/json" \
      -d '{
        "deploymentType": "deploy",
        "userRequiresApproval": false
      }'
```

## Summary

env0 is a strong choice for teams that need environment lifecycle management and cost control on top of Terraform CI/CD. The self-service templates make it accessible to non-infrastructure teams, and the TTL-based environment management prevents cost waste from forgotten resources. If your main challenge is managing many short-lived environments or controlling infrastructure costs, env0 addresses those problems directly.

For alternative platforms, check out our guides on [Spacelift for Terraform CI/CD](https://oneuptime.com/blog/post/2026-02-23-how-to-use-spacelift-for-terraform-cicd/view) and [Scalr for Terraform CI/CD](https://oneuptime.com/blog/post/2026-02-23-how-to-use-scalr-for-terraform-cicd/view).
