# How to Use Spacelift for Terraform CI/CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Spacelift, CI/CD, Infrastructure as Code, DevOps, Cloud Management

Description: Learn how to use Spacelift for Terraform CI/CD including stack configuration, policy as code with OPA, drift detection, approval workflows, and multi-cloud infrastructure management.

---

Spacelift is a purpose-built CI/CD platform for infrastructure as code. Unlike general-purpose CI/CD tools where you build Terraform pipelines from scratch, Spacelift gives you Terraform-native workflows out of the box. It handles state management, policy enforcement, drift detection, and approval flows without you writing pipeline YAML. This guide walks through setting up and using Spacelift for your Terraform workflows.

## Why Spacelift Over DIY Pipelines

Building Terraform CI/CD with GitHub Actions or GitLab CI works, but you end up reinventing several wheels:

- State locking and management
- Plan output formatting and PR comments
- Approval workflows
- Drift detection scheduling
- Policy enforcement
- Cost estimation
- Concurrent run management

Spacelift handles all of these natively. The tradeoff is cost and vendor dependency, which may or may not matter for your team.

## Getting Started

### Connect Your VCS Provider

1. Sign up at spacelift.io
2. Go to Settings > Source Code
3. Connect your GitHub, GitLab, or Bitbucket account
4. Authorize Spacelift to access your repositories

### Create Your First Stack

A stack in Spacelift is equivalent to a Terraform workspace or directory:

```text
Settings:
  Name: production-infrastructure
  Repository: myorg/infrastructure
  Branch: main
  Project root: environments/production
  Terraform version: 1.7.0

Runner image: public.ecr.aws/spacelift/runner-terraform:latest
```

Or create stacks programmatically using Spacelift's Terraform provider:

```hcl
# spacelift.tf - Define stacks as code
provider "spacelift" {}

resource "spacelift_stack" "production" {
  name        = "production-infrastructure"
  description = "Production AWS infrastructure"

  repository   = "infrastructure"
  branch       = "main"
  project_root = "environments/production"

  terraform_version = "1.7.0"

  # Auto-deploy on merge to main
  autodeploy = true

  # Labels for organizing and policy targeting
  labels = ["production", "aws", "critical"]
}

resource "spacelift_stack" "staging" {
  name        = "staging-infrastructure"
  description = "Staging AWS infrastructure"

  repository   = "infrastructure"
  branch       = "main"
  project_root = "environments/staging"

  terraform_version = "1.7.0"
  autodeploy        = true
  labels             = ["staging", "aws"]
}
```

## Cloud Integration

Configure cloud credentials using Spacelift's integration rather than storing static keys:

```hcl
# aws-integration.tf - Native AWS integration via OIDC
resource "spacelift_aws_integration" "production" {
  name = "aws-production"

  # Spacelift assumes this role using OIDC
  role_arn                       = "arn:aws:iam::123456789012:role/spacelift-terraform"
  duration_seconds               = 3600
  generate_credentials_in_worker = false

  labels = ["production"]
}

# Attach the integration to a stack
resource "spacelift_aws_integration_attachment" "production" {
  integration_id = spacelift_aws_integration.production.id
  stack_id       = spacelift_stack.production.id

  read  = true
  write = true
}
```

## Policy as Code with OPA

Spacelift uses Open Policy Agent (OPA) for policy enforcement. Write policies in Rego:

```rego
# policies/plan-policy.rego
# Deny plans that destroy more than 3 resources

package spacelift

# Deny if too many resources are being destroyed
deny[reason] {
  count(input.terraform.resource_changes[_].change.actions[_] == "delete") > 3
  reason := sprintf("Plan wants to destroy more than 3 resources. Found: %d", [
    count([r | r := input.terraform.resource_changes[_]; r.change.actions[_] == "delete"])
  ])
}

# Warn on any resource replacement
warn[reason] {
  resource := input.terraform.resource_changes[_]
  resource.change.actions[_] == "delete"
  resource.change.actions[_] == "create"
  reason := sprintf("Resource %s will be replaced (destroyed and recreated)", [resource.address])
}
```

```rego
# policies/approval-policy.rego
# Require approval for production changes

package spacelift

# Require approval for production stacks
approve {
  input.run.state == "UNCONFIRMED"
  input.stack.labels[_] == "production"
}

# Auto-approve staging if no destructive changes
approve {
  not destructive_changes
  input.stack.labels[_] == "staging"
}

destructive_changes {
  input.terraform.resource_changes[_].change.actions[_] == "delete"
}
```

Register policies in Spacelift:

```hcl
# policies.tf
resource "spacelift_policy" "plan_safety" {
  name = "plan-safety-checks"
  type = "PLAN"
  body = file("policies/plan-policy.rego")

  labels = ["all-stacks"]
}

resource "spacelift_policy" "approval" {
  name = "production-approval"
  type = "APPROVAL"
  body = file("policies/approval-policy.rego")

  labels = ["production"]
}

# Attach policy to stacks
resource "spacelift_policy_attachment" "plan_safety_prod" {
  policy_id = spacelift_policy.plan_safety.id
  stack_id  = spacelift_stack.production.id
}
```

## Drift Detection

