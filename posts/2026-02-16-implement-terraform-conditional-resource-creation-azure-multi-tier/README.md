# How to Implement Terraform Conditional Resource Creation for Azure Multi-Tier Architectures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Azure, Conditional Logic, Multi-Tier, Infrastructure as Code, DevOps, Architecture

Description: Implement conditional resource creation in Terraform for Azure multi-tier architectures where different environments need different resource configurations.

---

Not every environment needs the same infrastructure. Production might need a multi-tier setup with separate VNets, firewalls, and premium databases. Staging needs most of those components but at smaller sizes. Development might skip the firewall entirely and use basic-tier databases. Managing separate Terraform configurations for each tier is a maintenance burden. Conditional resource creation lets you use a single codebase that adapts based on variables.

This post covers the techniques for implementing conditional resource creation in Terraform, applied to practical Azure multi-tier architecture scenarios.

## The count Technique

The oldest and most common pattern for conditional resources uses `count` with a ternary expression. When `count = 0`, the resource is not created. When `count = 1`, it exists.

```hcl
# variables.tf
variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be development, staging, or production."
  }
}

variable "enable_firewall" {
  description = "Whether to deploy Azure Firewall"
  type        = bool
  default     = null  # Will be determined by environment if not explicitly set
}

# locals.tf
locals {
  # Derive feature flags from environment if not explicitly set
  is_production  = var.environment == "production"
  is_staging     = var.environment == "staging"
  is_development = var.environment == "development"

  # Feature flags with environment-based defaults
  deploy_firewall      = coalesce(var.enable_firewall, local.is_production)
  deploy_waf           = local.is_production || local.is_staging
  deploy_redis         = local.is_production || local.is_staging
  deploy_monitoring     = true  # Always deploy monitoring
  deploy_private_endpoints = local.is_production
}
```

## Conditional Firewall

Azure Firewall is expensive and typically only needed in production.

```hcl
# firewall.tf
# Azure Firewall - only deployed in production

# Firewall subnet (required even if we do not deploy the firewall,
# some orgs pre-create it)
resource "azurerm_subnet" "firewall" {
  count = local.deploy_firewall ? 1 : 0

  name                 = "AzureFirewallSubnet"  # Must be this exact name
  resource_group_name  = azurerm_resource_group.networking.name
  virtual_network_name = azurerm_virtual_network.hub.name
  address_prefixes     = ["10.0.3.0/26"]
}

resource "azurerm_public_ip" "firewall" {
  count = local.deploy_firewall ? 1 : 0

  name                = "pip-firewall-${var.environment}"
  location            = azurerm_resource_group.networking.location
  resource_group_name = azurerm_resource_group.networking.name
  allocation_method   = "Static"
  sku                 = "Standard"
}

resource "azurerm_firewall" "main" {
  count = local.deploy_firewall ? 1 : 0

  name                = "fw-hub-${var.environment}"
  location            = azurerm_resource_group.networking.location
  resource_group_name = azurerm_resource_group.networking.name
  sku_name            = "AZFW_VNet"
  sku_tier            = "Standard"

  ip_configuration {
    name                 = "configuration"
    subnet_id            = azurerm_subnet.firewall[0].id
    public_ip_address_id = azurerm_public_ip.firewall[0].id
  }
}

# Firewall rules - only created when firewall exists
resource "azurerm_firewall_network_rule_collection" "allow_outbound" {
  count = local.deploy_firewall ? 1 : 0

  name                = "allow-outbound"
  azure_firewall_name = azurerm_firewall.main[0].name
  resource_group_name = azurerm_resource_group.networking.name
  priority            = 100
  action              = "Allow"

  rule {
    name                  = "allow-https"
    source_addresses      = ["10.0.0.0/16"]
    destination_addresses = ["*"]
    destination_ports     = ["443"]
    protocols             = ["TCP"]
  }
}
```

Note how every reference to a conditional resource uses `[0]` index. This is because `count` creates a list, and you need to access the first (and only) element.

## Conditional Database Tiers

Different environments need different database sizes and features.

