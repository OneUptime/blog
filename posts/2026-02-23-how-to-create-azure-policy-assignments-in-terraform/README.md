# How to Create Azure Policy Assignments in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Azure Policy, Infrastructure as Code, Governance, Compliance

Description: Learn how to create and manage Azure Policy assignments using Terraform to enforce governance, compliance, and organizational standards across your Azure resources.

---

Azure Policy is one of those services that separates a well-governed cloud environment from a chaotic one. If you have ever struggled with developers spinning up resources that do not meet your organization's security or compliance requirements, Azure Policy is the answer. And when you combine it with Terraform, you get a repeatable, version-controlled approach to governance that scales across subscriptions and management groups.

In this guide, we will walk through how to create Azure Policy assignments using Terraform, covering everything from built-in policies to custom policy definitions and initiative assignments.

## What Are Azure Policy Assignments?

Azure Policy evaluates resources in Azure by comparing their properties against business rules defined in JSON format. A policy assignment is the act of attaching a policy definition (or initiative) to a specific scope - a management group, subscription, resource group, or individual resource.

When a policy is assigned, Azure evaluates all existing and new resources within that scope. Depending on the policy effect, non-compliant resources can be denied, audited, modified, or remediated automatically.

## Prerequisites

Before we begin, make sure you have the following set up:

- Terraform 1.3 or later installed
- An Azure subscription with Owner or Policy Contributor permissions
- Azure CLI authenticated (`az login`)

## Setting Up the Terraform Provider

Start with the basic provider configuration:

```hcl
# main.tf - Provider configuration
terraform {
  required_version = ">= 1.3.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
  }
}

provider "azurerm" {
  features {}
}

# Reference the current subscription for scoping
data "azurerm_subscription" "current" {}
```

## Assigning a Built-in Policy

Azure comes with hundreds of built-in policy definitions. Let us start by assigning one of the most common ones - requiring a specific tag on resource groups.

```hcl
# Assign a built-in policy that audits resource groups missing a required tag
resource "azurerm_subscription_policy_assignment" "require_environment_tag" {
  name                 = "require-env-tag"
  subscription_id      = data.azurerm_subscription.current.id
  policy_definition_id = "/providers/Microsoft.Authorization/policyDefinitions/96670d01-0a4d-4649-9c89-2d3abc0a5025"
  display_name         = "Require Environment Tag on Resource Groups"
  description          = "Audits resource groups that do not have an Environment tag"

  # Parameters are passed as JSON
  parameters = jsonencode({
    tagName = {
      value = "Environment"
    }
  })
}
```

The `policy_definition_id` above references the built-in "Require a tag on resource groups" policy. You can find the IDs for built-in policies in the Azure Policy documentation or by running `az policy definition list --query "[?policyType=='BuiltIn']"`.

## Looking Up Built-in Policy Definitions

Rather than hardcoding policy definition IDs, you can look them up dynamically:

```hcl
# Look up a built-in policy definition by display name
data "azurerm_policy_definition" "allowed_locations" {
  display_name = "Allowed locations"
}

# Assign the policy to restrict resource deployment locations
resource "azurerm_subscription_policy_assignment" "allowed_locations" {
  name                 = "allowed-locations"
  subscription_id      = data.azurerm_subscription.current.id
  policy_definition_id = data.azurerm_policy_definition.allowed_locations.id
  display_name         = "Restrict Deployment to Approved Regions"
  description          = "Only allow resources in East US and West US 2"

  parameters = jsonencode({
    listOfAllowedLocations = {
      value = ["eastus", "westus2"]
    }
  })
}
```

## Creating a Custom Policy Definition

Sometimes built-in policies do not cover your exact requirements. Here is how to create a custom policy and assign it:

```hcl
# Define a custom policy that denies public IP addresses
resource "azurerm_policy_definition" "deny_public_ip" {
  name         = "deny-public-ip-creation"
  policy_type  = "Custom"
  mode         = "All"
  display_name = "Deny Public IP Address Creation"
  description  = "Prevents creation of public IP addresses to enforce private networking"

  # The policy rule in JSON format
  policy_rule = jsonencode({
    if = {
      field  = "type"
      equals = "Microsoft.Network/publicIPAddresses"
    }
    then = {
      effect = "Deny"
    }
  })
}

# Assign the custom policy to a specific resource group
resource "azurerm_resource_group" "example" {
  name     = "rg-policy-demo"
  location = "eastus"

  tags = {
    Environment = "Development"
  }
}

resource "azurerm_resource_group_policy_assignment" "deny_public_ip" {
  name                 = "deny-public-ip"
  resource_group_id    = azurerm_resource_group.example.id
  policy_definition_id = azurerm_policy_definition.deny_public_ip.id
  display_name         = "Deny Public IPs in Dev Resource Group"
  description          = "Block public IP creation in development environments"
}
```

## Creating Policy Initiatives (Policy Sets)

Policy initiatives group multiple policy definitions into a single assignment. This is useful when you want to apply a set of related compliance checks together.

