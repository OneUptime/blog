# How to Create Azure Container Apps in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Container Apps, Containers, Infrastructure as Code, Serverless, Microservices

Description: Learn how to create Azure Container Apps with Terraform for running containerized microservices with auto-scaling, traffic splitting, and Dapr integration.

---

Azure Container Apps sits in the sweet spot between Azure App Service and Azure Kubernetes Service. You get container-based deployment without managing Kubernetes clusters, along with features like auto-scaling, traffic splitting, and Dapr integration. If you want to run containers without the operational overhead of AKS, Container Apps is your best bet.

This guide covers creating Azure Container Apps environments and apps with Terraform, setting up ingress, configuring auto-scaling, and handling secrets.

## Architecture Overview

Azure Container Apps has two main resources:

- **Container Apps Environment**: The shared environment where your apps run. Think of it as the cluster. It provides networking, logging, and a shared Dapr configuration.
- **Container App**: An individual application running within the environment. Each app can have multiple containers, revisions, and scaling rules.

Multiple container apps share an environment, which means they can communicate with each other over the internal network and share Dapr components.

## Creating the Container Apps Environment

Start with the environment and its dependencies:

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
resource "azurerm_resource_group" "apps" {
  name     = "rg-containerapps-prod-eastus"
  location = "East US"
}

# Log Analytics workspace for container app logs
resource "azurerm_log_analytics_workspace" "apps" {
  name                = "law-containerapps-prod"
  location            = azurerm_resource_group.apps.location
  resource_group_name = azurerm_resource_group.apps.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
}

