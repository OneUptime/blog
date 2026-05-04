# How to Configure Pagerduty Provider with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Provider, Automation, DevOps

Description: Learn how to configure and use the Pagerduty provider in OpenTofu to manage Pagerduty resources as code.

## Introduction

The Pagerduty provider for OpenTofu enables managing Pagerduty resources with the same plan/apply workflow as your cloud infrastructure. This guide covers authentication, basic resource configuration, and production best practices.

## Provider Installation

```hcl
terraform {
  required_providers {
    pagerduty = {
      source  = "PagerDuty/pagerduty"
      version = "~> 3.0"
    }
  }
  required_version = ">= 1.6.0"
}
```

## Authentication

The PagerDuty provider reads its API token from the `PAGERDUTY_TOKEN` environment variable. Generate a token from the PagerDuty web UI under **Integrations -> API Access Keys**.

```bash
# Set the PagerDuty API token via environment variable
export PAGERDUTY_TOKEN="your-api-token"
```

```hcl
provider "pagerduty" {
  # token is read from the PAGERDUTY_TOKEN environment variable
  # token = var.pagerduty_token  # Alternative: inline (not recommended)
}
```

## Example Resource

```hcl
# Create a user and an escalation policy that pages them
resource "pagerduty_user" "engineer" {
  name  = "${var.name}-${var.environment}"
  email = "engineer@example.com"
}

resource "pagerduty_escalation_policy" "main" {
  name      = "${var.name}-${var.environment}-escalation"
  num_loops = 2

  rule {
    escalation_delay_in_minutes = 10
    target {
      type = "user_reference"
      id   = pagerduty_user.engineer.id
    }
  }
}
```

## Variables

```hcl
variable "name"        { type = string }
variable "environment" { type = string }
```

## Outputs

```hcl
output "escalation_policy_id" { value = pagerduty_escalation_policy.main.id }
```

## Best Practices

- Store API keys in environment variables or a secrets manager-never in .tf files
- Pin provider versions in `required_providers` to prevent unexpected updates
- Commit the `.terraform.lock.hcl` file to lock exact provider versions
- Use separate provider configurations per environment using aliases or workspaces

## Conclusion

Managing Pagerduty resources with OpenTofu brings the same consistency and auditability to SaaS tooling as you get with cloud infrastructure. Start by codifying your most critical resources and gradually expand coverage over time.
