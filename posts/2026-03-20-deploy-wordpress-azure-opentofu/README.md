# How to Deploy a WordPress Site with OpenTofu on Azure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, WordPress, Azure, App Service, MySQL, Infrastructure as Code

Description: Learn how to deploy a production-ready WordPress site on Azure using OpenTofu, with App Service for compute, Azure Database for MySQL, and Azure Files for shared storage.

## Introduction

Deploying WordPress on Azure with OpenTofu uses Azure App Service for managed hosting, Azure Database for MySQL Flexible Server for the database, and Azure Files for shared WordPress content. This combination provides a fully managed, scalable platform with minimal operational overhead.

Resource Group and Networking

```hcl
resource "azurerm_resource_group" "wordpress" {
  name     = "wordpress-${var.environment}-rg"
  location = var.location
}

resource "azurerm_virtual_network" "wordpress" {
  name                = "wordpress-vnet"
  resource_group_name = azurerm_resource_group.wordpress.name
  location            = azurerm_resource_group.wordpress.location
  address_space       = ["10.0.0.0/16"]
}

resource "azurerm_subnet" "app" {
  name                 = "app-subnet"
  resource_group_name  = azurerm_resource_group.wordpress.name
  virtual_network_name = azurerm_virtual_network.wordpress.name
  address_prefixes     = ["10.0.1.0/24"]

  delegation {
    name = "app-service-delegation"
    service_delegation {
      name    = "Microsoft.Web/serverFarms"
      actions = ["Microsoft.Network/virtualNetworks/subnets/action"]
    }
  }
}
```

## Azure Database for MySQL Flexible Server

```hcl
resource "azurerm_mysql_flexible_server" "wordpress" {
  name                   = "wordpress-${var.environment}-mysql"
  resource_group_name    = azurerm_resource_group.wordpress.name
  location               = azurerm_resource_group.wordpress.location
  administrator_login    = "wpadmin"
  administrator_password = var.db_password
  sku_name               = "GP_Standard_D2ds_v4"
  version                = "8.4"
  public_network_access  = "Enabled"

  storage {
    size_gb = 20
  }

  backup_retention_days        = 7
  geo_redundant_backup_enabled = false

  lifecycle {
    prevent_destroy = true
  }
}

resource "azurerm_mysql_flexible_database" "wordpress" {
  name                = "wordpress"
  resource_group_name = azurerm_resource_group.wordpress.name
  server_name         = azurerm_mysql_flexible_server.wordpress.name
  charset             = "utf8mb4"
  collation           = "utf8mb4_unicode_ci"
}

resource "azurerm_mysql_flexible_server_firewall_rule" "azure_services" {
  name                = "allow-azure-services"
  resource_group_name = azurerm_resource_group.wordpress.name
  server_name         = azurerm_mysql_flexible_server.wordpress.name
  start_ip_address    = "0.0.0.0"
  end_ip_address      = "0.0.0.0"
}
```

## App Service Plan and Web App

```hcl
resource "azurerm_service_plan" "wordpress" {
  name                = "wordpress-${var.environment}-plan"
  resource_group_name = azurerm_resource_group.wordpress.name
  location            = azurerm_resource_group.wordpress.location
  os_type             = "Linux"
  sku_name            = "P1v3"
}

resource "azurerm_linux_web_app" "wordpress" {
  name                = "wordpress-${var.environment}-app"
  resource_group_name = azurerm_resource_group.wordpress.name
  location            = azurerm_resource_group.wordpress.location
  service_plan_id     = azurerm_service_plan.wordpress.id
  virtual_network_subnet_id = azurerm_subnet.app.id

  site_config {
    application_stack {
      docker_image_name = "wordpress:6.9.4-php8.3-apache"
      docker_registry_url = "https://index.docker.io"
    }
  }

  app_settings = {
    WORDPRESS_DB_HOST     = "${azurerm_mysql_flexible_server.wordpress.fqdn}:3306"
    WORDPRESS_DB_NAME     = "wordpress"
    WORDPRESS_DB_USER     = "wpadmin"
    WORDPRESS_DB_PASSWORD = var.db_password
    WEBSITES_ENABLE_APP_SERVICE_STORAGE = "false"
  }

  storage_account {
    name         = "wp-content"
    type         = "AzureFiles"
    account_name = azurerm_storage_account.wordpress.name
    share_name   = azurerm_storage_share.wordpress.name
    access_key   = azurerm_storage_account.wordpress.primary_access_key
    mount_path   = "/var/www/html/wp-content"
  }

  identity {
    type = "SystemAssigned"
  }
}
```

## Azure Files for WordPress Content

```hcl
resource "azurerm_storage_account" "wordpress" {
  name                     = "wp${var.environment}storage"
  resource_group_name      = azurerm_resource_group.wordpress.name
  location                 = azurerm_resource_group.wordpress.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_storage_share" "wordpress" {
  name               = "wp-content"
  storage_account_id = azurerm_storage_account.wordpress.id
  quota              = 100
}
```

## Azure Front Door for Performance

```hcl
resource "azurerm_cdn_frontdoor_profile" "wordpress" {
  name                = "wordpress-${var.environment}-fd"
  resource_group_name = azurerm_resource_group.wordpress.name
  sku_name            = "Standard_AzureFrontDoor"
}

resource "azurerm_cdn_frontdoor_endpoint" "wordpress" {
  name                     = "wordpress-${var.environment}"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.wordpress.id
}

resource "azurerm_cdn_frontdoor_origin_group" "wordpress" {
  name                     = "wordpress-origin-group"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.wordpress.id

  load_balancing {}
}

resource "azurerm_cdn_frontdoor_origin" "wordpress" {
  name                          = "wordpress-origin"
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.wordpress.id
  host_name                     = azurerm_linux_web_app.wordpress.default_hostname
  origin_host_header            = azurerm_linux_web_app.wordpress.default_hostname
  certificate_name_check_enabled = true
}

resource "azurerm_cdn_frontdoor_route" "wordpress" {
  name                          = "wordpress-route"
  cdn_frontdoor_endpoint_id     = azurerm_cdn_frontdoor_endpoint.wordpress.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.wordpress.id
  cdn_frontdoor_origin_ids      = [azurerm_cdn_frontdoor_origin.wordpress.id]
  patterns_to_match             = ["/*"]
  supported_protocols           = ["Http", "Https"]
  forwarding_protocol           = "HttpsOnly"
  https_redirect_enabled        = true
  link_to_default_domain        = true
}
```

## Outputs

```hcl
output "wordpress_url" {
  value       = "https://${azurerm_linux_web_app.wordpress.default_hostname}"
  description = "WordPress site URL"
}

output "frontdoor_url" {
  value       = "https://${azurerm_cdn_frontdoor_endpoint.wordpress.host_name}"
  description = "Front Door endpoint URL"
}
```

## Summary

Deploying WordPress on Azure with OpenTofu uses Azure App Service with Docker for containerized hosting, Azure Database for MySQL Flexible Server for managed database, Azure Files mounted into the web app for shared `wp-content` storage, and Azure Front Door Standard for global content delivery. For production, store the database password in Azure Key Vault, grant the web app's managed identity access to the secret, and then use an App Service Key Vault reference instead of setting the password directly in app settings.