Enable automatic drift detection:

```hcl
# drift-detection.tf
resource "spacelift_drift_detection" "production" {
  stack_id  = spacelift_stack.production.id
  reconcile = false  # Detect only, do not auto-fix

  # Check every 6 hours
  schedule = ["0 */6 * * *"]
}

# Auto-reconcile drift in staging (apply to fix drift)
resource "spacelift_drift_detection" "staging" {
  stack_id  = spacelift_stack.staging.id
  reconcile = true  # Auto-fix detected drift

  schedule = ["0 8 * * *"]  # Daily at 8 AM
}
```

## Stack Dependencies

Define dependencies between stacks so they run in the correct order:

```hcl
# dependencies.tf
resource "spacelift_stack_dependency" "compute_on_networking" {
  stack_id            = spacelift_stack.compute.id
  depends_on_stack_id = spacelift_stack.networking.id
}

resource "spacelift_stack_dependency" "database_on_networking" {
  stack_id            = spacelift_stack.database.id
  depends_on_stack_id = spacelift_stack.networking.id
}

# Pass outputs between stacks
resource "spacelift_stack_dependency_reference" "vpc_id" {
  stack_dependency_id = spacelift_stack_dependency.compute_on_networking.id
  output_name         = "vpc_id"
  input_name          = "TF_VAR_vpc_id"
}
```

## Environment Variables and Contexts

Share configuration across stacks using contexts:

```hcl
# contexts.tf
resource "spacelift_context" "aws_production" {
  name        = "aws-production-config"
  description = "Shared configuration for production AWS stacks"

  labels = ["production", "aws"]
}

resource "spacelift_environment_variable" "region" {
  context_id = spacelift_context.aws_production.id
  name       = "TF_VAR_aws_region"
  value      = "us-east-1"
  write_only = false
}

resource "spacelift_environment_variable" "db_password" {
  context_id = spacelift_context.aws_production.id
  name       = "TF_VAR_db_password"
  value      = var.db_password
  write_only = true  # Not visible in the UI
}

# Attach context to stacks
resource "spacelift_context_attachment" "prod_infra" {
  context_id = spacelift_context.aws_production.id
  stack_id   = spacelift_stack.production.id
  priority   = 0
}
```

## Cost Estimation

Spacelift provides built-in cost estimation for Terraform plans:

```text
Plan Summary:
  Resources: +3, ~1, -0
  Estimated monthly cost: $142.50 (+$45.00 from current)

  Breakdown:
    aws_instance.web:     $35.00/mo (new)
    aws_rds_instance.db:  $95.00/mo (updated, +$10.00)
    aws_eip.web:          $3.60/mo (new)
    aws_lb.main:          $8.90/mo (new)
```

Write policies based on cost:

```rego
# policies/cost-policy.rego
package spacelift

# Warn on plans that increase costs by more than $100/month
warn[reason] {
  input.run.changes.cost.delta > 100
  reason := sprintf("Monthly cost increase of $%.2f exceeds $100 threshold", [input.run.changes.cost.delta])
}

# Deny plans that increase costs by more than $1000/month
deny[reason] {
  input.run.changes.cost.delta > 1000
  reason := sprintf("Monthly cost increase of $%.2f exceeds $1000 limit. Requires manual override.", [input.run.changes.cost.delta])
}
```

## Webhooks and Notifications

Configure notifications for Spacelift events:

```hcl
# notifications.tf
resource "spacelift_webhook" "slack" {
  endpoint = "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX"
  secret   = var.webhook_secret
  enabled  = true
}

# Configure which events trigger the webhook
resource "spacelift_notification_policy" "production_alerts" {
  name = "production-alerts"
  body = <<-EOT
    package spacelift

    # Notify on failed runs
    notify[msg] {
      input.run.state == "FAILED"
      input.stack.labels[_] == "production"
      msg := {
        "type": "slack",
        "channel": "#infrastructure-alerts",
        "text": sprintf("Terraform run failed for %s: %s", [input.stack.name, input.run.id])
      }
    }
  EOT
}
```

## Migration from DIY Pipelines

If you are moving from GitHub Actions or GitLab CI to Spacelift:

1. **Import existing state** - Spacelift can manage existing state files or use your current remote backend
2. **Create stacks** - One stack per Terraform directory/workspace
3. **Set up cloud integrations** - Replace static credentials with OIDC
4. **Define policies** - Convert your pipeline checks to OPA policies
5. **Disable old pipelines** - Once Spacelift is running, remove the CI/CD YAML files

## Summary

Spacelift removes the overhead of building and maintaining Terraform CI/CD pipelines. The OPA policy engine is particularly powerful for enforcing organizational standards across all stacks. Drift detection, cost estimation, and stack dependencies are features you would otherwise have to build yourself. If the cost is justified for your team size, Spacelift significantly reduces the operational burden of managing Terraform at scale.

For alternative platforms, see our guides on [env0 for Terraform CI/CD](https://oneuptime.com/blog/post/2026-02-23-how-to-use-env0-for-terraform-cicd/view) and [Scalr for Terraform CI/CD](https://oneuptime.com/blog/post/2026-02-23-how-to-use-scalr-for-terraform-cicd/view).
