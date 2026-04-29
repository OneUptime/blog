# How to Manage LaunchDarkly Feature Flags with OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, LaunchDarkly, Feature Flag, Feature Management, Release

Description: Learn how to manage LaunchDarkly projects, environments, feature flags, and targeting rules using OpenTofu for code-driven feature flag management.

## Introduction

The LaunchDarkly provider for OpenTofu manages feature flags, environments, and targeting configurations. Managing feature flags as code ensures consistency across environments, enables flag auditing through version history, and prevents orphaned flags from accumulating in your LaunchDarkly project.

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
  access_token = var.launchdarkly_access_token
}
```

## Project and Environments

```hcl
resource "launchdarkly_project" "main" {
  key  = "my-app"
  name = "My Application"

  environments {
    key   = "development"
    name  = "Development"
    color = "0077CC"
  }

  environments {
    key   = "staging"
    name  = "Staging"
    color = "FF8C00"
  }

  environments {
    key   = "production"
    name  = "Production"
    color = "CC0000"
  }
}
```

## Boolean Feature Flag

```hcl
resource "launchdarkly_feature_flag" "new_checkout" {
  project_key = launchdarkly_project.main.key
  key         = "new-checkout-flow"
  name        = "New Checkout Flow"
  description = "Enable the redesigned checkout experience"
  variation_type = "boolean"

  variations {
    value       = "true"
    name        = "On"
    description = "New checkout enabled"
  }

  variations {
    value       = "false"
    name        = "Off"
    description = "Old checkout flow"
  }

  defaults {
    on_variation  = 0  # Index of "true" variation
    off_variation = 1  # Index of "false" variation
  }

  tags = ["checkout", "ux", "q1-2025"]
}
```

## Environment-Specific Flag Configuration

```hcl
# Enable flag for 20% of users in production

resource "launchdarkly_feature_flag_environment" "new_checkout_prod" {
  flag_id     = launchdarkly_feature_flag.new_checkout.id
  env_key     = "production"
  on          = true

  fallthrough {
    rollout_weights = [20000, 80000]  # 20% "true", 80% "false"
  }

  off_variation = 1  # Return "false" when flag is off
}

# Enable 100% in development
resource "launchdarkly_feature_flag_environment" "new_checkout_dev" {
  flag_id     = launchdarkly_feature_flag.new_checkout.id
  env_key     = "development"
  on          = true

  fallthrough {
    variation = 0  # Always "true" in dev
  }

  off_variation = 1
}
```

## Targeting Rules

```hcl
resource "launchdarkly_feature_flag_environment" "new_checkout_staging" {
  flag_id  = launchdarkly_feature_flag.new_checkout.id
  env_key  = "staging"
  on       = true

  # Target specific users (e.g., internal team)
  rules {
    variation = 0  # "true"
    clauses {
      attribute = "email"
      op        = "endsWith"
      values    = ["@example.com"]
      negate    = false
    }
  }

  # Everyone else gets the false variation
  fallthrough {
    variation = 1  # "false"
  }

  off_variation = 1

  track_events = true
}
```

## Multivariate Flag

```hcl
resource "launchdarkly_feature_flag" "recommendation_algo" {
  project_key    = launchdarkly_project.main.key
  key            = "recommendation-algorithm"
  name           = "Recommendation Algorithm"
  variation_type = "string"

  variations {
    value = "collaborative-filtering"
    name  = "Collaborative Filtering"
  }

  variations {
    value = "content-based"
    name  = "Content Based"
  }

  variations {
    value = "hybrid"
    name  = "Hybrid Model"
  }

  defaults {
    on_variation  = 0
    off_variation = 0
  }
}
```

## Conclusion

LaunchDarkly managed with OpenTofu makes feature flags first-class infrastructure. New flags go through code review, old flags get removed when features are fully rolled out (preventing flag debt), and targeting percentages are change-managed rather than being ad-hoc UI clicks. The lifecycle of a flag - creation, gradual rollout, full enablement, cleanup - is visible in the git history.
