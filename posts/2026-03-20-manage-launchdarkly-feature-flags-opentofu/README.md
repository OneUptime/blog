# How to Manage LaunchDarkly Feature Flags with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, LaunchDarkly, Feature Flag, Infrastructure as Code, Feature Management

Description: Learn how to manage LaunchDarkly feature flags, projects, environments, and targeting rules using OpenTofu and the official LaunchDarkly provider.

## Introduction

LaunchDarkly is a feature management platform that enables teams to safely deploy features behind flags and progressively roll them out. Managing LaunchDarkly configurations through OpenTofu brings feature flags into your infrastructure-as-code workflow, providing version control and consistent environments.

## Prerequisites

- OpenTofu installed (v1.6+)
- A LaunchDarkly account on a plan that includes the Terraform provider
- A LaunchDarkly access token with write permissions

## Provider Configuration

```hcl
terraform {
  required_providers {
    launchdarkly = {
      source  = "launchdarkly/launchdarkly"
      version = "~> 2.0"
    }
  }
}

provider "launchdarkly" {
}
```

```bash
export LAUNCHDARKLY_ACCESS_TOKEN="api-your-token"
```

## Creating a Project

```hcl
resource "launchdarkly_project" "app" {
  key  = "my-app"
  name = "My Application"

  environments {
    key   = "production"
    name  = "Production"
    color = "ff0000"
    tags  = ["production", "critical"]
  }

  environments {
    key   = "staging"
    name  = "Staging"
    color = "f5a623"
    tags  = ["staging"]
  }

  environments {
    key   = "development"
    name  = "Development"
    color = "7b68ee"
    tags  = ["development"]
  }

  tags = ["infrastructure"]
}
```

## Creating Feature Flags

### Boolean Flag

```hcl
resource "launchdarkly_feature_flag" "new_checkout" {
  project_key = launchdarkly_project.app.key
  key         = "new-checkout-flow"
  name        = "New Checkout Flow"
  description = "Enables the redesigned checkout experience"
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
    on_variation  = 0
    off_variation = 1
  }

  tags = ["checkout", "ux"]
}
```

### Multivariate String Flag

```hcl
resource "launchdarkly_feature_flag" "ui_theme" {
  project_key    = launchdarkly_project.app.key
  key            = "ui-theme"
  name           = "UI Theme"
  variation_type = "string"

  variations {
    value       = "light"
    name        = "Light Theme"
    description = "Default light theme"
  }

  variations {
    value       = "dark"
    name        = "Dark Theme"
    description = "Dark mode theme"
  }

  variations {
    value       = "high-contrast"
    name        = "High Contrast"
    description = "Accessibility-optimized theme"
  }

  defaults {
    on_variation  = 0
    off_variation = 0
  }
}
```

## Configuring Flag Environments

Enable a flag and set targeting rules per environment:

```hcl
resource "launchdarkly_feature_flag_environment" "new_checkout_staging" {
  flag_id     = launchdarkly_feature_flag.new_checkout.id
  env_key     = "staging"
  on          = true

  fallthrough {
    variation = 0  # Enabled for all in staging
  }

  off_variation = 1
}

resource "launchdarkly_feature_flag_environment" "new_checkout_production" {
  flag_id     = launchdarkly_feature_flag.new_checkout.id
  env_key     = "production"
  on          = true

  # Target beta users
  rules {
    variation = 0
    clauses {
      attribute = "groups"
      op        = "in"
      values    = ["beta-users", "internal-testers"]
    }
  }

  # 10% rollout for everyone else
  fallthrough {
    rollout_weights = [10000, 90000]  # 10% on, 90% off (weights sum to 100000)
  }

  off_variation = 1
}
```

## Managing Segments

```hcl
resource "launchdarkly_segment" "beta_users" {
  key         = "beta-users"
  project_key = launchdarkly_project.app.key
  env_key     = "production"
  name        = "Beta Users"

  included = ["user-001", "user-002", "user-003"]

  rules {
    clauses {
      attribute = "plan"
      op        = "in"
      values    = ["enterprise", "premium"]
    }
  }
}
```

## Best Practices

- Use descriptive flag keys that reflect the feature, not the experiment.
- Always define `off_variation` to ensure safe flag disabling.
- Use segments to target specific user groups rather than hardcoding user keys.
- Archive old flags after a feature is fully launched and code branches are removed.
- Use separate projects for separate applications to maintain clean environments.

## Conclusion

Managing LaunchDarkly with OpenTofu brings feature flag configurations into your standard infrastructure workflow. Teams can review flag changes as pull requests, track the history of targeting rules in version control, and ensure consistent flag configurations across environments.
