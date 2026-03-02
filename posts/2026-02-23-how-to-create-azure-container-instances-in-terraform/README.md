# How to Create Azure Container Instances in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Container Instances, ACI, Docker, Container, Infrastructure as Code

Description: Learn how to deploy Azure Container Instances with Terraform for running Docker containers without managing servers, including multi-container groups and volume mounts.

---

Azure Container Instances (ACI) provides the fastest way to run a Docker container in Azure without managing any virtual machines or orchestrators. You specify the container image, resource requirements, and networking, and ACI starts the container within seconds. It is ideal for burst workloads, batch jobs, CI/CD runners, and any scenario where you need containers on demand.

Terraform makes ACI deployments repeatable and manageable. Instead of using CLI commands that are easy to forget, you declare your container configuration and let Terraform handle the lifecycle. This guide covers single and multi-container deployments, private networking, volume mounts, and common deployment patterns.

## Prerequisites

- Terraform 1.0 or later
- Azure CLI authenticated
- A container image in a registry (Docker Hub, Azure Container Registry, or elsewhere)

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
```

## Foundation Resources

```hcl
resource "azurerm_resource_group" "aci" {
  name     = "rg-containers-prod-eus"
  location = "East US"

  tags = {
    Environment = "production"
    Service     = "containers"
  }
}
```

## Basic Container Instance

The simplest deployment - a single container from a public image:

```hcl
# Single container running nginx
resource "azurerm_container_group" "web" {
  name                = "ci-web-prod"
  location            = azurerm_resource_group.aci.location
  resource_group_name = azurerm_resource_group.aci.name

  # Linux or Windows
  os_type = "Linux"

  # IP address type: Public, Private, or None
  ip_address_type = "Public"

  # DNS name label for public access
  dns_name_label = "myapp-web-prod"

  container {
    name   = "web"
    image  = "nginx:latest"

    # CPU and memory allocation
    cpu    = "1"
    memory = "1.5"

    # Port configuration
    ports {
      port     = 80
      protocol = "TCP"
    }

    ports {
      port     = 443
      protocol = "TCP"
    }

    # Environment variables
    environment_variables = {
      "NGINX_HOST" = "example.com"
    }
  }

  tags = {
    Environment = "production"
    Application = "web"
  }
}

output "web_fqdn" {
  description = "Fully qualified domain name of the container"
  value       = azurerm_container_group.web.fqdn
}

output "web_ip" {
  description = "Public IP of the container"
  value       = azurerm_container_group.web.ip_address
}
```

## Container with Private Registry (ACR)

Pull images from Azure Container Registry:

```hcl
# Reference existing ACR
data "azurerm_container_registry" "main" {
  name                = "myappcr"
  resource_group_name = "rg-shared-prod"
}

# Container from ACR with authentication
resource "azurerm_container_group" "app" {
  name                = "ci-app-prod"
  location            = azurerm_resource_group.aci.location
  resource_group_name = azurerm_resource_group.aci.name
  os_type             = "Linux"
  ip_address_type     = "Public"
  dns_name_label      = "myapp-api-prod"

  # Registry credentials
  image_registry_credential {
    server   = data.azurerm_container_registry.main.login_server
    username = data.azurerm_container_registry.main.admin_username
    password = data.azurerm_container_registry.main.admin_password
  }

  container {
    name   = "api"
    image  = "${data.azurerm_container_registry.main.login_server}/myapp-api:v1.2.0"
    cpu    = "2"
    memory = "4"

    ports {
      port     = 8080
      protocol = "TCP"
    }

    environment_variables = {
      "APP_ENV" = "production"
      "PORT"    = "8080"
    }

    # Secure environment variables (not shown in logs/portal)
    secure_environment_variables = {
      "DATABASE_URL" = var.database_url
      "API_KEY"      = var.api_key
    }

    # Liveness probe
    liveness_probe {
      http_get {
        path   = "/health"
        port   = 8080
        scheme = "Http"
      }
      initial_delay_seconds = 30
      period_seconds        = 10
      failure_threshold     = 3
    }

    # Readiness probe
    readiness_probe {
      http_get {
        path   = "/ready"
        port   = 8080
        scheme = "Http"
      }
      initial_delay_seconds = 10
      period_seconds        = 5
    }
  }

  tags = {
    Environment = "production"
    Application = "api"
  }
}

