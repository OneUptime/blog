# How to Create Azure Spring Apps in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Spring Apps, Java, Infrastructure as Code, Microservices, Spring Boot

Description: Learn how to create and configure Azure Spring Apps with Terraform for deploying Java Spring Boot microservices with built-in service discovery and config management.

---

If your team builds with Java and Spring Boot, Azure Spring Apps (formerly Azure Spring Cloud) is a managed platform built specifically for your stack. It handles the infrastructure that Spring applications need - service discovery with Eureka, centralized configuration with Spring Cloud Config, and built-in monitoring with Application Insights. You deploy your JARs and Azure takes care of the rest.

This guide shows how to set up Azure Spring Apps with Terraform, deploy applications, configure custom domains, and integrate with other Azure services.

## Azure Spring Apps Plans

Azure Spring Apps comes in three tiers:

- **Basic**: Good for testing and development. Limited to 25 app instances and 500 MB of persistent storage.
- **Standard**: Production-ready with SLA, auto-scaling, and managed Spring Cloud components. Up to 500 app instances.
- **Enterprise**: Includes VMware Tanzu components like Build Service, Application Configuration Service, and Spring Cloud Gateway. Best for large organizations.

For this guide, we will focus on the Standard tier, which is what most production deployments use.

## Creating the Spring Apps Service

```hcl
# versions.tf
terraform {
  required_version = ">= 1.5.0"

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

# Resource group
resource "azurerm_resource_group" "spring" {
  name     = "rg-spring-prod-eastus"
  location = "East US"
}

# Application Insights for monitoring
resource "azurerm_application_insights" "spring" {
  name                = "ai-spring-prod"
  location            = azurerm_resource_group.spring.location
  resource_group_name = azurerm_resource_group.spring.name
  application_type    = "java"
}

# Azure Spring Apps service instance
resource "azurerm_spring_cloud_service" "main" {
  name                = "spring-prod-contoso"
  resource_group_name = azurerm_resource_group.spring.name
  location            = azurerm_resource_group.spring.location
  sku_name            = "S0"

  # Connect Application Insights for distributed tracing
  trace {
    connection_string = azurerm_application_insights.spring.connection_string
  }

  tags = {
    environment = "production"
    managed_by  = "terraform"
  }
}
```

## Deploying a Spring App

Create an app within the Spring Apps service:

```hcl
# Spring Cloud App
resource "azurerm_spring_cloud_app" "api" {
  name                = "api-service"
  resource_group_name = azurerm_resource_group.spring.name
  service_name        = azurerm_spring_cloud_service.main.name

  # Enable system-assigned managed identity
  identity {
    type = "SystemAssigned"
  }

  # HTTPS only
  is_public = true
  https_only = true

  # Persistent storage for file-based caching or logs
  persistent_disk {
    size_in_gb = 10
    mount_path = "/persistent"
  }
}

# Deploy a JAR to the app
resource "azurerm_spring_cloud_java_deployment" "api" {
  name                = "production"
  spring_cloud_app_id = azurerm_spring_cloud_app.api.id

  # Instance count and resource allocation
  instance_count = 2

  # JVM options
  jvm_options = "-Xms512m -Xmx1024m -XX:+UseG1GC"

  # Runtime version
  runtime_version = "Java_17"

  # Resource allocation per instance
  quota {
    cpu    = "2"
    memory = "4Gi"
  }

  # Environment variables
  environment_variables = {
    "SPRING_PROFILES_ACTIVE" = "production"
    "SERVER_PORT"            = "8080"
  }
}

# Set the active deployment
resource "azurerm_spring_cloud_active_deployment" "api" {
  spring_cloud_app_id = azurerm_spring_cloud_app.api.id
  deployment_name     = azurerm_spring_cloud_java_deployment.api.name
}
```

## Config Server Setup

Spring Cloud Config Server provides centralized configuration for all your apps. You can point it at a Git repository:

```hcl
# Config Server with Git backend
resource "azurerm_spring_cloud_configuration_service" "main" {
  name                    = "default"
  spring_cloud_service_id = azurerm_spring_cloud_service.main.id

  repository {
    name     = "app-config"
    uri      = "https://github.com/contoso/spring-config.git"
    label    = "main"
    patterns = ["api-service", "order-service"]

    # For private repos, use SSH key or HTTP basic auth
    # username = var.git_username
    # password = var.git_password
  }
}
```

## Service Registry

Spring Cloud Service Registry (Eureka) is built into Azure Spring Apps. Apps register automatically when they start. For service-to-service communication, apps use the service name:

```hcl
# Order service that calls the API service
resource "azurerm_spring_cloud_app" "order_service" {
  name                = "order-service"
  resource_group_name = azurerm_resource_group.spring.name
  service_name        = azurerm_spring_cloud_service.main.name

  identity {
    type = "SystemAssigned"
  }
}

resource "azurerm_spring_cloud_java_deployment" "order_service" {
  name                = "production"
  spring_cloud_app_id = azurerm_spring_cloud_app.order_service.id
  instance_count      = 2
  runtime_version     = "Java_17"

  quota {
    cpu    = "2"
    memory = "4Gi"
  }

  environment_variables = {
    "SPRING_PROFILES_ACTIVE" = "production"
    # The API service is accessible via its app name within Spring Apps
    "API_SERVICE_URL"        = "http://api-service"
  }
}
```

