# How to Create Azure Network Security Groups in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, NSG, Network Security, Firewall Rules, Infrastructure as Code

Description: Learn how to create and manage Azure Network Security Groups with Terraform, including inbound and outbound rules, subnet associations, and application security groups.

---

Azure Network Security Groups (NSGs) act as virtual firewalls for your resources. They contain rules that allow or deny network traffic based on source, destination, port, and protocol. Every subnet and network interface in Azure can have an NSG attached, giving you fine-grained control over what traffic flows where.

Managing NSGs through Terraform is essential because security rules tend to grow organically. Without infrastructure as code, you end up with NSGs full of rules that nobody remembers adding and nobody wants to remove. Terraform keeps your security rules auditable and reviewable. This guide covers creating NSGs, defining rules, associating them with subnets, and using application security groups for cleaner configurations.

## Prerequisites

- Terraform 1.0 or later
- Azure CLI authenticated
- An existing VNet and subnets (or create them alongside the NSGs)

## Provider Configuration

```hcl
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

# Reference an existing resource group
data "azurerm_resource_group" "networking" {
  name = "rg-networking-prod-eus"
}
```

## Creating a Basic NSG

```hcl
# Network Security Group for the web tier
resource "azurerm_network_security_group" "web" {
  name                = "nsg-web-prod"
  location            = data.azurerm_resource_group.networking.location
  resource_group_name = data.azurerm_resource_group.networking.name

  tags = {
    Environment = "production"
    Tier        = "web"
    ManagedBy   = "terraform"
  }
}
```

## Defining Security Rules

Rules can be defined inline within the NSG or as separate resources. Separate resources are better for complex configurations because they are easier to manage independently:

```hcl
# Allow HTTP from the internet
resource "azurerm_network_security_rule" "allow_http" {
  name                        = "Allow-HTTP-Inbound"
  priority                    = 100
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "80"
  source_address_prefix       = "Internet"
  destination_address_prefix  = "*"
  resource_group_name         = data.azurerm_resource_group.networking.name
  network_security_group_name = azurerm_network_security_group.web.name
}

# Allow HTTPS from the internet
resource "azurerm_network_security_rule" "allow_https" {
  name                        = "Allow-HTTPS-Inbound"
  priority                    = 110
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "443"
  source_address_prefix       = "Internet"
  destination_address_prefix  = "*"
  resource_group_name         = data.azurerm_resource_group.networking.name
  network_security_group_name = azurerm_network_security_group.web.name
}

# Allow SSH from a specific IP range (management access)
resource "azurerm_network_security_rule" "allow_ssh" {
  name                        = "Allow-SSH-Management"
  priority                    = 200
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "22"
  source_address_prefix       = "10.0.255.0/24"
  destination_address_prefix  = "*"
  resource_group_name         = data.azurerm_resource_group.networking.name
  network_security_group_name = azurerm_network_security_group.web.name
}

# Deny all other inbound traffic (explicit deny)
resource "azurerm_network_security_rule" "deny_all_inbound" {
  name                        = "Deny-All-Inbound"
  priority                    = 4096
  direction                   = "Inbound"
  access                      = "Deny"
  protocol                    = "*"
  source_port_range           = "*"
  destination_port_range      = "*"
  source_address_prefix       = "*"
  destination_address_prefix  = "*"
  resource_group_name         = data.azurerm_resource_group.networking.name
  network_security_group_name = azurerm_network_security_group.web.name
}
```

## NSG with Inline Rules

For simpler NSGs, inline rules keep everything in one block:

```hcl
# Application tier NSG with inline rules
resource "azurerm_network_security_group" "app" {
  name                = "nsg-app-prod"
  location            = data.azurerm_resource_group.networking.location
  resource_group_name = data.azurerm_resource_group.networking.name

  # Allow traffic from web tier on port 8080
  security_rule {
    name                       = "Allow-Web-To-App"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "8080"
    source_address_prefix      = "10.0.1.0/24"
    destination_address_prefix = "*"
  }

  # Allow health check probes from Azure Load Balancer
  security_rule {
    name                       = "Allow-LB-Probes"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "8080"
    source_address_prefix      = "AzureLoadBalancer"
    destination_address_prefix = "*"
  }

  # Deny all other inbound
  security_rule {
    name                       = "Deny-All-Inbound"
    priority                   = 4096
    direction                  = "Inbound"
    access                     = "Deny"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  tags = {
    Environment = "production"
    Tier        = "application"
  }
}
```

