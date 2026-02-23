# How to Create Azure Cosmos DB in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Azure, Cosmos DB, NoSQL, Infrastructure as Code, Database

Description: Learn how to create and configure Azure Cosmos DB accounts, databases, and containers in Terraform with consistency levels and throughput settings.

---

Azure Cosmos DB is a globally distributed, multi-model database service. It supports document, key-value, graph, and column-family data models with guaranteed single-digit millisecond reads at the 99th percentile. Provisioning it through Terraform means you can version control your database topology and replicate it consistently across environments.

This guide walks through creating a Cosmos DB account, database, and containers using Terraform, including configuration for consistency levels, throughput, partition keys, and geo-replication.

## Provider Configuration

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
```

## Resource Group

```hcl
# main.tf
resource "azurerm_resource_group" "cosmos" {
  name     = "rg-cosmosdb-production"
  location = "East US"

  tags = {
    environment = "production"
    managed_by  = "terraform"
  }
}
```

## Cosmos DB Account

The account is the top-level resource. This is where you set the API type, consistency level, and geo-replication settings.

```hcl
# cosmos-account.tf
# Create a Cosmos DB account with SQL (Core) API
resource "azurerm_cosmosdb_account" "main" {
  name                = "cosmos-prod-2026"
  location            = azurerm_resource_group.cosmos.location
  resource_group_name = azurerm_resource_group.cosmos.name
  offer_type          = "Standard"

  # Choose your API: EnableCassandra, EnableTable, EnableGremlin, EnableMongo
  # Omit kind for SQL (Core) API
  kind = "GlobalDocumentDB"

  # Session consistency is a good default for most applications
  consistency_policy {
    consistency_level       = "Session"
    max_interval_in_seconds = 5
    max_staleness_prefix    = 100
  }

  # Primary region - this is where writes go
  geo_location {
    location          = "East US"
    failover_priority = 0
    zone_redundant    = true  # Spread across availability zones
  }

  # Secondary region for reads and failover
  geo_location {
    location          = "West US"
    failover_priority = 1
    zone_redundant    = false
  }

  # Enable automatic failover between regions
  enable_automatic_failover = true

  # Enable multi-region writes if needed (increases cost)
  enable_multiple_write_locations = false

  # Network restrictions
  is_virtual_network_filter_enabled = true
  public_network_access_enabled     = true  # Set to false if using private endpoints

  # IP range filter for allowed IPs (Azure portal access)
  ip_range_filter = "104.42.195.92,40.76.54.131,52.176.6.30,52.169.50.45,52.187.184.26"

  # Backup policy
  backup {
    type                = "Periodic"
    interval_in_minutes = 240   # Every 4 hours
    retention_in_hours  = 720   # Keep for 30 days
    storage_redundancy  = "Geo" # Geo-redundant backups
  }

  tags = {
    environment = "production"
    managed_by  = "terraform"
  }
}
```

## SQL Database

The database sits under the account and holds your containers.

```hcl
# cosmos-database.tf
# Create a SQL database within the Cosmos DB account
resource "azurerm_cosmosdb_sql_database" "app" {
  name                = "app-database"
  resource_group_name = azurerm_resource_group.cosmos.name
  account_name        = azurerm_cosmosdb_account.main.name

  # Shared throughput at the database level
  # All containers in this database share these RU/s unless they have their own
  throughput = 400
}
```

## Containers with Partition Keys

Containers are where your data actually lives. Getting the partition key right is critical for performance at scale.

```hcl
# cosmos-containers.tf
# Users container - partitioned by user ID
resource "azurerm_cosmosdb_sql_container" "users" {
  name                  = "users"
  resource_group_name   = azurerm_resource_group.cosmos.name
  account_name          = azurerm_cosmosdb_account.main.name
  database_name         = azurerm_cosmosdb_sql_database.app.name
  partition_key_path    = "/userId"
  partition_key_version = 2  # Use v2 for hierarchical partition keys

  # Container-level throughput overrides the database-level setting
  throughput = 1000

  # Indexing policy controls which fields get indexed
  indexing_policy {
    indexing_mode = "consistent"

    included_path {
      path = "/*"
    }

    # Exclude large text fields from indexing to save RU/s
    excluded_path {
      path = "/description/?"
    }
  }

  # Unique key constraint
  unique_key {
    paths = ["/email"]
  }

  # TTL: -1 means items can have individual TTL values
  default_ttl = -1
}

