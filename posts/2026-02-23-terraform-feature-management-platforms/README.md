# How to Use Terraform with Feature Management Platforms

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Feature Flags, DevOps, Infrastructure as Code, LaunchDarkly

Description: Learn how to manage feature flags and feature management platform configurations using Terraform for consistent, version-controlled feature rollouts.

---

Feature management platforms like LaunchDarkly, Split, and Flagsmith let teams control feature rollouts without redeploying code. But managing feature flags through a web UI introduces the same problems as managing infrastructure manually: no version control, no review process, and no audit trail. Terraform providers for feature management platforms solve this by letting you define feature flags, targeting rules, and environments as code.

In this guide, we will walk through using Terraform to manage feature flags alongside the infrastructure that runs your applications. You will learn how to create flags, set up targeting rules, manage environments, and integrate feature management into your deployment pipeline.

## Why Manage Feature Flags with Terraform

Feature flags are infrastructure. They control what code runs in production, who sees which features, and how traffic is routed. Treating them as infrastructure code provides several advantages.

First, changes go through code review. When someone modifies a feature flag targeting rule, it shows up in a pull request where the team can review it before it takes effect.

Second, you get a full audit trail. Git history shows who changed what flag, when, and why. This is far more reliable than hoping people write notes in the feature flag UI.

Third, you can manage flags across environments consistently. The same Terraform configuration can create matching flag definitions in development, staging, and production, with different targeting rules per environment.

## Setting Up the LaunchDarkly Provider

LaunchDarkly has an official Terraform provider that supports projects, environments, feature flags, segments, and more.

```hcl
# providers.tf
terraform {
  required_providers {
    launchdarkly = {
      source  = "launchdarkly/launchdarkly"
      version = "~> 2.15"
    }
  }
}

provider "launchdarkly" {
  access_token = var.launchdarkly_access_token
}

# Create a project for your application
resource "launchdarkly_project" "web_app" {
  key  = "web-application"
  name = "Web Application"

  environments {
    key   = "development"
    name  = "Development"
    color = "7B68EE"
    tags  = ["dev"]
  }

  environments {
    key   = "staging"
    name  = "Staging"
    color = "FFA500"
    tags  = ["staging"]
  }

  environments {
    key   = "production"
    name  = "Production"
    color = "FF0000"
    tags  = ["prod"]

    # Require confirmation for production changes
    confirm_changes = true
    require_comments = true
  }

  tags = ["managed-by-terraform"]
}
```

## Creating Feature Flags

Define feature flags as Terraform resources, complete with variations and default values.

```hcl
# feature_flags.tf

# Boolean flag for a simple feature toggle
resource "launchdarkly_feature_flag" "new_checkout" {
  project_key = launchdarkly_project.web_app.key
  key         = "new-checkout-flow"
  name        = "New Checkout Flow"
  description = "Enable the redesigned checkout experience"

  variation_type = "boolean"

  variations {
    value = true
    name  = "Enabled"
  }

  variations {
    value = false
    name  = "Disabled"
  }

  defaults {
    on_variation  = 0  # Index of "Enabled" variation
    off_variation = 1  # Index of "Disabled" variation
  }

  tags = ["checkout", "frontend", "managed-by-terraform"]
}

# Multivariate flag for feature experimentation
resource "launchdarkly_feature_flag" "pricing_model" {
  project_key = launchdarkly_project.web_app.key
  key         = "pricing-display-model"
  name        = "Pricing Display Model"
  description = "Control which pricing layout users see"

  variation_type = "string"

  variations {
    value = "control"
    name  = "Original Layout"
  }

  variations {
    value = "variant-a"
    name  = "Card Layout"
  }

  variations {
    value = "variant-b"
    name  = "Table Layout"
  }

  defaults {
    on_variation  = 0
    off_variation = 0
  }

  tags = ["pricing", "experiment", "managed-by-terraform"]
}

# JSON flag for complex configuration
resource "launchdarkly_feature_flag" "rate_limits" {
  project_key = launchdarkly_project.web_app.key
  key         = "api-rate-limits"
  name        = "API Rate Limits"
  description = "Configure rate limiting per tier"

  variation_type = "json"

  variations {
    value = jsonencode({
      free_tier    = { requests_per_minute = 60 }
      pro_tier     = { requests_per_minute = 600 }
      enterprise   = { requests_per_minute = 6000 }
    })
    name = "Standard Limits"
  }

  variations {
    value = jsonencode({
      free_tier    = { requests_per_minute = 120 }
      pro_tier     = { requests_per_minute = 1200 }
      enterprise   = { requests_per_minute = 12000 }
    })
    name = "Double Limits"
  }

  defaults {
    on_variation  = 0
    off_variation = 0
  }

  tags = ["api", "rate-limiting", "managed-by-terraform"]
}
```

## Setting Up Targeting Rules

Targeting rules control who sees which variation of a flag. You can define percentage rollouts, user targeting, and segment-based rules.

