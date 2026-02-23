# How to Create Azure DDoS Protection Plan in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, DDoS Protection, Security, Infrastructure as Code, Networking

Description: Learn how to deploy Azure DDoS Protection plans with Terraform to defend your applications against distributed denial-of-service attacks with automatic mitigation.

---

Distributed Denial of Service (DDoS) attacks are one of the most common threats facing cloud applications. They flood your services with traffic, making them unavailable to legitimate users. Azure DDoS Protection defends against these attacks by monitoring traffic patterns and automatically mitigating volumetric, protocol, and application-layer attacks.

While Azure provides basic DDoS protection for free on all public IPs, the DDoS Protection plan (formerly known as DDoS Protection Standard) offers much more - adaptive tuning, attack analytics, cost protection guarantees, and rapid response team access. Deploying this through Terraform ensures your DDoS protection is consistently applied across all your virtual networks.

## DDoS Protection Tiers

Azure offers two levels of DDoS protection:

- **DDoS Infrastructure Protection (Basic)** - free, automatically enabled on all Azure services. Protects against common network-layer attacks. No configuration needed.
- **DDoS Network Protection (Standard)** - paid service that provides enhanced mitigation, application-specific tuning, attack telemetry, and cost protection. This is what we configure in Terraform.

The Standard tier monitors traffic patterns to your specific resources and automatically tunes detection thresholds. When an attack is detected, it mitigates the malicious traffic while allowing legitimate traffic through.

## Prerequisites

- Terraform 1.3+
- Azure subscription with Contributor access
- Azure CLI authenticated
- Important: DDoS Protection Standard costs approximately $2,944/month per plan, plus data processing charges. One plan can protect up to 100 virtual networks.

## Provider Configuration

```hcl
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
```

## Creating a DDoS Protection Plan

```hcl
resource "azurerm_resource_group" "security" {
  name     = "rg-ddos-protection-prod"
  location = "eastus"

  tags = {
    Environment = "Production"
    ManagedBy   = "Terraform"
  }
}

# Create the DDoS Protection plan
resource "azurerm_network_ddos_protection_plan" "main" {
  name                = "ddos-plan-prod-001"
  location            = azurerm_resource_group.security.location
  resource_group_name = azurerm_resource_group.security.name

  tags = {
    Environment = "Production"
    CostCenter  = "Security"
  }
}
```

## Associating the Plan with Virtual Networks

The DDoS Protection plan is linked at the virtual network level. Every public IP within a protected VNet gets DDoS protection automatically:

```hcl
# Hub virtual network with DDoS protection enabled
resource "azurerm_virtual_network" "hub" {
  name                = "vnet-hub-prod"
  location            = azurerm_resource_group.security.location
  resource_group_name = azurerm_resource_group.security.name
  address_space       = ["10.0.0.0/16"]

  # Associate the DDoS protection plan
  ddos_protection_plan {
    id     = azurerm_network_ddos_protection_plan.main.id
    enable = true
  }

  tags = {
    Environment = "Production"
    DDoSProtected = "true"
  }
}

# Spoke 1 - also protected
resource "azurerm_virtual_network" "spoke1" {
  name                = "vnet-spoke1-prod"
  location            = azurerm_resource_group.security.location
  resource_group_name = azurerm_resource_group.security.name
  address_space       = ["10.1.0.0/16"]

  ddos_protection_plan {
    id     = azurerm_network_ddos_protection_plan.main.id
    enable = true
  }

  tags = {
    Environment = "Production"
    DDoSProtected = "true"
  }
}

# Spoke 2 - also protected
resource "azurerm_virtual_network" "spoke2" {
  name                = "vnet-spoke2-prod"
  location            = "westus2"
  resource_group_name = azurerm_resource_group.security.name
  address_space       = ["10.2.0.0/16"]

  # Same plan works across regions
  ddos_protection_plan {
    id     = azurerm_network_ddos_protection_plan.main.id
    enable = true
  }

  tags = {
    Environment = "Production"
    DDoSProtected = "true"
  }
}
```

## Setting Up Resources That Benefit from DDoS Protection

Public IPs within protected VNets automatically receive DDoS Standard protection:

