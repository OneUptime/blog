# How to Configure Azure Security Center with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Security Center, OpenTofu, Security, Compliance, Governance

Description: Learn how to configure Azure Security Center (Microsoft Defender for Cloud) with OpenTofu to enable security posture management, compliance assessments, and alert notifications.

## Overview

Azure Security Center, now Microsoft Defender for Cloud, provides unified security management with continuous security assessment, actionable recommendations, and threat protection. OpenTofu manages the core configuration settings.

## Step 1: Configure Defender for Cloud Pricing

```hcl
# main.tf - Enable Defender for Cloud standard tier on key resource types

resource "azurerm_security_center_subscription_pricing" "defender_vms" {
  tier          = "Standard"
  resource_type = "VirtualMachines"
}

resource "azurerm_security_center_subscription_pricing" "defender_sql" {
  tier          = "Standard"
  resource_type = "SqlServers"
}

resource "azurerm_security_center_subscription_pricing" "defender_app_services" {
  tier          = "Standard"
  resource_type = "AppServices"
}
```

## Step 2: Security Contact Configuration

```hcl
# Configure who receives security alerts
resource "azurerm_security_center_contact" "contact" {
  name  = "primary-security-contact"
  email = "security-team@example.com"
  phone = "+1-555-0100"

  # Receive high severity alerts via email
  alert_notifications = true

  # Also notify subscription owners and co-admins
  alerts_to_admins = true
}
```

## Step 3: Legacy Auto-Provisioning Note

The legacy `azurerm_security_center_auto_provisioning` resource manages automatic installation of the Log Analytics agent (MMA). That auto-provisioning capability was deprecated with the November 2024 retirement of the Log Analytics agent, so it should not be used in new OpenTofu configurations.

## Step 4: Connect VM Security Data to a Log Analytics Workspace

```hcl
data "azurerm_subscription" "current" {}

# Log Analytics workspace for Defender for Cloud VM security data
resource "azurerm_log_analytics_workspace" "security_law" {
  name                = "security-center-workspace"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  sku                 = "PerGB2018"
  retention_in_days   = 90
}

# Map VM security data to the workspace
resource "azurerm_security_center_workspace" "sc_workspace" {
  scope        = "/subscriptions/${data.azurerm_subscription.current.subscription_id}"
  workspace_id = azurerm_log_analytics_workspace.security_law.id
}
```

## Step 5: Configure Security Alerts Integration

```hcl
# Send high-severity Defender for Cloud alerts to a Logic App workflow
resource "azurerm_security_center_automation" "security_alerts" {
  name                = "security-center-alerts"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  action {
    type        = "LogicApp"
    resource_id = azurerm_logic_app_workflow.security_notifications.id
    trigger_url = var.logic_app_trigger_url
  }

  source {
    event_source = "Alerts"

    rule_set {
      rule {
        property_path  = "properties.metadata.severity"
        operator       = "Equals"
        expected_value = "High"
        property_type  = "String"
      }
    }
  }

  scopes = [data.azurerm_subscription.current.id]
}
```

## Step 6: Policy Assignment for CIS Compliance

```hcl
# Assign the built-in CIS Azure Foundations initiative
resource "azurerm_subscription_policy_assignment" "cis_azure_foundations" {
  name                 = "cis-azure-foundations"
  subscription_id      = data.azurerm_subscription.current.id
  policy_definition_id = "/providers/Microsoft.Authorization/policySetDefinitions/470a962c-86a0-433b-803a-3c176b5ce79c"
  display_name         = "CIS Azure Foundations v3.0.0"
}
```

## Summary

Microsoft Defender for Cloud configured with OpenTofu establishes a security baseline for your Azure subscription. Defender plan pricing enables workload protection, the Log Analytics workspace can receive VM security data, workflow automation can route high-severity alerts, and policy assignments help track compliance requirements such as CIS Azure Foundations.