## Associating NSGs with Subnets

NSGs only take effect when associated with a subnet or network interface:

```hcl
# Reference the existing VNet and subnets
data "azurerm_virtual_network" "main" {
  name                = "vnet-main-prod-eus"
  resource_group_name = data.azurerm_resource_group.networking.name
}

data "azurerm_subnet" "web" {
  name                 = "snet-web"
  virtual_network_name = data.azurerm_virtual_network.main.name
  resource_group_name  = data.azurerm_resource_group.networking.name
}

data "azurerm_subnet" "app" {
  name                 = "snet-app"
  virtual_network_name = data.azurerm_virtual_network.main.name
  resource_group_name  = data.azurerm_resource_group.networking.name
}

# Associate NSG with web subnet
resource "azurerm_subnet_network_security_group_association" "web" {
  subnet_id                 = data.azurerm_subnet.web.id
  network_security_group_id = azurerm_network_security_group.web.id
}

# Associate NSG with app subnet
resource "azurerm_subnet_network_security_group_association" "app" {
  subnet_id                 = data.azurerm_subnet.app.id
  network_security_group_id = azurerm_network_security_group.app.id
}
```

## Application Security Groups

Application Security Groups (ASGs) let you group VMs logically and reference them in NSG rules instead of using IP addresses. This makes rules cleaner and more maintainable:

```hcl
# ASG for web servers
resource "azurerm_application_security_group" "web_servers" {
  name                = "asg-web-servers"
  location            = data.azurerm_resource_group.networking.location
  resource_group_name = data.azurerm_resource_group.networking.name

  tags = {
    Role = "web"
  }
}

# ASG for app servers
resource "azurerm_application_security_group" "app_servers" {
  name                = "asg-app-servers"
  location            = data.azurerm_resource_group.networking.location
  resource_group_name = data.azurerm_resource_group.networking.name

  tags = {
    Role = "application"
  }
}

# ASG for database servers
resource "azurerm_application_security_group" "db_servers" {
  name                = "asg-db-servers"
  location            = data.azurerm_resource_group.networking.location
  resource_group_name = data.azurerm_resource_group.networking.name

  tags = {
    Role = "database"
  }
}

# NSG rules using ASGs instead of IP addresses
resource "azurerm_network_security_group" "asg_based" {
  name                = "nsg-asg-rules"
  location            = data.azurerm_resource_group.networking.location
  resource_group_name = data.azurerm_resource_group.networking.name

  # Allow web to app communication
  security_rule {
    name                                       = "Allow-Web-To-App"
    priority                                   = 100
    direction                                  = "Inbound"
    access                                     = "Allow"
    protocol                                   = "Tcp"
    source_port_range                          = "*"
    destination_port_range                     = "8080"
    source_application_security_group_ids      = [azurerm_application_security_group.web_servers.id]
    destination_application_security_group_ids = [azurerm_application_security_group.app_servers.id]
  }

  # Allow app to database communication
  security_rule {
    name                                       = "Allow-App-To-DB"
    priority                                   = 110
    direction                                  = "Inbound"
    access                                     = "Allow"
    protocol                                   = "Tcp"
    source_port_range                          = "*"
    destination_port_ranges                    = ["3306", "5432"]
    source_application_security_group_ids      = [azurerm_application_security_group.app_servers.id]
    destination_application_security_group_ids = [azurerm_application_security_group.db_servers.id]
  }

  tags = {
    Environment = "production"
  }
}
```

## Dynamic Rules from a Variable

When you have many rules, define them in a variable and generate them dynamically:

