# How to Handle Multi-Cloud IAM with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Multi-Cloud, IAM, AWS, Azure, GCP, Security, Infrastructure as Code

Description: Learn how to manage identity and access management across AWS, Azure, and GCP using Terraform for consistent multi-cloud security governance.

---

Organizations running workloads across multiple cloud providers face a unique challenge: managing identity and access management (IAM) consistently across AWS, Azure, and GCP. Each cloud has its own IAM model, terminology, and best practices. Terraform provides a unified workflow that lets you manage all three from a single codebase. This guide shows you how to build a cohesive multi-cloud IAM strategy.

## Understanding Multi-Cloud IAM Differences

AWS uses IAM users, roles, and policies. Azure uses Azure Active Directory with RBAC role assignments. GCP uses IAM policies bound to resources with service accounts. Despite these differences, the core concepts of principals, permissions, and resources are shared across all three platforms.

## Setting Up Multi-Cloud Providers

```hcl
# Configure all three cloud providers
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.0"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

provider "azurerm" {
  features {}
}

provider "azuread" {}

provider "google" {
  project = var.gcp_project_id
  region  = "us-central1"
}

variable "gcp_project_id" {
  type = string
}
```

## Defining a Unified Role Model

Start by defining roles in a cloud-agnostic way, then map them to each provider:

```hcl
# Define application roles that map across clouds
variable "application_roles" {
  type = map(object({
    description = string
    aws_policy  = string
    azure_role  = string
    gcp_role    = string
  }))
  default = {
    "readonly" = {
      description = "Read-only access to application resources"
      aws_policy  = "ReadOnlyAccess"
      azure_role  = "Reader"
      gcp_role    = "roles/viewer"
    }
    "developer" = {
      description = "Developer access for building and deploying"
      aws_policy  = "PowerUserAccess"
      azure_role  = "Contributor"
      gcp_role    = "roles/editor"
    }
    "admin" = {
      description = "Full administrative access"
      aws_policy  = "AdministratorAccess"
      azure_role  = "Owner"
      gcp_role    = "roles/owner"
    }
  }
}
```

## Creating AWS IAM Roles

```hcl
# Create AWS IAM roles for each application role
resource "aws_iam_role" "multi_cloud" {
  for_each = var.application_roles

  name        = "multicloud-${each.key}"
  description = each.value.description

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          # Allow federation from your identity provider
          Federated = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:saml-provider/corporate-idp"
        }
        Condition = {
          StringEquals = {
            "SAML:aud" = "https://signin.aws.amazon.com/saml"
          }
        }
      }
    ]
  })
}

# Attach AWS managed policies to roles
resource "aws_iam_role_policy_attachment" "multi_cloud" {
  for_each = var.application_roles

  role       = aws_iam_role.multi_cloud[each.key].name
  policy_arn = "arn:aws:iam::aws:policy/${each.value.aws_policy}"
}

data "aws_caller_identity" "current" {}
```

## Creating Azure RBAC Assignments

```hcl
# Create Azure AD groups for each role
resource "azuread_group" "multi_cloud" {
  for_each = var.application_roles

  display_name     = "multicloud-${each.key}"
  description      = each.value.description
  security_enabled = true
}

# Get the current subscription
data "azurerm_subscription" "current" {}

# Assign Azure roles to the groups
resource "azurerm_role_assignment" "multi_cloud" {
  for_each = var.application_roles

  scope                = data.azurerm_subscription.current.id
  role_definition_name = each.value.azure_role
  principal_id         = azuread_group.multi_cloud[each.key].object_id
}
```

## Creating GCP IAM Bindings

```hcl
# Create GCP service accounts for each role
resource "google_service_account" "multi_cloud" {
  for_each = var.application_roles

  account_id   = "multicloud-${each.key}"
  display_name = "Multi-Cloud ${title(each.key)}"
  description  = each.value.description
  project      = var.gcp_project_id
}

# Bind GCP IAM roles to service accounts
resource "google_project_iam_member" "multi_cloud" {
  for_each = var.application_roles

  project = var.gcp_project_id
  role    = each.value.gcp_role
  member  = "serviceAccount:${google_service_account.multi_cloud[each.key].email}"
}
```

## Cross-Cloud Authentication with Workload Identity

Enable workloads in one cloud to authenticate with another:

```hcl
# Allow AWS roles to access GCP using Workload Identity Federation
resource "google_iam_workload_identity_pool" "aws_federation" {
  workload_identity_pool_id = "aws-cross-cloud"
  display_name              = "AWS Cross-Cloud Federation"
  project                   = var.gcp_project_id
}

resource "google_iam_workload_identity_pool_provider" "aws" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.aws_federation.workload_identity_pool_id
  workload_identity_pool_provider_id = "aws-provider"

  aws {
    account_id = data.aws_caller_identity.current.account_id
  }

  attribute_mapping = {
    "google.subject"    = "assertion.arn"
    "attribute.account" = "assertion.account"
  }
}

# Allow AWS role to impersonate GCP service account
resource "google_service_account_iam_binding" "aws_to_gcp" {
  service_account_id = google_service_account.multi_cloud["developer"].name
  role               = "roles/iam.workloadIdentityUser"

  members = [
    "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.aws_federation.name}/*"
  ]
}
```

## Centralized Policy Management Module

Create a module that manages IAM consistently across clouds:

```hcl
# modules/multi-cloud-iam/main.tf
variable "role_name" {
  type = string
}

variable "aws_actions" {
  type    = list(string)
  default = []
}

variable "azure_role" {
  type    = string
  default = "Reader"
}

variable "gcp_role" {
  type    = string
  default = "roles/viewer"
}

variable "gcp_project" {
  type = string
}

# AWS custom policy
resource "aws_iam_policy" "custom" {
  count = length(var.aws_actions) > 0 ? 1 : 0
  name  = "multicloud-${var.role_name}"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = var.aws_actions
        Resource = "*"
      }
    ]
  })
}

# Azure AD group
resource "azuread_group" "role" {
  display_name     = "multicloud-${var.role_name}"
  security_enabled = true
}

# GCP service account
resource "google_service_account" "role" {
  account_id   = "mc-${var.role_name}"
  display_name = "Multi-Cloud ${var.role_name}"
  project      = var.gcp_project
}

resource "google_project_iam_member" "role" {
  project = var.gcp_project
  role    = var.gcp_role
  member  = "serviceAccount:${google_service_account.role.email}"
}
```

## Implementing Consistent Tagging

Use consistent tags and labels across all clouds for IAM governance:

```hcl
# Define standard tags for all IAM resources
locals {
  standard_tags = {
    managed_by  = "terraform"
    team        = "platform"
    environment = var.environment
  }
}

variable "environment" {
  type    = string
  default = "production"
}

# Apply tags to AWS resources
resource "aws_iam_role" "tagged" {
  name = "tagged-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })

  tags = local.standard_tags
}

# Apply tags to GCP resources
resource "google_service_account" "tagged" {
  account_id   = "tagged-sa"
  display_name = "Tagged Service Account"
  project      = var.gcp_project_id
}

# Apply tags to Azure resources
resource "azuread_group" "tagged" {
  display_name     = "tagged-group"
  security_enabled = true
}
```

## Monitoring Multi-Cloud IAM

Set up unified monitoring for IAM changes across all clouds:

```hcl
# AWS CloudTrail for IAM events
resource "aws_cloudwatch_event_rule" "iam_changes" {
  name = "multi-cloud-iam-monitor"
  event_pattern = jsonencode({
    source      = ["aws.iam"]
    detail-type = ["AWS API Call via CloudTrail"]
  })
}

# GCP audit logging for IAM
resource "google_project_iam_audit_config" "all_services" {
  project = var.gcp_project_id
  service = "allServices"

  audit_log_config {
    log_type = "ADMIN_READ"
  }
  audit_log_config {
    log_type = "DATA_WRITE"
  }
}
```

## Best Practices

Use a centralized identity provider (like Okta or Azure AD) that federates to all three clouds. Define roles in a cloud-agnostic way and map them to provider-specific implementations. Use consistent naming conventions across all providers. Implement cross-cloud authentication using federation rather than static credentials. Audit all three clouds regularly and compare access patterns. Store your multi-cloud IAM configuration in a dedicated Terraform workspace or repository.

For monitoring your multi-cloud infrastructure, check out our guide on [creating uptime monitors](https://oneuptime.com/blog/post/2026-02-23-how-to-create-uptime-monitors-with-terraform/view).

## Conclusion

Managing multi-cloud IAM with Terraform brings consistency and governance to what would otherwise be a fragmented security landscape. By defining roles centrally and mapping them to each cloud provider, you maintain the principle of least privilege while supporting the flexibility that multi-cloud environments require. The key is to start with a clear role model, use federation for cross-cloud authentication, and monitor IAM changes across all providers from a single pane of glass.