```hcl
# Subnet for web servers
resource "azurerm_subnet" "web" {
  name                 = "snet-web"
  resource_group_name  = azurerm_resource_group.security.name
  virtual_network_name = azurerm_virtual_network.hub.name
  address_prefixes     = ["10.0.1.0/24"]
}

# Public IP for the load balancer (automatically DDoS protected)
resource "azurerm_public_ip" "lb" {
  name                = "pip-lb-web-prod"
  location            = azurerm_resource_group.security.location
  resource_group_name = azurerm_resource_group.security.name
  allocation_method   = "Static"
  sku                 = "Standard"

  tags = {
    Environment = "Production"
  }
}

# Load balancer with public IP
resource "azurerm_lb" "web" {
  name                = "lb-web-prod"
  location            = azurerm_resource_group.security.location
  resource_group_name = azurerm_resource_group.security.name
  sku                 = "Standard"

  frontend_ip_configuration {
    name                 = "web-frontend"
    public_ip_address_id = azurerm_public_ip.lb.id
  }

  tags = {
    Environment = "Production"
  }
}

# Application Gateway with public IP (also DDoS protected)
resource "azurerm_public_ip" "appgw" {
  name                = "pip-appgw-prod"
  location            = azurerm_resource_group.security.location
  resource_group_name = azurerm_resource_group.security.name
  allocation_method   = "Static"
  sku                 = "Standard"

  tags = {
    Environment = "Production"
  }
}
```

## Monitoring and Alerts

DDoS Protection generates rich telemetry that you should monitor:

```hcl
# Log Analytics workspace for DDoS telemetry
resource "azurerm_log_analytics_workspace" "security" {
  name                = "law-ddos-prod"
  location            = azurerm_resource_group.security.location
  resource_group_name = azurerm_resource_group.security.name
  sku                 = "PerGB2018"
  retention_in_days   = 90
}

# Diagnostic settings for the public IP (DDoS metrics and logs)
resource "azurerm_monitor_diagnostic_setting" "ddos_lb" {
  name                       = "diag-ddos-lb-pip"
  target_resource_id         = azurerm_public_ip.lb.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.security.id

  enabled_log {
    category = "DDoSProtectionNotifications"
  }

  enabled_log {
    category = "DDoSMitigationFlowLogs"
  }

  enabled_log {
    category = "DDoSMitigationReports"
  }

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}

# Action group for DDoS alerts
resource "azurerm_monitor_action_group" "security_team" {
  name                = "ag-security-team"
  resource_group_name = azurerm_resource_group.security.name
  short_name          = "SecTeam"

  email_receiver {
    name          = "security-email"
    email_address = "security@example.com"
  }

  email_receiver {
    name          = "noc-email"
    email_address = "noc@example.com"
  }

  sms_receiver {
    name         = "oncall-sms"
    country_code = "1"
    phone_number = "5555555555"
  }
}

# Alert when a DDoS attack is detected
resource "azurerm_monitor_metric_alert" "ddos_attack" {
  name                = "alert-ddos-attack-detected"
  resource_group_name = azurerm_resource_group.security.name
  scopes              = [azurerm_public_ip.lb.id]
  description         = "Alert when DDoS attack is detected on the load balancer public IP"
  severity            = 0 # Critical
  frequency           = "PT1M"
  window_size         = "PT5M"

  criteria {
    metric_namespace = "Microsoft.Network/publicIPAddresses"
    metric_name      = "IfUnderDDoSAttack"
    aggregation      = "Maximum"
    operator         = "GreaterThan"
    threshold        = 0
  }

  action {
    action_group_id = azurerm_monitor_action_group.security_team.id
  }
}

# Alert on high inbound packet count (potential attack indicator)
resource "azurerm_monitor_metric_alert" "ddos_packets" {
  name                = "alert-ddos-high-packets"
  resource_group_name = azurerm_resource_group.security.name
  scopes              = [azurerm_public_ip.lb.id]
  description         = "Alert when inbound packets dropped by DDoS protection exceeds threshold"
  severity            = 1
  frequency           = "PT5M"
  window_size         = "PT15M"

  criteria {
    metric_namespace = "Microsoft.Network/publicIPAddresses"
    metric_name      = "PacketsDroppedDDoS"
    aggregation      = "Total"
    operator         = "GreaterThan"
    threshold        = 10000
  }

  action {
    action_group_id = azurerm_monitor_action_group.security_team.id
  }
}

# Alert on bytes dropped
resource "azurerm_monitor_metric_alert" "ddos_bytes" {
  name                = "alert-ddos-bytes-dropped"
  resource_group_name = azurerm_resource_group.security.name
  scopes              = [azurerm_public_ip.lb.id]
  description         = "Alert on high volume of bytes dropped by DDoS protection"
  severity            = 2
  frequency           = "PT5M"
  window_size         = "PT15M"

  criteria {
    metric_namespace = "Microsoft.Network/publicIPAddresses"
    metric_name      = "BytesDroppedDDoS"
    aggregation      = "Total"
    operator         = "GreaterThan"
    threshold        = 100000000 # 100 MB
  }

  action {
    action_group_id = azurerm_monitor_action_group.security_team.id
  }
}
```