```hcl
# database.tf
# Database configuration that adapts to the environment

locals {
  # Database SKU mapping per environment
  db_config = {
    production = {
      sku_name     = "P2"
      max_size_gb  = 500
      zone_redundant = true
      backup_retention_days = 35
      geo_redundant_backup  = true
    }
    staging = {
      sku_name     = "S2"
      max_size_gb  = 50
      zone_redundant = false
      backup_retention_days = 14
      geo_redundant_backup  = false
    }
    development = {
      sku_name     = "Basic"
      max_size_gb  = 2
      zone_redundant = false
      backup_retention_days = 7
      geo_redundant_backup  = false
    }
  }

  # Select the right config for current environment
  current_db_config = local.db_config[var.environment]
}

resource "azurerm_mssql_database" "app" {
  name      = "db-app-${var.environment}"
  server_id = azurerm_mssql_server.main.id

  # Dynamic SKU based on environment
  sku_name  = local.current_db_config.sku_name
  max_size_gb = local.current_db_config.max_size_gb
  zone_redundant = local.current_db_config.zone_redundant

  # Conditional backup configuration
  short_term_retention_policy {
    retention_days = local.current_db_config.backup_retention_days
  }

  long_term_retention_policy {
    weekly_retention  = local.is_production ? "P4W" : null
    monthly_retention = local.is_production ? "P12M" : null
    yearly_retention  = local.is_production ? "P5Y" : null
  }

  # Lifecycle protection only for production
  lifecycle {
    prevent_destroy = false  # Cannot use variables here, see below
  }
}

# Read replica - only in production
resource "azurerm_mssql_database" "read_replica" {
  count = local.is_production ? 1 : 0

  name                        = "db-app-${var.environment}-replica"
  server_id                   = azurerm_mssql_server.secondary[0].id
  create_mode                 = "Secondary"
  creation_source_database_id = azurerm_mssql_database.app.id
  sku_name                    = "P2"
}
```

## Conditional Networking with for_each

The `for_each` approach is cleaner when you need to conditionally create sets of related resources.

```hcl
# networking.tf
# Conditional subnet creation based on environment

locals {
  # Define subnets per tier
  # Each environment gets different subnets
  subnets = merge(
    {
      # All environments get these subnets
      "web" = {
        address_prefix = "10.0.1.0/24"
        service_endpoints = ["Microsoft.Sql", "Microsoft.Storage"]
      }
      "api" = {
        address_prefix = "10.0.2.0/24"
        service_endpoints = ["Microsoft.Sql", "Microsoft.Storage", "Microsoft.KeyVault"]
      }
    },
    # Production and staging get a dedicated data subnet
    local.is_production || local.is_staging ? {
      "data" = {
        address_prefix = "10.0.3.0/24"
        service_endpoints = ["Microsoft.Sql"]
      }
    } : {},
    # Only production gets a management subnet
    local.is_production ? {
      "management" = {
        address_prefix = "10.0.4.0/24"
        service_endpoints = []
      }
    } : {}
  )
}

resource "azurerm_subnet" "tiers" {
  for_each = local.subnets

  name                 = "snet-${each.key}-${var.environment}"
  resource_group_name  = azurerm_resource_group.networking.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [each.value.address_prefix]
  service_endpoints    = each.value.service_endpoints
}

# NSG per subnet
resource "azurerm_network_security_group" "tiers" {
  for_each = local.subnets

  name                = "nsg-${each.key}-${var.environment}"
  location            = azurerm_resource_group.networking.location
  resource_group_name = azurerm_resource_group.networking.name
}

resource "azurerm_subnet_network_security_group_association" "tiers" {
  for_each = local.subnets

  subnet_id                 = azurerm_subnet.tiers[each.key].id
  network_security_group_id = azurerm_network_security_group.tiers[each.key].id
}
```

## Conditional WAF and Application Gateway

The Web Application Firewall is another production-specific resource.

