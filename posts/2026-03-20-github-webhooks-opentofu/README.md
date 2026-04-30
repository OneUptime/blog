# How to Create GitHub Webhooks with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GitHub, Infrastructure as Code, IaC, Webhook, Integration

Description: Learn how to create and configure GitHub webhooks for CI/CD integration and event notifications using OpenTofu.

## Introduction

This guide covers How to Create GitHub Webhooks with OpenTofu using OpenTofu with practical examples and production-ready configurations.

## Prerequisites

- OpenTofu v1.6+
- A GitHub token with access to create repositories and manage webhooks
- Basic understanding of OpenTofu concepts

## Step 1: Install and Configure the Provider

```hcl
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }
}

provider "github" {
  # Uses GITHUB_TOKEN and GITHUB_OWNER from the environment
}
```

## Step 2: Set Up Authentication

```bash
# Use environment variables for authentication
export GITHUB_TOKEN="your-github-token"
export GITHUB_OWNER="your-github-user-or-organization"
```

```hcl
variable "repository_name" {
  description = "The name of the repository to create"
  type        = string
}

variable "webhook_url" {
  description = "The URL that will receive GitHub webhook deliveries"
  type        = string
}

variable "webhook_secret" {
  description = "Shared secret used to sign webhook payloads"
  type        = string
  sensitive   = true
}
```

## Step 3: Create Basic Resources

```hcl
resource "github_repository" "main" {
  name        = var.repository_name
  description = "Managed by OpenTofu"
  visibility  = "private"
  auto_init   = true
}
```

## Step 4: Configure Advanced Settings

```hcl
resource "github_repository_webhook" "main" {
  repository = github_repository.main.name

  configuration {
    url          = var.webhook_url
    content_type = "json"
    secret       = var.webhook_secret
    insecure_ssl = false
  }

  active = true

  events = ["push", "pull_request"]
}
```

## Step 5: Define Outputs

```hcl
output "repository_name" {
  description = "The name of the created repository"
  value       = github_repository.main.name
}

output "webhook_id" {
  description = "The ID of the created repository webhook"
  value       = github_repository_webhook.main.id
}
```

## Step 6: Deploy

```bash
# Initialize OpenTofu and download provider
tofu init

# Validate configuration syntax
tofu validate

# Preview planned changes
tofu plan

# Apply configuration
tofu apply
```

## Common Issues and Solutions

### Authentication Errors
Verify `GITHUB_TOKEN` and `GITHUB_OWNER` are set correctly and that the token has permission to create repositories and manage repository webhooks. Fine-grained personal access tokens need the repository `Webhooks` permission with `write` access.

### Rate Limiting
Use the GitHub provider's `write_delay_ms`, `read_delay_ms`, `max_retries`, and `retry_delay_ms` settings if you run into API throttling.

### Provider Version Conflicts
Pin to a specific provider version range to ensure reproducible deployments.

## Conclusion

You have successfully configured GitHub webhooks with OpenTofu. Using the GitHub provider, you can manage repositories and webhook integrations as code for consistent CI/CD and event-driven workflows. Always use environment variables or secure secret stores for sensitive credentials.