## Custom Domain

Add a custom domain to your Spring app:

```hcl
# Custom domain for the API
resource "azurerm_spring_cloud_custom_domain" "api" {
  name                = "api.contoso.com"
  spring_cloud_app_id = azurerm_spring_cloud_app.api.id

  # Optional: bind an SSL certificate
  certificate_name = azurerm_spring_cloud_certificate.api.name
}

# Import a certificate for the custom domain
resource "azurerm_spring_cloud_certificate" "api" {
  name                     = "cert-api-contoso"
  resource_group_name      = azurerm_resource_group.spring.name
  service_name             = azurerm_spring_cloud_service.main.name
  key_vault_certificate_id = azurerm_key_vault_certificate.api.id
}
```

## VNet Integration

For production deployments, deploy Spring Apps into a VNet:

```hcl
# VNet for Spring Apps
resource "azurerm_virtual_network" "spring" {
  name                = "vnet-spring-prod"
  location            = azurerm_resource_group.spring.location
  resource_group_name = azurerm_resource_group.spring.name
  address_space       = ["10.0.0.0/16"]
}

# Spring Apps runtime subnet
resource "azurerm_subnet" "spring_runtime" {
  name                 = "snet-spring-runtime"
  resource_group_name  = azurerm_resource_group.spring.name
  virtual_network_name = azurerm_virtual_network.spring.name
  address_prefixes     = ["10.0.0.0/24"]
}

# Spring Apps service subnet
resource "azurerm_subnet" "spring_service" {
  name                 = "snet-spring-service"
  resource_group_name  = azurerm_resource_group.spring.name
  virtual_network_name = azurerm_virtual_network.spring.name
  address_prefixes     = ["10.0.1.0/24"]
}

# Spring Apps with VNet injection
resource "azurerm_spring_cloud_service" "main" {
  name                = "spring-prod-contoso"
  resource_group_name = azurerm_resource_group.spring.name
  location            = azurerm_resource_group.spring.location
  sku_name            = "S0"

  network {
    app_subnet_id             = azurerm_subnet.spring_runtime.id
    service_runtime_subnet_id = azurerm_subnet.spring_service.id
    cidr_ranges               = ["10.0.2.0/24", "10.0.3.0/24", "10.0.4.0/28"]
  }

  trace {
    connection_string = azurerm_application_insights.spring.connection_string
  }
}
```

The VNet injection requires specific CIDR ranges for Spring Apps internal networking. These ranges must not overlap with any existing subnets in the VNet.

## Blue-Green Deployment

Azure Spring Apps supports multiple deployments per app for zero-downtime releases:

```hcl
# Staging deployment for blue-green deployments
resource "azurerm_spring_cloud_java_deployment" "api_staging" {
  name                = "staging"
  spring_cloud_app_id = azurerm_spring_cloud_app.api.id
  instance_count      = 2
  runtime_version     = "Java_17"

  quota {
    cpu    = "2"
    memory = "4Gi"
  }

  environment_variables = {
    "SPRING_PROFILES_ACTIVE" = "staging"
  }
}

# Switch traffic to staging when ready
# Update the active deployment to swap
resource "azurerm_spring_cloud_active_deployment" "api" {
  spring_cloud_app_id = azurerm_spring_cloud_app.api.id
  # Change from "production" to "staging" to swap
  deployment_name     = azurerm_spring_cloud_java_deployment.api.name
}
```

## Diagnostic Settings

```hcl
resource "azurerm_monitor_diagnostic_setting" "spring" {
  name                       = "diag-spring"
  target_resource_id         = azurerm_spring_cloud_service.main.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.central.id

  enabled_log {
    category = "ApplicationConsole"
  }

  enabled_log {
    category = "SystemLogs"
  }

  metric {
    category = "AllMetrics"
  }
}
```

## Outputs

```hcl
output "spring_apps_url" {
  description = "URL of the Spring Apps service"
  value       = "https://${azurerm_spring_cloud_service.main.name}.azuremicroservices.io"
}

output "api_url" {
  description = "URL of the API app"
  value       = azurerm_spring_cloud_app.api.url
}

output "service_registry_enabled" {
  description = "Whether service registry is enabled"
  value       = true
}
```

## Best Practices

**Use Java 17 or later.** Older Java versions are being phased out. Spring Boot 3.x requires Java 17 as a minimum.

**Configure JVM options.** The default JVM settings are generic. Tune heap size and garbage collector based on your application's memory profile.

**Use Application Insights.** The built-in integration gives you distributed tracing, performance monitoring, and log aggregation with no code changes.

**Deploy to a VNet for production.** VNet injection keeps your Spring Apps traffic private and lets your apps access other private Azure resources.

**Use Config Server.** Centralized configuration through Spring Cloud Config Server is much better than managing environment variables per app.

## Wrapping Up

Azure Spring Apps with Terraform gives Java teams a managed platform that understands Spring Boot's ecosystem. Service discovery, centralized configuration, and distributed tracing work out of the box. Terraform handles the infrastructure provisioning, while your Spring Boot applications deploy as JAR files without needing Docker images or Kubernetes manifests. It is the fastest path from Spring Boot code to a running production environment.
