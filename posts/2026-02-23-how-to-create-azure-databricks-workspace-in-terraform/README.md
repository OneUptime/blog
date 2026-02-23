# How to Create Azure Databricks Workspace in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Databricks, Data Engineering, Infrastructure as Code, Big Data

Description: Learn how to provision Azure Databricks workspaces with Terraform, including VNet injection, managed resource groups, cluster policies, and private connectivity.

---

Azure Databricks is a fast, collaborative Apache Spark-based analytics platform. It brings together data engineering, data science, and machine learning on a unified platform with a managed Spark environment, collaborative notebooks, and enterprise security features. Whether you are building ETL pipelines, training machine learning models, or running interactive analytics, Databricks on Azure gives you the compute power and tooling to do it at scale.

Provisioning Databricks workspaces through Terraform is particularly important because of the networking complexity involved. VNet injection, private link configurations, and managed resource group settings all need to be right from the start. Getting these wrong means tearing down and rebuilding, which is painful for a service that teams depend on daily.

## How Azure Databricks Works

When you create a Databricks workspace, Azure provisions several things behind the scenes:

- A managed resource group containing the workspace's infrastructure (VMs, disks, NSGs)
- A control plane in Microsoft's subscription that manages the workspace
- Network connectivity between the control plane and your data plane

You do not manage the Spark clusters directly in the Azure portal. Instead, you interact with them through the Databricks workspace UI or API. Terraform handles the workspace infrastructure, and optionally the Databricks provider can manage resources within the workspace itself.

## Prerequisites

- Terraform 1.3+
- Azure subscription with Contributor access
- Azure CLI authenticated

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

## Creating a Basic Databricks Workspace

```hcl
resource "azurerm_resource_group" "databricks" {
  name     = "rg-databricks-prod"
  location = "eastus"

  tags = {
    Environment = "Production"
    ManagedBy   = "Terraform"
  }
}

# Basic Databricks workspace
resource "azurerm_databricks_workspace" "main" {
  name                = "dbw-analytics-prod-001"
  location            = azurerm_resource_group.databricks.location
  resource_group_name = azurerm_resource_group.databricks.name

  # Pricing tier: standard or premium
  # Premium includes RBAC, audit logging, conditional access, and more
  sku = "premium"

  # Name for the managed resource group (Azure creates this automatically)
  managed_resource_group_name = "rg-databricks-managed-prod"

  tags = {
    Environment = "Production"
    Platform    = "Analytics"
  }
}
```

## Workspace with VNet Injection

VNet injection gives you control over the network configuration. This is required for most production deployments:

```hcl
# Virtual network for Databricks
resource "azurerm_virtual_network" "databricks" {
  name                = "vnet-databricks-prod"
  location            = azurerm_resource_group.databricks.location
  resource_group_name = azurerm_resource_group.databricks.name
  address_space       = ["10.0.0.0/16"]

  tags = {
    Environment = "Production"
  }
}

# Public subnet for Databricks (required even with private link)
resource "azurerm_subnet" "databricks_public" {
  name                 = "snet-databricks-public"
  resource_group_name  = azurerm_resource_group.databricks.name
  virtual_network_name = azurerm_virtual_network.databricks.name
  address_prefixes     = ["10.0.1.0/24"]

  delegation {
    name = "databricks-delegation"
    service_delegation {
      name = "Microsoft.Databricks/workspaces"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/join/action",
        "Microsoft.Network/virtualNetworks/subnets/prepareNetworkPolicies/action",
        "Microsoft.Network/virtualNetworks/subnets/unprepareNetworkPolicies/action",
      ]
    }
  }
}

# Private subnet for Databricks
resource "azurerm_subnet" "databricks_private" {
  name                 = "snet-databricks-private"
  resource_group_name  = azurerm_resource_group.databricks.name
  virtual_network_name = azurerm_virtual_network.databricks.name
  address_prefixes     = ["10.0.2.0/24"]

  delegation {
    name = "databricks-delegation"
    service_delegation {
      name = "Microsoft.Databricks/workspaces"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/join/action",
        "Microsoft.Network/virtualNetworks/subnets/prepareNetworkPolicies/action",
        "Microsoft.Network/virtualNetworks/subnets/unprepareNetworkPolicies/action",
      ]
    }
  }
}

# NSG for Databricks subnets
resource "azurerm_network_security_group" "databricks" {
  name                = "nsg-databricks-prod"
  location            = azurerm_resource_group.databricks.location
  resource_group_name = azurerm_resource_group.databricks.name

  tags = {
    Environment = "Production"
  }
}

# Associate NSG with both subnets
resource "azurerm_subnet_network_security_group_association" "public" {
  subnet_id                 = azurerm_subnet.databricks_public.id
  network_security_group_id = azurerm_network_security_group.databricks.id
}

resource "azurerm_subnet_network_security_group_association" "private" {
  subnet_id                 = azurerm_subnet.databricks_private.id
  network_security_group_id = azurerm_network_security_group.databricks.id
}

# Databricks workspace with VNet injection
resource "azurerm_databricks_workspace" "vnet_injected" {
  name                = "dbw-analytics-vnet-prod-001"
  location            = azurerm_resource_group.databricks.location
  resource_group_name = azurerm_resource_group.databricks.name
  sku                 = "premium"

  managed_resource_group_name = "rg-databricks-managed-vnet-prod"

  # VNet injection configuration
  custom_parameters {
    virtual_network_id                                   = azurerm_virtual_network.databricks.id
    public_subnet_name                                   = azurerm_subnet.databricks_public.name
    private_subnet_name                                  = azurerm_subnet.databricks_private.name
    public_subnet_network_security_group_association_id  = azurerm_subnet_network_security_group_association.public.id
    private_subnet_network_security_group_association_id = azurerm_subnet_network_security_group_association.private.id

    # Disable public IP for enhanced security (requires secure cluster connectivity)
    no_public_ip = true

    # Storage account configuration
    storage_account_name     = "dbstprod001"
    storage_account_sku_name = "Standard_LRS"
  }

  tags = {
    Environment = "Production"
    Networking  = "VNetInjected"
  }
}
```

