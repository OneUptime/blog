# How to Create Azure Container Apps Environment in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Container Apps, Serverless, Containers, Microservices

Description: Learn how to create and configure Azure Container Apps environments with Terraform for deploying scalable containerized microservices with built-in observability.

---

Azure Container Apps is a fully managed serverless container platform that enables you to run microservices and containerized applications without managing infrastructure. The Container Apps Environment is the secure boundary around groups of container apps that share the same virtual network, logging, and Dapr configuration. Terraform provides an excellent way to define these environments declaratively and manage them alongside your application infrastructure.

This guide walks through creating a complete Azure Container Apps environment with Terraform, including networking, logging, and deploying container apps within the environment.

## Setting Up the Azure Provider

Configure Terraform with the Azure provider:

```hcl
# Configure Terraform
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
  }
}

# Configure the Azure provider
provider "azurerm" {
  features {}
}

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "East US"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}
```

## Creating the Resource Group and Networking

Set up the foundational resources:

```hcl
# Resource group
resource "azurerm_resource_group" "main" {
  name     = "rg-container-apps-${var.environment}"
  location = var.location
}

# Virtual network for the Container Apps environment
resource "azurerm_virtual_network" "main" {
  name                = "vnet-container-apps"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  address_space       = ["10.0.0.0/16"]
}

# Subnet for Container Apps (requires at least /23 CIDR range)
resource "azurerm_subnet" "container_apps" {
  name                 = "subnet-container-apps"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.0.0/23"]

  # Delegate the subnet to Container Apps
  delegation {
    name = "container-apps-delegation"

    service_delegation {
      name    = "Microsoft.App/environments"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}
```

## Setting Up Log Analytics

Container Apps environments require a Log Analytics workspace for logging:

```hcl
# Log Analytics workspace for Container Apps
resource "azurerm_log_analytics_workspace" "main" {
  name                = "law-container-apps-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "PerGB2018"
  retention_in_days   = 30

  # Enable daily cap to control costs
  daily_quota_gb = 5
}
```

## Creating the Container Apps Environment

Now create the environment that will host your container apps:

```hcl
# Container Apps environment
resource "azurerm_container_app_environment" "main" {
  name                       = "cae-${var.environment}"
  resource_group_name        = azurerm_resource_group.main.name
  location                   = azurerm_resource_group.main.location
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  # VPC integration
  infrastructure_subnet_id = azurerm_subnet.container_apps.id

  # Internal load balancer for private access only
  internal_load_balancer_enabled = false

  # Workload profiles for different resource requirements
  workload_profile {
    name                  = "general-purpose"
    workload_profile_type = "D4"
    minimum_count         = 1
    maximum_count         = 10
  }

  workload_profile {
    name                  = "memory-optimized"
    workload_profile_type = "E4"
    minimum_count         = 0
    maximum_count         = 5
  }

  tags = {
    Environment = var.environment
  }
}
```

## Deploying a Container App

Deploy a container app within the environment:

```hcl
# Container app for the API service
resource "azurerm_container_app" "api" {
  name                         = "ca-api-${var.environment}"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.main.name
  revision_mode                = "Multiple"  # Enable multiple revision support

  template {
    # Main container
    container {
      name   = "api"
      image  = "myregistry.azurecr.io/api:v1.0"
      cpu    = 0.5
      memory = "1Gi"

      # Environment variables
      env {
        name  = "ASPNETCORE_ENVIRONMENT"
        value = "Production"
      }

      # Secret references
      env {
        name        = "DB_CONNECTION_STRING"
        secret_name = "db-connection-string"
      }

      # Liveness probe
      liveness_probe {
        transport = "HTTP"
        path      = "/health/live"
        port      = 8080

        initial_delay    = 10
        interval_seconds = 30
        timeout          = 5
      }

      # Readiness probe
      readiness_probe {
        transport = "HTTP"
        path      = "/health/ready"
        port      = 8080

        interval_seconds = 10
        timeout          = 3
      }

      # Startup probe
      startup_probe {
        transport = "HTTP"
        path      = "/health/startup"
        port      = 8080

        interval_seconds = 5
        timeout          = 3
        failure_count_threshold = 10
      }
    }

    # Scaling rules
    min_replicas = 1
    max_replicas = 20

    # HTTP scaling rule
    http_scale_rule {
      name                = "http-scaling"
      concurrent_requests = 50
    }

    # Custom scaling rule based on Azure Queue
    custom_scale_rule {
      name             = "queue-scaling"
      custom_rule_type = "azure-queue"
      metadata = {
        queueName    = "orders"
        queueLength  = "10"
        connectionFromEnv = "QUEUE_CONNECTION"
      }
    }
  }

  # Secrets
  secret {
    name  = "db-connection-string"
    value = var.db_connection_string
  }

  secret {
    name  = "queue-connection"
    value = var.queue_connection_string
  }

  # Ingress configuration
  ingress {
    external_enabled = true
    target_port      = 8080
    transport        = "auto"

    # Traffic splitting between revisions
    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  # Container registry authentication
  registry {
    server               = "myregistry.azurecr.io"
    username             = var.acr_username
    password_secret_name = "acr-password"
  }

  secret {
    name  = "acr-password"
    value = var.acr_password
  }
}
```