# Container Apps Environment
resource "azurerm_container_app_environment" "main" {
  name                       = "cae-prod-eastus"
  location                   = azurerm_resource_group.apps.location
  resource_group_name        = azurerm_resource_group.apps.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.apps.id

  tags = {
    environment = "production"
    managed_by  = "terraform"
  }
}
```

## Creating a Container App

Now deploy a container app into the environment:

```hcl
# A simple web API container app
resource "azurerm_container_app" "api" {
  name                         = "ca-api-prod"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.apps.name
  revision_mode                = "Single"

  template {
    # Main application container
    container {
      name   = "api"
      image  = "myregistry.azurecr.io/api:v1.0.0"
      cpu    = 0.5
      memory = "1Gi"

      # Environment variables
      env {
        name  = "ASPNETCORE_ENVIRONMENT"
        value = "Production"
      }

      env {
        name  = "LOG_LEVEL"
        value = "Information"
      }

      # Secret reference
      env {
        name        = "DATABASE_URL"
        secret_name = "database-url"
      }

      # Liveness probe
      liveness_probe {
        transport = "HTTP"
        path      = "/healthz"
        port      = 8080
      }

      # Readiness probe
      readiness_probe {
        transport = "HTTP"
        path      = "/ready"
        port      = 8080
      }
    }

    # Minimum and maximum replicas
    min_replicas = 1
    max_replicas = 10
  }

  # Ingress configuration
  ingress {
    external_enabled = true
    target_port      = 8080

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  # Secrets
  secret {
    name  = "database-url"
    value = var.database_url
  }

  tags = {
    application = "api"
    environment = "production"
  }
}
```

The `revision_mode` controls how new revisions are deployed:
- `Single`: New revisions immediately replace the old one
- `Multiple`: Multiple revisions can run simultaneously, allowing traffic splitting

## Using Azure Container Registry

Most production setups pull images from Azure Container Registry:

```hcl
# Azure Container Registry
resource "azurerm_container_registry" "main" {
  name                = "crprodcontoso"
  resource_group_name = azurerm_resource_group.apps.name
  location            = azurerm_resource_group.apps.location
  sku                 = "Standard"
  admin_enabled       = false
}

# Container app with ACR authentication using managed identity
resource "azurerm_container_app" "api" {
  name                         = "ca-api-prod"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.apps.name
  revision_mode                = "Single"

  # Use managed identity to pull images from ACR
  identity {
    type = "SystemAssigned"
  }

  registry {
    server   = azurerm_container_registry.main.login_server
    identity = "System"
  }

  template {
    container {
      name   = "api"
      image  = "${azurerm_container_registry.main.login_server}/api:v1.0.0"
      cpu    = 0.5
      memory = "1Gi"
    }
  }

  ingress {
    external_enabled = true
    target_port      = 8080

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }
}

# Grant the container app pull access to ACR
resource "azurerm_role_assignment" "acr_pull" {
  scope                = azurerm_container_registry.main.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_container_app.api.identity[0].principal_id
}
```

## Auto-Scaling Rules

Container Apps supports HTTP-based and custom scaling rules:

```hcl
resource "azurerm_container_app" "worker" {
  name                         = "ca-worker-prod"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.apps.name
  revision_mode                = "Single"

  template {
    container {
      name   = "worker"
      image  = "${azurerm_container_registry.main.login_server}/worker:v1.0.0"
      cpu    = 1.0
      memory = "2Gi"
    }

    min_replicas = 0
    max_replicas = 20

    # Scale based on Azure Service Bus queue depth
    custom_scale_rule {
      name             = "servicebus-queue"
      custom_rule_type = "azure-servicebus"
      metadata = {
        queueName    = "orders"
        messageCount = "10"
        namespace    = azurerm_servicebus_namespace.main.name
      }

      authentication {
        secret_name       = "servicebus-connection"
        trigger_parameter = "connection"
      }
    }

    # Scale based on HTTP concurrent requests
    http_scale_rule {
      name                = "http-scaling"
      concurrent_requests = "50"
    }
  }

  secret {
    name  = "servicebus-connection"
    value = azurerm_servicebus_namespace.main.default_primary_connection_string
  }
}
```

Setting `min_replicas = 0` means the app scales to zero when there is no load, saving costs. The trade-off is cold start latency when a new request comes in.

## Traffic Splitting

For blue-green or canary deployments, use multiple revisions with traffic weights:

```hcl
resource "azurerm_container_app" "api" {
  name                         = "ca-api-prod"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.apps.name

  # Multiple revision mode enables traffic splitting
  revision_mode = "Multiple"

  template {
    container {
      name   = "api"
      image  = "${azurerm_container_registry.main.login_server}/api:v2.0.0"
      cpu    = 0.5
      memory = "1Gi"
    }

    # Revision suffix helps identify revisions
    revision_suffix = "v2"
  }

  ingress {
    external_enabled = true
    target_port      = 8080

    # Canary deployment: 90% to stable, 10% to canary
    traffic_weight {
      revision_suffix = "v1"
      percentage      = 90
    }

    traffic_weight {
      revision_suffix = "v2"
      percentage      = 10
      label           = "canary"
    }
  }
}
```

## VNet Integration

For applications that need access to private resources:

```hcl
# VNet for the Container Apps Environment
resource "azurerm_virtual_network" "apps" {
  name                = "vnet-containerapps-prod"
  location            = azurerm_resource_group.apps.location
  resource_group_name = azurerm_resource_group.apps.name
  address_space       = ["10.0.0.0/16"]
}

# Subnet dedicated to Container Apps (minimum /23)
resource "azurerm_subnet" "container_apps" {
  name                 = "snet-containerapps"
  resource_group_name  = azurerm_resource_group.apps.name
  virtual_network_name = azurerm_virtual_network.apps.name
  address_prefixes     = ["10.0.0.0/23"]
}

# Container Apps Environment with VNet integration
resource "azurerm_container_app_environment" "main" {
  name                       = "cae-prod-eastus"
  location                   = azurerm_resource_group.apps.location
  resource_group_name        = azurerm_resource_group.apps.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.apps.id

  # VNet integration
  infrastructure_subnet_id   = azurerm_subnet.container_apps.id

  # Internal means the environment is only accessible from the VNet
  internal_load_balancer_enabled = true
}
```

## Outputs

```hcl
output "environment_id" {
  description = "Container Apps Environment ID"
  value       = azurerm_container_app_environment.main.id
}

output "api_url" {
  description = "URL of the API container app"
  value       = "https://${azurerm_container_app.api.ingress[0].fqdn}"
}

output "environment_default_domain" {
  description = "Default domain of the Container Apps Environment"
  value       = azurerm_container_app_environment.main.default_domain
}
```

## Best Practices

**Use managed identity for ACR.** Do not use admin credentials or registry passwords. Managed identity is more secure and easier to manage.

**Set resource limits appropriately.** Container Apps bills based on allocated CPU and memory. Start small and scale up based on actual usage.

**Use secrets for sensitive configuration.** Never put connection strings or API keys directly in environment variables. Use the secrets mechanism and reference them.

**Enable health probes.** Liveness and readiness probes ensure that unhealthy containers are restarted and traffic is only sent to ready containers.

**Consider scale-to-zero carefully.** While it saves money, the cold start can take 5-30 seconds depending on your application. Keep `min_replicas = 1` for latency-sensitive services.

## Wrapping Up

Azure Container Apps with Terraform provides a clean way to run containerized workloads without managing Kubernetes. The environment handles networking and logging, while individual apps get their own scaling rules, ingress configuration, and secrets. For teams that want containers without the complexity of AKS, this is the right abstraction level.