# Orders container - partitioned by customer ID
resource "azurerm_cosmosdb_sql_container" "orders" {
  name                = "orders"
  resource_group_name = azurerm_resource_group.cosmos.name
  account_name        = azurerm_cosmosdb_account.main.name
  database_name       = azurerm_cosmosdb_sql_database.app.name
  partition_key_path  = "/customerId"

  # Use autoscale throughput for unpredictable workloads
  autoscale_settings {
    max_throughput = 4000  # Scales between 400 (10% of max) and 4000 RU/s
  }

  indexing_policy {
    indexing_mode = "consistent"

    included_path {
      path = "/*"
    }

    # Composite index for efficient ORDER BY on multiple fields
    composite_index {
      index {
        path  = "/customerId"
        order = "ascending"
      }
      index {
        path  = "/orderDate"
        order = "descending"
      }
    }
  }
}

# Session data container with TTL enabled
resource "azurerm_cosmosdb_sql_container" "sessions" {
  name                = "sessions"
  resource_group_name = azurerm_resource_group.cosmos.name
  account_name        = azurerm_cosmosdb_account.main.name
  database_name       = azurerm_cosmosdb_sql_database.app.name
  partition_key_path  = "/sessionId"

  # Sessions expire after 24 hours (in seconds)
  default_ttl = 86400
}
```

## Using the MongoDB API

If your application already uses MongoDB, you can create a Cosmos DB account with MongoDB compatibility.

```hcl
# cosmos-mongo.tf
# Cosmos DB account with MongoDB API
resource "azurerm_cosmosdb_account" "mongo" {
  name                = "cosmos-mongo-prod-2026"
  location            = azurerm_resource_group.cosmos.location
  resource_group_name = azurerm_resource_group.cosmos.name
  offer_type          = "Standard"
  kind                = "MongoDB"

  # Enable server version 4.2 for MongoDB features
  mongo_server_version = "4.2"

  capabilities {
    name = "EnableMongo"
  }

  consistency_policy {
    consistency_level = "Session"
  }

  geo_location {
    location          = "East US"
    failover_priority = 0
  }
}

# MongoDB database
resource "azurerm_cosmosdb_mongo_database" "app" {
  name                = "app-database"
  resource_group_name = azurerm_resource_group.cosmos.name
  account_name        = azurerm_cosmosdb_account.mongo.name
  throughput          = 400
}

# MongoDB collection
resource "azurerm_cosmosdb_mongo_collection" "products" {
  name                = "products"
  resource_group_name = azurerm_resource_group.cosmos.name
  account_name        = azurerm_cosmosdb_account.mongo.name
  database_name       = azurerm_cosmosdb_mongo_database.app.name
  shard_key           = "category"
  throughput          = 1000

  index {
    keys   = ["_id"]
    unique = true
  }

  index {
    keys = ["category", "price"]
  }
}
```

## Outputs

```hcl
# outputs.tf
output "cosmos_endpoint" {
  value       = azurerm_cosmosdb_account.main.endpoint
  description = "The endpoint URL for the Cosmos DB account"
}

output "cosmos_primary_key" {
  value       = azurerm_cosmosdb_account.main.primary_key
  sensitive   = true
  description = "Primary key for authentication"
}

output "cosmos_connection_strings" {
  value       = azurerm_cosmosdb_account.main.connection_strings
  sensitive   = true
  description = "Connection strings for the Cosmos DB account"
}
```

## Consistency Levels Explained

Cosmos DB offers five consistency levels, from strongest to weakest:

1. **Strong** - Linearizable reads. Highest latency, guaranteed consistency. Only works within a single region.
2. **Bounded Staleness** - Reads lag behind writes by at most K versions or T seconds.
3. **Session** - Within a session, reads are consistent with writes. The most popular choice.
4. **Consistent Prefix** - Reads never see out-of-order writes, but may see older data.
5. **Eventual** - No ordering guarantee. Lowest latency, lowest cost.

Session consistency works for most applications. Pick strong consistency only if your application absolutely cannot tolerate stale reads and you can accept higher latency.

## Cost Optimization

Cosmos DB billing revolves around Request Units (RU/s). A few strategies to keep costs under control:

- Use **autoscale throughput** for containers with variable traffic. You pay for the peak RU/s used in each hour, but the minimum is only 10% of the max.
- Use **shared database throughput** for containers that do not need dedicated capacity.
- Enable **TTL** on containers where data has a natural expiration, like sessions or event logs.
- Review your **indexing policy**. Excluding rarely queried paths from indexing reduces the RU cost of writes.

Terraform gives you a reliable way to manage Cosmos DB infrastructure. The configuration patterns in this post cover the most common scenarios, from single-region development setups to multi-region production deployments with proper indexing and backup policies.
