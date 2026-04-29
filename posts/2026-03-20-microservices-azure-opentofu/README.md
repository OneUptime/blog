# How to Build a Microservices Architecture with OpenTofu on Azure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Microservice, Architecture, OpenTofu, AKS, API Management, Service Bus

Description: Learn how to build a production-ready microservices architecture on Azure using OpenTofu with AKS, Azure API Management, Service Bus, and Workload Identity.

## Overview

Microservices on Azure use AKS for container orchestration, Azure API Management as the API gateway, Service Bus for asynchronous messaging, and Azure Container Registry for image storage. OpenTofu provisions the complete platform.

## Step 1: AKS Cluster

```hcl
# main.tf - AKS cluster for microservices

resource "azurerm_kubernetes_cluster" "aks" {
  name                = "microservices-aks"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  dns_prefix          = "microservices"

  default_node_pool {
    name                = "system"
    vm_size             = "Standard_D4s_v3"
    node_count          = 3
    vnet_subnet_id      = azurerm_subnet.aks.id
    auto_scaling_enabled = true
    min_count           = 3
    max_count           = 10
    os_disk_type        = "Ephemeral"
  }

  identity {
    type = "SystemAssigned"
  }

  oidc_issuer_enabled       = true
  workload_identity_enabled = true

  network_profile {
    network_plugin    = "azure"
    network_policy    = "calico"
    load_balancer_sku = "standard"
  }

  # Microsoft Entra integration for cluster user authentication
  azure_active_directory_role_based_access_control {
  }

  key_vault_secrets_provider {
    secret_rotation_enabled = true
  }
}

# Additional node pool for microservices
resource "azurerm_kubernetes_cluster_node_pool" "workloads" {
  name                  = "workloads"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.aks.id
  vm_size               = "Standard_D8s_v3"
  node_count            = 5
  auto_scaling_enabled  = true
  min_count             = 3
  max_count             = 20
}
```

## Step 2: Azure API Management

```hcl
# APIM as the microservices API gateway
resource "azurerm_api_management" "apim" {
  name                = "microservices-apim"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  publisher_name      = "My Company"
  publisher_email     = "platform@example.com"
  sku_name            = "Developer_1"  # Use Premium for production

  identity {
    type = "SystemAssigned"
  }

  # Virtual network integration
  virtual_network_configuration {
    subnet_id = azurerm_subnet.apim.id
  }

  virtual_network_type = "Internal"
}

# API definition for order service
resource "azurerm_api_management_api" "orders" {
  name                = "orders-api"
  resource_group_name = azurerm_resource_group.rg.name
  api_management_name = azurerm_api_management.apim.name
  revision            = "1"
  display_name        = "Orders API"
  path                = "orders"
  protocols           = ["https"]

  import {
    content_format = "openapi+json"
    content_value  = file("${path.module}/api-specs/orders-openapi.json")
  }
}
```

## Step 3: Service Bus for Async Messaging

```hcl
# Service Bus namespace for microservice messaging
resource "azurerm_servicebus_namespace" "sb" {
  name                = "microservices-servicebus"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  sku                 = "Premium"

  # Premium tier is required for private endpoints
  premium_messaging_partitions = 1
}

# Topics for each domain event
resource "azurerm_servicebus_topic" "order_events" {
  name         = "order-events"
  namespace_id = azurerm_servicebus_namespace.sb.id

  default_message_ttl    = "P7D"  # 7 days
  max_size_in_megabytes  = 5120
}

# Per-service subscription
resource "azurerm_servicebus_subscription" "payment_service" {
  name               = "payment-service"
  topic_id           = azurerm_servicebus_topic.order_events.id
  max_delivery_count = 3
  lock_duration      = "PT1M"

  # Dead letter on message expiration
  dead_lettering_on_message_expiration = true
}
```

## Step 4: Workload Identity for Service Authentication

```hcl
# User-assigned managed identity for each service
resource "azurerm_user_assigned_identity" "order_service" {
  name                = "order-service"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
}

# Federated credential binding K8s service account to Azure identity
resource "azurerm_federated_identity_credential" "order_service" {
  name                      = "order-service-federated"
  user_assigned_identity_id = azurerm_user_assigned_identity.order_service.id
  audience                  = ["api://AzureADTokenExchange"]
  issuer                    = azurerm_kubernetes_cluster.aks.oidc_issuer_url
  subject                   = "system:serviceaccount:orders:order-service"
}

# Grant the identity access to Service Bus
resource "azurerm_role_assignment" "order_service_sb" {
  scope                = azurerm_servicebus_namespace.sb.id
  role_definition_name = "Azure Service Bus Data Sender"
  principal_id         = azurerm_user_assigned_identity.order_service.principal_id
}
```

## Summary

Microservices on Azure built with OpenTofu use AKS Workload Identity to give each service its own Azure identity without storing credentials. Azure API Management provides rate limiting, caching, and API versioning at the gateway level. Service Bus Premium tier supports private endpoints, and dead-letter queues retain expired or repeatedly failed messages for debugging.