```hcl
# Create a custom initiative that bundles multiple security policies
resource "azurerm_policy_set_definition" "security_baseline" {
  name         = "security-baseline"
  policy_type  = "Custom"
  display_name = "Security Baseline Initiative"
  description  = "A set of policies that enforce basic security standards"

  # Reference built-in policies within the initiative
  policy_definition_reference {
    policy_definition_id = "/providers/Microsoft.Authorization/policyDefinitions/404c3081-a854-4457-ae11-4f18ce352cff"
    reference_id         = "secureTransfer"
    parameter_values     = jsonencode({})
  }

  policy_definition_reference {
    policy_definition_id = data.azurerm_policy_definition.allowed_locations.id
    reference_id         = "allowedLocations"
    parameter_values = jsonencode({
      listOfAllowedLocations = {
        value = ["eastus", "westus2"]
      }
    })
  }

  # Include the custom policy we created earlier
  policy_definition_reference {
    policy_definition_id = azurerm_policy_definition.deny_public_ip.id
    reference_id         = "denyPublicIp"
    parameter_values     = jsonencode({})
  }
}

# Assign the initiative to the subscription
resource "azurerm_subscription_policy_assignment" "security_baseline" {
  name                 = "security-baseline"
  subscription_id      = data.azurerm_subscription.current.id
  policy_definition_id = azurerm_policy_set_definition.security_baseline.id
  display_name         = "Security Baseline"
  description          = "Enforces baseline security policies across the subscription"

  # Enable the system-assigned managed identity for remediation tasks
  identity {
    type = "SystemAssigned"
  }

  location = "eastus"
}
```

## Policy Assignments with Managed Identity for Remediation

Some policy effects like `DeployIfNotExists` and `Modify` require a managed identity to perform remediation. Here is how to set that up:

```hcl
# Look up the policy for enabling diagnostic settings
data "azurerm_policy_definition" "deploy_diagnostics" {
  display_name = "Deploy Diagnostic Settings for Key Vault to Log Analytics workspace"
}

# Assign the policy with a managed identity for auto-remediation
resource "azurerm_subscription_policy_assignment" "kv_diagnostics" {
  name                 = "kv-diagnostics"
  subscription_id      = data.azurerm_subscription.current.id
  policy_definition_id = data.azurerm_policy_definition.deploy_diagnostics.id
  display_name         = "Auto-deploy Key Vault Diagnostics"
  description          = "Automatically deploys diagnostic settings for Key Vaults"

  # Managed identity is required for DeployIfNotExists policies
  identity {
    type = "SystemAssigned"
  }

  location = "eastus"

  # Non-compliance message shown in the portal
  non_compliance_message {
    content = "Key Vault diagnostic settings must be configured to send logs to Log Analytics."
  }
}

# Grant the managed identity the necessary permissions for remediation
resource "azurerm_role_assignment" "policy_kv_diagnostics" {
  scope                = data.azurerm_subscription.current.id
  role_definition_name = "Contributor"
  principal_id         = azurerm_subscription_policy_assignment.kv_diagnostics.identity[0].principal_id
}
```

## Exemptions

Sometimes specific resources need to be exempt from a policy. Terraform handles this cleanly:

```hcl
# Exempt a specific resource group from the allowed locations policy
resource "azurerm_resource_group_policy_assignment" "exempt_rg" {
  name                 = "allowed-locations-exempt"
  resource_group_id    = azurerm_resource_group.example.id
  policy_definition_id = data.azurerm_policy_definition.allowed_locations.id

  # Mark this as not enforced - it will audit but not deny
  enforce = false

  display_name = "Allowed Locations (Audit Only)"
}
```

For full exemptions, you can use the `azurerm_resource_policy_exemption` resource:

```hcl
# Create a policy exemption for a specific resource group
resource "azurerm_resource_group_policy_exemption" "dev_exemption" {
  name                 = "dev-rg-exemption"
  resource_group_id    = azurerm_resource_group.example.id
  policy_assignment_id = azurerm_subscription_policy_assignment.security_baseline.id
  exemption_category   = "Waiver"
  display_name         = "Development Environment Waiver"
  description          = "Temporary exemption for development resource group"

  # Optional expiration date
  expires_on = "2026-06-30T00:00:00Z"
}
```

## Best Practices

Here are a few things to keep in mind when working with Azure Policy in Terraform:

**Start with Audit mode.** Before switching to Deny, run policies in Audit mode first. This lets you see what would be blocked without actually breaking anything. You can change the effect later once you are confident.

**Use initiatives over individual assignments.** Grouping related policies into initiatives makes management much simpler, especially at scale. It also aligns well with compliance frameworks like CIS, NIST, or ISO 27001.

**Version control your custom policies.** Store policy rules in separate JSON files and reference them with `file()` in Terraform. This makes them easier to review and diff.

**Scope assignments carefully.** Assigning a Deny policy at the management group level affects every subscription underneath. Test at a resource group level first, then expand the scope.

**Monitor compliance.** Use the Azure Policy compliance dashboard in the portal or query the compliance state through the Azure CLI to track how well your environment adheres to assigned policies.

## Wrapping Up

Azure Policy assignments in Terraform give you a powerful way to enforce governance as code. Whether you are using built-in policies for common scenarios or writing custom definitions tailored to your organization, Terraform makes the whole process reproducible and auditable. The combination of policy definitions, initiatives, managed identities for remediation, and exemptions gives you fine-grained control over what is allowed in your Azure environment.

For related infrastructure-as-code topics, check out our guide on [How to Create Azure Log Analytics Workspaces in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-azure-log-analytics-workspaces-in-terraform/view) which pairs well with policy-driven diagnostic settings.