## Private Link Configuration

For the highest level of network security, configure private endpoints:

```hcl
# Subnet for private endpoints
resource "azurerm_subnet" "private_endpoints" {
  name                 = "snet-private-endpoints"
  resource_group_name  = azurerm_resource_group.databricks.name
  virtual_network_name = azurerm_virtual_network.databricks.name
  address_prefixes     = ["10.0.3.0/24"]

  private_endpoint_network_policies_enabled = true
}

# Private DNS zone for Databricks
resource "azurerm_private_dns_zone" "databricks" {
  name                = "privatelink.azuredatabricks.net"
  resource_group_name = azurerm_resource_group.databricks.name
}

resource "azurerm_private_dns_zone_virtual_network_link" "databricks" {
  name                  = "databricks-dns-link"
  resource_group_name   = azurerm_resource_group.databricks.name
  private_dns_zone_name = azurerm_private_dns_zone.databricks.name
  virtual_network_id    = azurerm_virtual_network.databricks.id
}

# Private endpoint for the Databricks workspace (UI access)
resource "azurerm_private_endpoint" "databricks_ui" {
  name                = "pe-databricks-ui-prod"
  location            = azurerm_resource_group.databricks.location
  resource_group_name = azurerm_resource_group.databricks.name
  subnet_id           = azurerm_subnet.private_endpoints.id

  private_service_connection {
    name                           = "psc-databricks-ui"
    private_connection_resource_id = azurerm_databricks_workspace.vnet_injected.id
    subresource_names              = ["databricks_ui_api"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "databricks-dns-group"
    private_dns_zone_ids = [azurerm_private_dns_zone.databricks.id]
  }
}

# Private endpoint for browser authentication
resource "azurerm_private_endpoint" "databricks_auth" {
  name                = "pe-databricks-auth-prod"
  location            = azurerm_resource_group.databricks.location
  resource_group_name = azurerm_resource_group.databricks.name
  subnet_id           = azurerm_subnet.private_endpoints.id

  private_service_connection {
    name                           = "psc-databricks-auth"
    private_connection_resource_id = azurerm_databricks_workspace.vnet_injected.id
    subresource_names              = ["browser_authentication"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "databricks-auth-dns-group"
    private_dns_zone_ids = [azurerm_private_dns_zone.databricks.id]
  }
}
```

## Diagnostic Settings