```hcl
variable "nsg_rules" {
  description = "List of NSG rules"
  type = list(object({
    name                       = string
    priority                   = number
    direction                  = string
    access                     = string
    protocol                   = string
    source_port_range          = string
    destination_port_range     = string
    source_address_prefix      = string
    destination_address_prefix = string
  }))
  default = [
    {
      name                       = "Allow-HTTP"
      priority                   = 100
      direction                  = "Inbound"
      access                     = "Allow"
      protocol                   = "Tcp"
      source_port_range          = "*"
      destination_port_range     = "80"
      source_address_prefix      = "Internet"
      destination_address_prefix = "*"
    },
    {
      name                       = "Allow-HTTPS"
      priority                   = 110
      direction                  = "Inbound"
      access                     = "Allow"
      protocol                   = "Tcp"
      source_port_range          = "*"
      destination_port_range     = "443"
      source_address_prefix      = "Internet"
      destination_address_prefix = "*"
    },
    {
      name                       = "Allow-SSH-Bastion"
      priority                   = 200
      direction                  = "Inbound"
      access                     = "Allow"
      protocol                   = "Tcp"
      source_port_range          = "*"
      destination_port_range     = "22"
      source_address_prefix      = "10.0.255.0/24"
      destination_address_prefix = "*"
    }
  ]
}

# NSG with dynamic rules
resource "azurerm_network_security_group" "dynamic_rules" {
  name                = "nsg-dynamic-prod"
  location            = data.azurerm_resource_group.networking.location
  resource_group_name = data.azurerm_resource_group.networking.name

  dynamic "security_rule" {
    for_each = var.nsg_rules

    content {
      name                       = security_rule.value.name
      priority                   = security_rule.value.priority
      direction                  = security_rule.value.direction
      access                     = security_rule.value.access
      protocol                   = security_rule.value.protocol
      source_port_range          = security_rule.value.source_port_range
      destination_port_range     = security_rule.value.destination_port_range
      source_address_prefix      = security_rule.value.source_address_prefix
      destination_address_prefix = security_rule.value.destination_address_prefix
    }
  }

  tags = {
    Environment = "production"
  }
}
```

## NSG Flow Logs

Enable flow logs to capture traffic data for analysis and troubleshooting:

```hcl
# Storage account for flow logs
resource "azurerm_storage_account" "flow_logs" {
  name                     = "stflowlogsprodeus"
  resource_group_name      = data.azurerm_resource_group.networking.name
  location                 = data.azurerm_resource_group.networking.location
  account_tier             = "Standard"
  account_replication_type = "LRS"

  tags = {
    Purpose = "nsg-flow-logs"
  }
}

# Log Analytics workspace for flow log analysis
resource "azurerm_log_analytics_workspace" "networking" {
  name                = "law-networking-prod"
  location            = data.azurerm_resource_group.networking.location
  resource_group_name = data.azurerm_resource_group.networking.name
  sku                 = "PerGB2018"
  retention_in_days   = 30

  tags = {
    Purpose = "network-monitoring"
  }
}

# Network watcher (usually already exists in most subscriptions)
resource "azurerm_network_watcher" "main" {
  name                = "nw-prod-eastus"
  location            = data.azurerm_resource_group.networking.location
  resource_group_name = data.azurerm_resource_group.networking.name
}

# NSG flow log
resource "azurerm_network_watcher_flow_log" "web" {
  network_watcher_name = azurerm_network_watcher.main.name
  resource_group_name  = data.azurerm_resource_group.networking.name
  name                 = "flowlog-nsg-web"

  network_security_group_id = azurerm_network_security_group.web.id
  storage_account_id        = azurerm_storage_account.flow_logs.id
  enabled                   = true
  version                   = 2

  retention_policy {
    enabled = true
    days    = 30
  }

  traffic_analytics {
    enabled               = true
    workspace_id          = azurerm_log_analytics_workspace.networking.workspace_id
    workspace_region      = azurerm_log_analytics_workspace.networking.location
    workspace_resource_id = azurerm_log_analytics_workspace.networking.id
    interval_in_minutes   = 10
  }
}
```

## Outputs

```hcl
output "web_nsg_id" {
  description = "ID of the web tier NSG"
  value       = azurerm_network_security_group.web.id
}

output "app_nsg_id" {
  description = "ID of the app tier NSG"
  value       = azurerm_network_security_group.app.id
}

output "asg_ids" {
  description = "Application Security Group IDs"
  value = {
    web = azurerm_application_security_group.web_servers.id
    app = azurerm_application_security_group.app_servers.id
    db  = azurerm_application_security_group.db_servers.id
  }
}
```

## Monitoring Network Security

NSGs silently drop traffic when rules do not match. This can cause confusing connectivity issues if you are not watching. Use OneUptime to monitor your application endpoints and get alerted when connections fail. Correlating failed connection alerts with NSG flow logs quickly tells you whether a firewall rule is the culprit.

## Summary

Network Security Groups are your primary tool for controlling traffic in Azure. Define them in Terraform alongside your VNet and subnet configuration to keep your security posture version-controlled and reviewable. Use Application Security Groups instead of raw IP addresses when possible - they make rules more readable and easier to maintain as your infrastructure grows. And always enable flow logs on production NSGs so you have the data you need when troubleshooting connectivity issues.