## Using a Module for Consistent VNet Protection

When you have many VNets, a module helps ensure consistent protection:

```hcl
# modules/protected-vnet/variables.tf
variable "name" {
  type = string
}

variable "location" {
  type = string
}

variable "resource_group_name" {
  type = string
}

variable "address_space" {
  type = list(string)
}

variable "ddos_protection_plan_id" {
  type = string
}

variable "tags" {
  type    = map(string)
  default = {}
}
```

```hcl
# modules/protected-vnet/main.tf
resource "azurerm_virtual_network" "this" {
  name                = var.name
  location            = var.location
  resource_group_name = var.resource_group_name
  address_space       = var.address_space

  ddos_protection_plan {
    id     = var.ddos_protection_plan_id
    enable = true
  }

  tags = merge(var.tags, {
    DDoSProtected = "true"
  })
}
```

```hcl
# Root module - protect all production VNets
module "vnet_app" {
  source                  = "./modules/protected-vnet"
  name                    = "vnet-app-prod"
  location                = "eastus"
  resource_group_name     = azurerm_resource_group.security.name
  address_space           = ["10.10.0.0/16"]
  ddos_protection_plan_id = azurerm_network_ddos_protection_plan.main.id

  tags = { Environment = "Production", Workload = "Application" }
}

module "vnet_data" {
  source                  = "./modules/protected-vnet"
  name                    = "vnet-data-prod"
  location                = "eastus"
  resource_group_name     = azurerm_resource_group.security.name
  address_space           = ["10.11.0.0/16"]
  ddos_protection_plan_id = azurerm_network_ddos_protection_plan.main.id

  tags = { Environment = "Production", Workload = "Data" }
}
```

## Outputs

```hcl
output "ddos_protection_plan_id" {
  description = "DDoS Protection plan resource ID"
  value       = azurerm_network_ddos_protection_plan.main.id
}

output "protected_vnet_ids" {
  description = "IDs of protected virtual networks"
  value = {
    hub    = azurerm_virtual_network.hub.id
    spoke1 = azurerm_virtual_network.spoke1.id
    spoke2 = azurerm_virtual_network.spoke2.id
  }
}
```

## Best Practices

**Use one plan for all VNets.** A single DDoS Protection plan can cover up to 100 virtual networks across regions and subscriptions. You do not need separate plans per region or environment.

**Protect all production VNets.** Every VNet that has public-facing resources (load balancers, application gateways, VMs with public IPs) should be linked to the DDoS Protection plan.

**Set up alerts immediately.** The `IfUnderDDoSAttack` metric is the most important alert. When it fires, you know an attack is happening and mitigation is active. This should notify your security team and NOC.

**Enable diagnostic logging on public IPs.** DDoS flow logs and mitigation reports provide the details you need to understand attack patterns and verify that legitimate traffic was not affected.

**Consider the cost carefully.** At roughly $2,944/month plus data charges, DDoS Protection Standard is a significant cost. It makes sense for production workloads with public-facing services. For development environments, the built-in Infrastructure Protection is usually sufficient.

**Take advantage of cost protection.** DDoS Protection Standard includes a cost protection SLA. If you incur resource scaling costs due to a documented DDoS attack, Microsoft will credit those costs back.

## Conclusion

Azure DDoS Protection with Terraform provides automated defense against volumetric and protocol DDoS attacks. The setup is straightforward - create a plan, link it to your VNets, and configure monitoring. Terraform makes it simple to ensure consistent protection across all your virtual networks and to maintain the alerting configuration that keeps your team informed during an attack. Given the potential business impact of a DDoS attack, the protection plan is a worthwhile investment for any production environment with public-facing services.