```hcl
# Log Analytics workspace for Databricks monitoring
resource "azurerm_log_analytics_workspace" "databricks" {
  name                = "law-databricks-prod"
  location            = azurerm_resource_group.databricks.location
  resource_group_name = azurerm_resource_group.databricks.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
}

# Send Databricks diagnostic logs to Log Analytics
resource "azurerm_monitor_diagnostic_setting" "databricks" {
  name                       = "diag-databricks-to-law"
  target_resource_id         = azurerm_databricks_workspace.vnet_injected.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.databricks.id

  enabled_log {
    category = "accounts"
  }

  enabled_log {
    category = "clusters"
  }

  enabled_log {
    category = "notebook"
  }

  enabled_log {
    category = "jobs"
  }

  enabled_log {
    category = "workspace"
  }

  enabled_log {
    category = "dbfs"
  }

  enabled_log {
    category = "ssh"
  }
}
```

## Using the Databricks Terraform Provider

Once the workspace is created with azurerm, you can use the dedicated Databricks provider to manage resources inside the workspace:

```hcl
# Add the Databricks provider
terraform {
  required_providers {
    databricks = {
      source  = "databricks/databricks"
      version = "~> 1.30"
    }
  }
}

# Configure the Databricks provider to use the workspace
provider "databricks" {
  host                        = azurerm_databricks_workspace.vnet_injected.workspace_url
  azure_workspace_resource_id = azurerm_databricks_workspace.vnet_injected.id
}

# Create a cluster policy to control what users can provision
resource "databricks_cluster_policy" "standard" {
  name = "Standard Cluster Policy"

  definition = jsonencode({
    "spark_version" : {
      "type" : "allowlist",
      "values" : ["13.3.x-scala2.12", "14.3.x-scala2.12"]
    },
    "node_type_id" : {
      "type" : "allowlist",
      "values" : ["Standard_DS3_v2", "Standard_DS4_v2", "Standard_DS5_v2"]
    },
    "autotermination_minutes" : {
      "type" : "range",
      "maxValue" : 120,
      "defaultValue" : 60
    },
    "num_workers" : {
      "type" : "range",
      "minValue" : 1,
      "maxValue" : 10,
      "defaultValue" : 2
    }
  })
}

# Create a shared cluster
resource "databricks_cluster" "shared" {
  cluster_name            = "shared-analytics"
  spark_version           = "14.3.x-scala2.12"
  node_type_id            = "Standard_DS3_v2"
  autotermination_minutes = 60
  policy_id               = databricks_cluster_policy.standard.id

  autoscale {
    min_workers = 1
    max_workers = 5
  }

  spark_conf = {
    "spark.databricks.delta.preview.enabled" = "true"
  }

  custom_tags = {
    Environment = "Production"
    Team        = "DataEngineering"
  }
}
```

## Outputs

```hcl
output "workspace_url" {
  description = "Databricks workspace URL"
  value       = azurerm_databricks_workspace.vnet_injected.workspace_url
}

output "workspace_id" {
  description = "Databricks workspace resource ID"
  value       = azurerm_databricks_workspace.vnet_injected.id
}

output "managed_resource_group_id" {
  description = "ID of the managed resource group"
  value       = azurerm_databricks_workspace.vnet_injected.managed_resource_group_id
}
```

## Best Practices

**Always use Premium tier for production.** Premium includes features like role-based access control, audit logging, Azure Active Directory conditional access, and cluster policies that are essential for production governance.

**Enable VNet injection.** Running Databricks clusters in your own VNet gives you control over network security, allows connectivity to on-premises resources, and enables private link configurations.

**Use no_public_ip for secure cluster connectivity.** This prevents Databricks cluster nodes from getting public IP addresses, reducing your attack surface. All traffic goes through the Azure backbone.

**Implement cluster policies.** Without policies, users can spin up arbitrarily large clusters. Cluster policies let you control VM sizes, auto-termination settings, and maximum cluster sizes.

**Set auto-termination on all clusters.** Idle clusters are the biggest source of unnecessary Databricks costs. Always set auto-termination and keep it at 60 minutes or less.

**Use the Databricks provider for workspace resources.** The azurerm provider creates the workspace infrastructure. Use the databricks/databricks provider for managing clusters, notebooks, jobs, and other workspace-level resources.

## Conclusion

Azure Databricks workspaces with Terraform give you a reproducible way to provision complex analytics infrastructure. From basic workspaces to production-grade setups with VNet injection, private link, and cluster policies, Terraform handles the full lifecycle. The combination of the azurerm provider for infrastructure and the Databricks provider for workspace resources means you can manage everything as code.