```hcl
# targeting.tf

# Create a user segment for beta testers
resource "launchdarkly_segment" "beta_testers" {
  project_key     = launchdarkly_project.web_app.key
  env_key         = "production"
  key             = "beta-testers"
  name            = "Beta Testers"
  description     = "Users who opted into beta testing"
  tags            = ["managed-by-terraform"]

  included = ["user-123", "user-456", "user-789"]

  rules {
    clauses {
      attribute  = "email"
      op         = "endsWith"
      values     = ["@company.com"]
    }
  }
}

# Configure flag targeting for production
resource "launchdarkly_feature_flag_environment" "new_checkout_prod" {
  flag_id = launchdarkly_feature_flag.new_checkout.id
  env_key = "production"

  on = true

  # Individual user targets
  targets {
    values    = ["user-100", "user-200"]
    variation = 0  # Enabled
  }

  # Rule-based targeting
  rules {
    clauses {
      attribute  = "segmentMatch"
      op         = "segmentMatch"
      values     = [launchdarkly_segment.beta_testers.key]
    }
    variation = 0  # Beta testers see the new checkout
  }

  # Percentage rollout for everyone else
  fallthrough {
    rollout_weights = [20000, 80000]  # 20% enabled, 80% disabled
    # Weights are in thousandths of a percent (0-100000)
  }
}

# Enable fully in development
resource "launchdarkly_feature_flag_environment" "new_checkout_dev" {
  flag_id = launchdarkly_feature_flag.new_checkout.id
  env_key = "development"

  on = true

  fallthrough {
    variation = 0  # Everyone sees the new checkout in dev
  }
}
```

## Linking Feature Flags to Infrastructure Deployments

The most powerful pattern ties feature flag state to infrastructure changes. When you deploy a new service version, you can automatically enable the corresponding feature flag.

```hcl
# Deploy the application with a new version
resource "aws_ecs_service" "web_app" {
  name            = "web-application"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.web_app.arn
  desired_count   = var.instance_count

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
  }
}

# When the new version is deployed, gradually enable the feature
resource "launchdarkly_feature_flag_environment" "new_feature_rollout" {
  flag_id = launchdarkly_feature_flag.new_checkout.id
  env_key = var.environment

  # Only enable after the service is deployed
  on = true

  fallthrough {
    # Start with a small rollout percentage
    rollout_weights = var.feature_rollout_weights
  }

  depends_on = [aws_ecs_service.web_app]
}

# Variable to control rollout percentage
variable "feature_rollout_weights" {
  description = "Rollout weights for enabled/disabled (in thousandths of percent)"
  type        = list(number)
  default     = [10000, 90000]  # Start at 10%
}
```

## Managing Flags with Split.io

If you use Split.io instead of LaunchDarkly, the community Terraform provider follows a similar pattern.

```hcl
provider "split" {
  api_key = var.split_api_key
}

# Create a split (feature flag)
resource "split_split" "new_feature" {
  workspace_id = var.split_workspace_id
  traffic_type = "user"
  name         = "new-dashboard"
  description  = "Enable the new dashboard experience"
}

# Define treatments and targeting
resource "split_split_definition" "new_feature_prod" {
  workspace_id  = var.split_workspace_id
  environment   = "production"
  split_name    = split_split.new_feature.name
  traffic_type  = "user"

  default_treatment = "off"

  treatment {
    name = "on"
  }

  treatment {
    name = "off"
  }

  # Percentage-based rollout
  default_rule {
    treatment = "on"
    size      = 25
  }

  default_rule {
    treatment = "off"
    size      = 75
  }
}
```

## Automated Rollout Pipeline

Combine Terraform with CI/CD to create a progressive rollout pipeline that increases feature flag exposure over time.

```yaml
# .github/workflows/progressive-rollout.yml
name: Progressive Feature Rollout

on:
  workflow_dispatch:
    inputs:
      feature_flag:
        description: "Feature flag key to roll out"
        required: true
      environment:
        description: "Target environment"
        required: true
        default: "production"

jobs:
  rollout-10-percent:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Roll out to 10%
        run: |
          terraform apply -auto-approve \
            -var="feature_rollout_weights=[10000,90000]" \
            -target="launchdarkly_feature_flag_environment.${FEATURE_FLAG}"

      - name: Wait and monitor
        run: sleep 1800  # Wait 30 minutes

  rollout-50-percent:
    needs: rollout-10-percent
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Roll out to 50%
        run: |
          terraform apply -auto-approve \
            -var="feature_rollout_weights=[50000,50000]"

      - name: Wait and monitor
        run: sleep 3600  # Wait 1 hour

  rollout-100-percent:
    needs: rollout-50-percent
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Roll out to 100%
        run: |
          terraform apply -auto-approve \
            -var="feature_rollout_weights=[100000,0]"
```

## Best Practices

Separate flag definitions from targeting rules. Define flags in one file and environment-specific targeting in another. This keeps the configuration clean and makes it easy to see what each environment does differently.

Use consistent naming conventions for flag keys. Adopt a pattern like `feature-name-area` or `team-feature-purpose` so flags are easy to find and categorize.

Set up lifecycle rules. Add `prevent_destroy` to critical production flags so they cannot be accidentally removed.

Clean up old flags. When a feature is fully rolled out, remove the flag from both your code and Terraform configuration. Stale flags add complexity over time.

For more on managing Terraform configurations effectively, see our guide on [Terraform Best Practices](https://oneuptime.com/blog/post/2025-12-18-terraform-best-practices/view).

## Conclusion

Managing feature flags through Terraform brings the same rigor to feature rollouts that infrastructure as code brings to resource provisioning. Every flag change is reviewed, versioned, and auditable. By tying feature flags to infrastructure deployments, you create a unified workflow where deploying new code and enabling new features happen through the same declarative process.
