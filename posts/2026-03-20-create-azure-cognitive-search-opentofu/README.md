# How to Create Azure Cognitive Search with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure, Cognitive Search, Search, Infrastructure as Code

Description: Learn how to create Azure AI Search (formerly Cognitive Search) services with OpenTofu for enterprise-grade full-text and vector search capabilities.

Azure AI Search provides managed search-as-a-service with AI enrichment capabilities. Managing search services in OpenTofu ensures consistent SKU, replica, and partition configuration with proper access control.

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

## Creating a Search Service

```hcl
resource "azurerm_resource_group" "search" {
  name     = "search-rg"
  location = "eastus"
}

resource "azurerm_search_service" "main" {
  name                = "myapp-search"
  resource_group_name = azurerm_resource_group.search.name
  location            = azurerm_resource_group.search.location

  sku = "standard"  # free, basic, standard, standard2, standard3, storage_optimized_l1, storage_optimized_l2

  # Scaling: replicas for availability, partitions for storage/throughput
  replica_count   = 2  # 2 replicas for HA
  partition_count = 1  # standard (S1) partition: up to 160 GB on services created after April 3, 2024 in supported regions (25 GB on older services)

  # Disable public network access
  public_network_access_enabled = false

  # Disable API key authentication (use RBAC only)
  local_authentication_enabled = false

  authentication_failure_mode = "http403"  # or "http401WithBearerChallenge"

  tags = {
    Environment = "production"
    Team        = "search"
  }
}
```

## Standard3 (High Capacity)

```hcl
resource "azurerm_search_service" "high_capacity" {
  name                = "myapp-search-hc"
  resource_group_name = azurerm_resource_group.search.name
  location            = azurerm_resource_group.search.location

  sku                         = "standard3"
  allowed_ips                 = []
  public_network_access_enabled = false

  # Up to 12 replicas and 12 partitions
  replica_count   = 3   # 3 replicas for read scaling
  partition_count = 3   # standard3 (S3) partition: up to 1 TB on services created after April 3, 2024 in supported regions (200 GB on older services)

  hosting_mode = "default"  # or "highDensity" for standard3 - more indexes per partition
}
```

## Private Endpoint

```hcl
resource "azurerm_private_endpoint" "search" {
  name                = "search-private-endpoint"
  location            = azurerm_resource_group.search.location
  resource_group_name = azurerm_resource_group.search.name
  subnet_id           = azurerm_subnet.private.id

  private_service_connection {
    name                           = "search-connection"
    private_connection_resource_id = azurerm_search_service.main.id
    subresource_names              = ["searchService"]
    is_manual_connection           = false
  }
}
```

## RBAC for Search Access

```hcl
# Assign search contributor role to application managed identity

resource "azurerm_role_assignment" "search_contributor" {
  scope                = azurerm_search_service.main.id
  role_definition_name = "Search Service Contributor"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
}

resource "azurerm_role_assignment" "search_index_data_contributor" {
  scope                = azurerm_search_service.main.id
  role_definition_name = "Search Index Data Contributor"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
}

resource "azurerm_role_assignment" "search_index_data_reader" {
  scope                = azurerm_search_service.main.id
  role_definition_name = "Search Index Data Reader"
  principal_id         = azurerm_user_assigned_identity.frontend.principal_id
}
```

## Shared Private Link (Indexer Access to Private Resources)

```hcl
resource "azurerm_search_shared_private_link_service" "storage" {
  name               = "storage-shared-link"
  search_service_id  = azurerm_search_service.main.id
  subresource_name   = "blob"
  target_resource_id = azurerm_storage_account.data.id
  request_message    = "Azure AI Search indexer needs access to storage"
}
```

## Outputs

```hcl
output "search_service_name" {
  value = azurerm_search_service.main.name
}

output "search_endpoint" {
  value = "https://${azurerm_search_service.main.name}.search.windows.net"
}

output "admin_key" {
  value     = azurerm_search_service.main.primary_key
  sensitive = true
}
```

## Conclusion

Azure AI Search in OpenTofu provides enterprise search with minimal operational overhead. Disable local API key authentication and use RBAC for security, configure replicas for availability and partitions for storage/throughput, and use private endpoints to restrict network access. Grant Search Index Data Contributor for indexing and Search Index Data Reader for query-only access.
