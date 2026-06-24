# How to Set Up Azure DDoS Protection with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, DDoS Protection, Network Security, Infrastructure as Code

Description: Learn how to configure Azure DDoS Network Protection with OpenTofu to protect public IP resources against volumetric, protocol, and application-layer DDoS attacks.

## Introduction

Azure DDoS Network Protection provides enhanced DDoS mitigation against network-layer DDoS attacks such as volumetric and protocol attacks for resources in a virtual network. For application-layer (Layer 7) attacks, pair it with a web application firewall (WAF). Unlike the default infrastructure-level DDoS protection included with Azure services, DDoS Network Protection provides adaptive tuning, attack analytics, real-time metrics, and post-attack reports. It protects public IP resources associated with linked VNets.

## Prerequisites

- OpenTofu v1.6+
- Azure credentials with Network permissions
- Public IP addresses to protect

## Step 1: Create DDoS Protection Plan

```hcl
resource "azurerm_network_ddos_protection_plan" "main" {
  name                = "${var.project_name}-ddos-plan"
  location            = var.location
  resource_group_name = var.resource_group_name

  tags = {
    Name        = "${var.project_name}-ddos-protection"
    Environment = var.environment
  }
}
```

## Step 2: Enable DDoS Protection on VNet

```hcl
resource "azurerm_virtual_network" "protected" {
  name                = "${var.project_name}-vnet"
  location            = var.location
  resource_group_name = var.resource_group_name
  address_space       = ["10.0.0.0/16"]

  # Enable DDoS protection
  ddos_protection_plan {
    id     = azurerm_network_ddos_protection_plan.main.id
    enable = true
  }

  tags = {
    Name = "${var.project_name}-protected-vnet"
  }
}
```

## Step 3: Public IP Resources to Protect

```hcl
# Public IP resources associated with resources in the protected VNet are automatically covered

resource "azurerm_public_ip" "app_gateway" {
  name                = "${var.project_name}-agw-pip"
  location            = var.location
  resource_group_name = var.resource_group_name
  allocation_method   = "Static"
  sku                 = "Standard"  # Use Standard SKU for new public IPs
}

resource "azurerm_public_ip" "load_balancer" {
  name                = "${var.project_name}-lb-pip"
  location            = var.location
  resource_group_name = var.resource_group_name
  allocation_method   = "Static"
  sku                 = "Standard"
}
```

## Step 4: DDoS Attack Alerts

```hcl
resource "azurerm_monitor_metric_alert" "ddos_attack" {
  name                = "${var.project_name}-ddos-attack-alert"
  resource_group_name = var.resource_group_name
  scopes              = [azurerm_public_ip.app_gateway.id]
  description         = "Alert when DDoS attack is detected"
  severity            = 0  # Critical

  criteria {
    metric_namespace = "Microsoft.Network/publicIPAddresses"
    metric_name      = "IfUnderDDoSAttack"
    aggregation      = "Maximum"
    operator         = "GreaterThan"
    threshold        = 0
  }

  action {
    action_group_id = var.critical_action_group_id
  }

  frequency   = "PT1M"
  window_size = "PT5M"
}

resource "azurerm_monitor_metric_alert" "ddos_packets_dropped" {
  name                = "${var.project_name}-ddos-packets-dropped"
  resource_group_name = var.resource_group_name
  scopes              = [azurerm_public_ip.app_gateway.id]
  description         = "Alert on DDoS packet drops"
  severity            = 2

  criteria {
    metric_namespace = "Microsoft.Network/publicIPAddresses"
    metric_name      = "PacketsDroppedDDoS"
    aggregation      = "Maximum"
    operator         = "GreaterThan"
    threshold        = 10000
  }

  action {
    action_group_id = var.warning_action_group_id
  }
}
```

## Step 5: DDoS Diagnostic Settings

```hcl
resource "azurerm_monitor_diagnostic_setting" "ddos_pip" {
  name               = "${var.project_name}-ddos-diagnostics"
  target_resource_id = azurerm_public_ip.app_gateway.id
  log_analytics_workspace_id = var.log_analytics_workspace_id

  enabled_log {
    category = "DDoSProtectionNotifications"
  }

  enabled_log {
    category = "DDoSMitigationFlowLogs"
  }

  enabled_log {
    category = "DDoSMitigationReports"
  }

  enabled_metric {
    category = "AllMetrics"
  }
}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply

# Check DDoS protection status on a public IP
az network public-ip show \
  --resource-group <rg> \
  --name <pip-name> \
  --query "ddosSettings"

# Check if an IP is under attack (during an attack)
az monitor metrics list \
  --resource <pip-id> \
  --metrics "IfUnderDDoSAttack" \
  --interval PT1M
```

## Conclusion

Azure DDoS Network Protection uses a shared pricing model, with one plan covering up to 100 protected IP addresses. For new deployments, use Standard SKU public IPs. DDoS IP Protection requires Standard SKU public IPs, while DDoS Network Protection protects public IP resources associated with linked VNets. Enable DDoS diagnostic logs, including mitigation flow logs and mitigation reports, for analysis during and after attacks. A single DDoS Protection plan can be shared across multiple subscriptions in the same tenant.