```hcl
# waf.tf
# Application Gateway with WAF - staging and production only

resource "azurerm_application_gateway" "main" {
  count = local.deploy_waf ? 1 : 0

  name                = "agw-app-${var.environment}"
  location            = azurerm_resource_group.networking.location
  resource_group_name = azurerm_resource_group.networking.name

  sku {
    # Production gets WAF_v2, staging gets Standard_v2
    name     = local.is_production ? "WAF_v2" : "Standard_v2"
    tier     = local.is_production ? "WAF_v2" : "Standard_v2"
    capacity = local.is_production ? 2 : 1
  }

  gateway_ip_configuration {
    name      = "gateway-ip"
    subnet_id = azurerm_subnet.tiers["web"].id
  }

  frontend_port {
    name = "https"
    port = 443
  }

  frontend_ip_configuration {
    name                 = "frontend"
    public_ip_address_id = azurerm_public_ip.app_gateway[0].id
  }

  backend_address_pool {
    name = "api-backend"
  }

  backend_http_settings {
    name                  = "api-settings"
    cookie_based_affinity = "Disabled"
    port                  = 443
    protocol              = "Https"
    request_timeout       = 30
  }

  http_listener {
    name                           = "https-listener"
    frontend_ip_configuration_name = "frontend"
    frontend_port_name             = "https"
    protocol                       = "Https"
    ssl_certificate_name           = "app-cert"
  }

  request_routing_rule {
    name                       = "api-routing"
    priority                   = 100
    rule_type                  = "Basic"
    http_listener_name         = "https-listener"
    backend_address_pool_name  = "api-backend"
    backend_http_settings_name = "api-settings"
  }

  ssl_certificate {
    name     = "app-cert"
    data     = var.ssl_certificate_data
    password = var.ssl_certificate_password
  }

  # WAF configuration - only for production
  dynamic "waf_configuration" {
    for_each = local.is_production ? [1] : []
    content {
      enabled          = true
      firewall_mode    = "Prevention"
      rule_set_type    = "OWASP"
      rule_set_version = "3.2"
    }
  }
}
```

## Conditional Redis Cache

```hcl
# redis.tf
# Redis cache for staging and production

resource "azurerm_redis_cache" "main" {
  count = local.deploy_redis ? 1 : 0

  name                = "redis-app-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  # Production gets Premium for clustering and persistence
  # Staging gets Standard
  capacity = local.is_production ? 1 : 0
  family   = local.is_production ? "P" : "C"
  sku_name = local.is_production ? "Premium" : "Standard"

  enable_non_ssl_port           = false
  minimum_tls_version           = "1.2"
  public_network_access_enabled = local.is_development

  redis_configuration {
    maxmemory_policy = "allkeys-lru"
  }
}
```

## Referencing Conditional Resources Safely

When other resources need to reference conditional resources, use conditional expressions to handle the case where they do not exist.

```hcl
# outputs.tf
# Safe references to conditional resources

output "firewall_private_ip" {
  description = "Private IP of the Azure Firewall (production only)"
  value       = local.deploy_firewall ? azurerm_firewall.main[0].ip_configuration[0].private_ip_address : "N/A"
}

output "redis_hostname" {
  description = "Redis hostname (staging and production only)"
  value       = local.deploy_redis ? azurerm_redis_cache.main[0].hostname : "N/A"
}

output "waf_public_ip" {
  description = "Application Gateway public IP"
  value       = local.deploy_waf ? azurerm_public_ip.app_gateway[0].ip_address : "N/A"
}

output "deployed_subnets" {
  description = "List of deployed subnet names"
  value       = [for name, subnet in azurerm_subnet.tiers : subnet.name]
}
```

## Using tfvars for Each Environment

Create environment-specific variable files for clean deployments.

```hcl
# environments/production.tfvars
environment      = "production"
enable_firewall  = true
```

```hcl
# environments/staging.tfvars
environment      = "staging"
enable_firewall  = false
```

```hcl
# environments/development.tfvars
environment      = "development"
enable_firewall  = false
```

Deploy with the appropriate file.

```bash
# Deploy production
terraform apply -var-file=environments/production.tfvars

# Deploy staging
terraform apply -var-file=environments/staging.tfvars
```

## Summary

Conditional resource creation in Terraform lets you manage multi-tier Azure architectures from a single codebase. The key techniques are `count` for simple on/off decisions, `for_each` with dynamic maps for sets of related resources, `dynamic` blocks for optional resource configuration, and locals for deriving feature flags from environment variables. This approach reduces code duplication, ensures consistency between environments, and makes it clear exactly what each tier includes. When someone asks "what does staging have that dev does not?", the answer is right there in the locals block.