variable "database_url" {
  description = "Database connection string"
  type        = string
  sensitive   = true
}

variable "api_key" {
  description = "API key"
  type        = string
  sensitive   = true
}
```

## Multi-Container Group (Sidecar Pattern)

Container groups let you run multiple containers that share the same network and storage - similar to Kubernetes pods:

```hcl
# Multi-container group with app and sidecar
resource "azurerm_container_group" "multi" {
  name                = "ci-multi-prod"
  location            = azurerm_resource_group.aci.location
  resource_group_name = azurerm_resource_group.aci.name
  os_type             = "Linux"
  ip_address_type     = "Public"
  dns_name_label      = "myapp-multi-prod"

  # Main application container
  container {
    name   = "app"
    image  = "myapp/api:latest"
    cpu    = "1"
    memory = "2"

    ports {
      port     = 8080
      protocol = "TCP"
    }

    environment_variables = {
      "PORT" = "8080"
    }

    # Mount a shared volume
    volume {
      name       = "shared-data"
      mount_path = "/app/data"
      empty_dir  = true
    }
  }

  # Sidecar container for log forwarding
  container {
    name   = "log-forwarder"
    image  = "fluent/fluent-bit:latest"
    cpu    = "0.5"
    memory = "0.5"

    # The sidecar accesses the same shared volume
    volume {
      name       = "shared-data"
      mount_path = "/data"
      empty_dir  = true
    }

    # Config volume for Fluent Bit
    volume {
      name       = "fluent-config"
      mount_path = "/fluent-bit/etc"
      secret = {
        "fluent-bit.conf" = base64encode(<<-EOF
          [SERVICE]
              Flush        5
              Log_Level    info

          [INPUT]
              Name         tail
              Path         /data/*.log
              Tag          app

          [OUTPUT]
              Name         stdout
              Match        *
        EOF
        )
      }
    }
  }

  tags = {
    Environment = "production"
    Pattern     = "sidecar"
  }
}
```

## Private Networking with VNet

Deploy containers into a VNet for private-only access:

```hcl
# VNet and subnet for ACI
resource "azurerm_virtual_network" "aci" {
  name                = "vnet-aci-prod"
  location            = azurerm_resource_group.aci.location
  resource_group_name = azurerm_resource_group.aci.name
  address_space       = ["10.0.0.0/16"]
}

resource "azurerm_subnet" "aci" {
  name                 = "snet-aci"
  resource_group_name  = azurerm_resource_group.aci.name
  virtual_network_name = azurerm_virtual_network.aci.name
  address_prefixes     = ["10.0.1.0/24"]

  # Delegate the subnet to ACI
  delegation {
    name = "aci-delegation"

    service_delegation {
      name    = "Microsoft.ContainerInstance/containerGroups"
      actions = ["Microsoft.Network/virtualNetworks/subnets/action"]
    }
  }
}

# Private container instance
resource "azurerm_container_group" "private" {
  name                = "ci-private-prod"
  location            = azurerm_resource_group.aci.location
  resource_group_name = azurerm_resource_group.aci.name
  os_type             = "Linux"

  # Use private IP only
  ip_address_type = "Private"
  subnet_ids      = [azurerm_subnet.aci.id]

  container {
    name   = "worker"
    image  = "myapp/worker:latest"
    cpu    = "2"
    memory = "4"

    environment_variables = {
      "WORKER_MODE" = "production"
    }
  }

  tags = {
    Environment = "production"
    Network     = "private"
  }
}
```

## File Share Volume Mount

Mount Azure Files shares into containers for persistent storage:

```hcl
# Storage account for file shares
resource "azurerm_storage_account" "aci_storage" {
  name                     = "staciprodeus"
  resource_group_name      = azurerm_resource_group.aci.name
  location                 = azurerm_resource_group.aci.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

# File share
resource "azurerm_storage_share" "data" {
  name                 = "app-data"
  storage_account_name = azurerm_storage_account.aci_storage.name
  quota                = 50  # GB
}

# Container with mounted file share
resource "azurerm_container_group" "with_storage" {
  name                = "ci-storage-prod"
  location            = azurerm_resource_group.aci.location
  resource_group_name = azurerm_resource_group.aci.name
  os_type             = "Linux"
  ip_address_type     = "Public"

  container {
    name   = "app"
    image  = "myapp/processor:latest"
    cpu    = "2"
    memory = "4"

    ports {
      port     = 8080
      protocol = "TCP"
    }

    # Mount the Azure Files share
    volume {
      name                 = "data-volume"
      mount_path           = "/app/data"
      share_name           = azurerm_storage_share.data.name
      storage_account_name = azurerm_storage_account.aci_storage.name
      storage_account_key  = azurerm_storage_account.aci_storage.primary_access_key
    }
  }

  tags = {
    Environment = "production"
    Storage     = "azure-files"
  }
}
```

## Container Group with GPU

For AI/ML workloads, request GPU resources:

```hcl
# GPU-enabled container for ML inference
resource "azurerm_container_group" "gpu" {
  name                = "ci-gpu-inference"
  location            = azurerm_resource_group.aci.location
  resource_group_name = azurerm_resource_group.aci.name
  os_type             = "Linux"
  ip_address_type     = "Public"

  container {
    name   = "inference"
    image  = "myapp/ml-model:latest"
    cpu    = "4"
    memory = "16"

    # Request GPU resources
    gpu {
      count = 1
      sku   = "V100"
    }

    ports {
      port     = 8501
      protocol = "TCP"
    }
  }

  tags = {
    Workload = "ml-inference"
  }
}
```

## Restart Policy and Init Containers

Control container lifecycle behavior:

```hcl
# Batch processing container that runs once
resource "azurerm_container_group" "batch" {
  name                = "ci-batch-job"
  location            = azurerm_resource_group.aci.location
  resource_group_name = azurerm_resource_group.aci.name
  os_type             = "Linux"
  ip_address_type     = "None"

  # Never restart - run once and stop
  restart_policy = "Never"

  # Init container runs before the main container
  init_container {
    name  = "init"
    image = "busybox:latest"

    commands = ["sh", "-c", "echo 'Initializing...' && sleep 5"]

    environment_variables = {
      "INIT_STEP" = "setup"
    }
  }

  container {
    name   = "batch-processor"
    image  = "myapp/batch:latest"
    cpu    = "4"
    memory = "8"

    environment_variables = {
      "BATCH_MODE"   = "full"
      "OUTPUT_PATH"  = "/output"
    }

    commands = ["python", "process_batch.py"]
  }

  tags = {
    Workload = "batch-processing"
    Schedule = "on-demand"
  }
}
```

## Outputs

```hcl
output "app_fqdn" {
  description = "FQDN of the application container"
  value       = azurerm_container_group.app.fqdn
}

output "app_ip" {
  description = "Public IP address"
  value       = azurerm_container_group.app.ip_address
}

output "private_ip" {
  description = "Private IP of the VNet container"
  value       = azurerm_container_group.private.ip_address
}
```

## Monitoring Containers

Container instances can fail silently if health probes are not configured. Use OneUptime to monitor the endpoints exposed by your containers and get alerted on failures. For containers running batch jobs, track completion status and duration to detect processing delays before they affect downstream systems.

For storing container images, see our guide on Azure Container Registry at https://oneuptime.com/blog/post/2026-02-23-how-to-create-azure-container-registry-in-terraform/view.

## Summary

Azure Container Instances provide the simplest way to run containers in Azure. Terraform captures the full deployment configuration - images, resources, networking, volumes, and probes - in code that can be versioned and reviewed. Use ACI for burst workloads and batch jobs where you want container simplicity without Kubernetes complexity. For persistent, multi-service deployments, consider whether ACI or AKS better fits your needs.