## Deploying a Background Worker

Deploy a container app without ingress for background processing:

```hcl
# Background worker container app
resource "azurerm_container_app" "worker" {
  name                         = "ca-worker-${var.environment}"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.main.name
  revision_mode                = "Single"

  template {
    container {
      name   = "worker"
      image  = "myregistry.azurecr.io/worker:v1.0"
      cpu    = 1.0
      memory = "2Gi"

      env {
        name        = "QUEUE_CONNECTION"
        secret_name = "queue-connection"
      }

      env {
        name  = "WORKER_CONCURRENCY"
        value = "5"
      }
    }

    # Scale based on queue length
    min_replicas = 0  # Scale to zero when no messages
    max_replicas = 10

    custom_scale_rule {
      name             = "queue-scaling"
      custom_rule_type = "azure-queue"
      metadata = {
        queueName   = "background-jobs"
        queueLength = "5"
      }
    }
  }

  # No ingress for background workers
  # Workers only process from queues

  secret {
    name  = "queue-connection"
    value = var.queue_connection_string
  }

  registry {
    server               = "myregistry.azurecr.io"
    username             = var.acr_username
    password_secret_name = "acr-password"
  }

  secret {
    name  = "acr-password"
    value = var.acr_password
  }
}
```

## Enabling Dapr for Service-to-Service Communication

Enable Dapr sidecar for microservice communication:

```hcl
# Container app with Dapr enabled
resource "azurerm_container_app" "dapr_service" {
  name                         = "ca-dapr-service-${var.environment}"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.main.name
  revision_mode                = "Single"

  template {
    container {
      name   = "dapr-service"
      image  = "myregistry.azurecr.io/dapr-service:v1.0"
      cpu    = 0.5
      memory = "1Gi"
    }

    min_replicas = 1
    max_replicas = 5
  }

  # Enable Dapr sidecar
  dapr {
    app_id       = "my-dapr-service"
    app_port     = 3000
    app_protocol = "http"
  }

  ingress {
    external_enabled = false  # Internal service only
    target_port      = 3000
    transport        = "auto"

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  registry {
    server               = "myregistry.azurecr.io"
    username             = var.acr_username
    password_secret_name = "acr-password"
  }

  secret {
    name  = "acr-password"
    value = var.acr_password
  }
}

# Dapr component for state store
resource "azurerm_container_app_environment_dapr_component" "statestore" {
  name                         = "statestore"
  container_app_environment_id = azurerm_container_app_environment.main.id
  component_type               = "state.azure.blobstorage"
  version                      = "v1"

  metadata {
    name  = "accountName"
    value = azurerm_storage_account.main.name
  }

  metadata {
    name        = "accountKey"
    secret_name = "storage-key"
  }

  secret {
    name  = "storage-key"
    value = azurerm_storage_account.main.primary_access_key
  }

  scopes = ["my-dapr-service"]
}
```

## Outputs

```hcl
output "environment_id" {
  description = "Container Apps Environment ID"
  value       = azurerm_container_app_environment.main.id
}

output "api_url" {
  description = "API service URL"
  value       = "https://${azurerm_container_app.api.ingress[0].fqdn}"
}

output "environment_default_domain" {
  description = "Default domain for the environment"
  value       = azurerm_container_app_environment.main.default_domain
}
```

## Monitoring with OneUptime

Azure Container Apps environments host multiple services that need coordinated monitoring. OneUptime provides unified monitoring across all your container apps, tracking health probes, scaling events, and inter-service communication. Visit [OneUptime](https://oneuptime.com) to set up monitoring for your Container Apps deployments.

## Conclusion

Azure Container Apps Environment in Terraform provides a comprehensive platform for running containerized microservices. The environment concept gives you a shared boundary for networking, logging, and service discovery, while Terraform ensures your infrastructure is reproducible and version-controlled. With features like workload profiles for resource management, Dapr integration for microservice patterns, KEDA-based auto-scaling, and built-in traffic splitting, Container Apps offers a powerful middle ground between simple PaaS and full Kubernetes. Terraform makes managing all of these components consistent and predictable across environments.

For more container platform options, see [How to Create App Runner with Custom VPC in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-app-runner-with-custom-vpc-in-terraform/view) and [How to Create Cloud Run with Custom Domain in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-cloud-run-with-custom-domain-in-terraform/view).
