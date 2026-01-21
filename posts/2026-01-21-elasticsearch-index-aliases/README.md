# How to Implement Index Aliases in Elasticsearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Index Aliases, Zero Downtime, Reindexing, DevOps

Description: A comprehensive guide to implementing Elasticsearch index aliases for zero-downtime reindexing, seamless index management, and flexible querying across multiple indices.

---

Index aliases in Elasticsearch provide an abstraction layer over indices, enabling zero-downtime reindexing, simplified querying, and flexible index management. This guide covers everything you need to know about implementing and using index aliases effectively.

## What Are Index Aliases?

An alias is an alternative name that points to one or more indices. Aliases provide:

- **Zero-downtime reindexing**: Swap indices without client changes
- **Simplified querying**: Query multiple indices with one name
- **Logical grouping**: Organize indices by purpose
- **Write routing**: Direct writes to specific indices

## Creating Aliases

### Basic Alias Creation

```bash
# Create alias for a single index
curl -X POST "https://localhost:9200/_aliases" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "actions": [
      {
        "add": {
          "index": "products-2024",
          "alias": "products"
        }
      }
    ]
  }'
```

### Create Alias with Index Creation

```bash
curl -X PUT "https://localhost:9200/products-2024.01" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "number_of_shards": 3
    },
    "aliases": {
      "products": {},
      "products-current": {
        "is_write_index": true
      }
    }
  }'
```

### Multiple Indices Under One Alias

```bash
curl -X POST "https://localhost:9200/_aliases" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "actions": [
      { "add": { "index": "logs-2024.01", "alias": "logs" } },
      { "add": { "index": "logs-2024.02", "alias": "logs" } },
      { "add": { "index": "logs-2024.03", "alias": "logs" } }
    ]
  }'
```

## Alias Operations

### Adding an Alias

```bash
curl -X PUT "https://localhost:9200/my-index/_alias/my-alias" \
  -u elastic:password
```

### Removing an Alias

```bash
curl -X DELETE "https://localhost:9200/my-index/_alias/my-alias" \
  -u elastic:password
```

### Atomic Swap (Zero-Downtime Reindexing)

```bash
curl -X POST "https://localhost:9200/_aliases" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "actions": [
      { "remove": { "index": "products-v1", "alias": "products" } },
      { "add": { "index": "products-v2", "alias": "products" } }
    ]
  }'
```

This operation is atomic - no requests will fail during the swap.

### List All Aliases

```bash
curl -X GET "https://localhost:9200/_aliases?pretty" \
  -u elastic:password
```

### Get Aliases for an Index

```bash
curl -X GET "https://localhost:9200/my-index/_alias?pretty" \
  -u elastic:password
```

### Check if Alias Exists

```bash
curl -X HEAD "https://localhost:9200/_alias/my-alias" \
  -u elastic:password
```

## Write Index

For aliases pointing to multiple indices, designate one as the write index:

```bash
curl -X POST "https://localhost:9200/_aliases" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "actions": [
      {
        "add": {
          "index": "logs-2024.03",
          "alias": "logs",
          "is_write_index": true
        }
      },
      {
        "add": {
          "index": "logs-2024.01",
          "alias": "logs",
          "is_write_index": false
        }
      },
      {
        "add": {
          "index": "logs-2024.02",
          "alias": "logs",
          "is_write_index": false
        }
      }
    ]
  }'
```

Write operations go to the write index:

```bash
curl -X POST "https://localhost:9200/logs/_doc" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "message": "This goes to logs-2024.03"
  }'
```

Read operations query all indices:

```bash
curl -X GET "https://localhost:9200/logs/_search" \
  -u elastic:password
```

## Filtered Aliases

Create aliases that automatically filter results:

```bash
curl -X POST "https://localhost:9200/_aliases" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "actions": [
      {
        "add": {
          "index": "orders",
          "alias": "orders-completed",
          "filter": {
            "term": { "status": "completed" }
          }
        }
      },
      {
        "add": {
          "index": "orders",
          "alias": "orders-pending",
          "filter": {
            "term": { "status": "pending" }
          }
        }
      }
    ]
  }'
```

Query the filtered alias - results automatically filtered:

```bash
curl -X GET "https://localhost:9200/orders-completed/_search" \
  -u elastic:password
```

## Routing Aliases

Direct queries to specific shards:

```bash
curl -X POST "https://localhost:9200/_aliases" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "actions": [
      {
        "add": {
          "index": "users",
          "alias": "users-tenant-a",
          "filter": { "term": { "tenant_id": "tenant-a" } },
          "routing": "tenant-a"
        }
      }
    ]
  }'
```

Separate search and index routing:

```bash
curl -X POST "https://localhost:9200/_aliases" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "actions": [
      {
        "add": {
          "index": "users",
          "alias": "users-tenant-b",
          "search_routing": "tenant-b,tenant-shared",
          "index_routing": "tenant-b"
        }
      }
    ]
  }'
```

## Zero-Downtime Reindexing Pattern

### Step 1: Create New Index with Updated Mapping

```bash
curl -X PUT "https://localhost:9200/products-v2" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "number_of_shards": 5,
      "number_of_replicas": 0
    },
    "mappings": {
      "properties": {
        "name": { "type": "text" },
        "price": { "type": "scaled_float", "scaling_factor": 100 },
        "category": { "type": "keyword" },
        "created_at": { "type": "date" }
      }
    }
  }'
```

### Step 2: Reindex Data

```bash
curl -X POST "https://localhost:9200/_reindex" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "source": {
      "index": "products-v1"
    },
    "dest": {
      "index": "products-v2"
    }
  }'
```

### Step 3: Verify Reindexing

```bash
curl -X GET "https://localhost:9200/products-v2/_count" \
  -u elastic:password

curl -X GET "https://localhost:9200/products-v1/_count" \
  -u elastic:password
```

### Step 4: Set Replicas on New Index

```bash
curl -X PUT "https://localhost:9200/products-v2/_settings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "index": {
      "number_of_replicas": 1
    }
  }'
```

### Step 5: Atomic Alias Swap

```bash
curl -X POST "https://localhost:9200/_aliases" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "actions": [
      { "remove": { "index": "products-v1", "alias": "products" } },
      { "add": { "index": "products-v2", "alias": "products" } }
    ]
  }'
```

### Step 6: Delete Old Index (Optional)

```bash
curl -X DELETE "https://localhost:9200/products-v1" \
  -u elastic:password
```

## Rolling Index Pattern with ILM

Combine aliases with Index Lifecycle Management:

### Create ILM Policy

```bash
curl -X PUT "https://localhost:9200/_ilm/policy/logs-policy" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "policy": {
      "phases": {
        "hot": {
          "min_age": "0ms",
          "actions": {
            "rollover": {
              "max_primary_shard_size": "50gb",
              "max_age": "1d"
            }
          }
        },
        "delete": {
          "min_age": "30d",
          "actions": {
            "delete": {}
          }
        }
      }
    }
  }'
```

### Create Index Template with Alias

```bash
curl -X PUT "https://localhost:9200/_index_template/logs-template" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "index_patterns": ["logs-*"],
    "template": {
      "settings": {
        "number_of_shards": 3,
        "index.lifecycle.name": "logs-policy",
        "index.lifecycle.rollover_alias": "logs"
      },
      "mappings": {
        "properties": {
          "@timestamp": { "type": "date" },
          "message": { "type": "text" }
        }
      }
    }
  }'
```

### Bootstrap First Index

```bash
curl -X PUT "https://localhost:9200/logs-000001" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "aliases": {
      "logs": {
        "is_write_index": true
      }
    }
  }'
```

Write to the alias - ILM handles rolling over to new indices automatically.

## Multi-Tenant Alias Pattern

Create per-tenant aliases for data isolation:

```bash
# Create base index
curl -X PUT "https://localhost:9200/data" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "mappings": {
      "properties": {
        "tenant_id": { "type": "keyword" },
        "content": { "type": "text" }
      }
    }
  }'

# Create tenant-specific aliases
curl -X POST "https://localhost:9200/_aliases" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "actions": [
      {
        "add": {
          "index": "data",
          "alias": "data-tenant-1",
          "filter": { "term": { "tenant_id": "tenant-1" } },
          "routing": "tenant-1"
        }
      },
      {
        "add": {
          "index": "data",
          "alias": "data-tenant-2",
          "filter": { "term": { "tenant_id": "tenant-2" } },
          "routing": "tenant-2"
        }
      }
    ]
  }'
```

Tenants query their own alias and only see their data:

```bash
curl -X GET "https://localhost:9200/data-tenant-1/_search" \
  -u elastic:password
```

## Best Practices

### 1. Always Use Aliases in Production

Never have applications point directly to indices:

```
# Bad
https://localhost:9200/products-2024.01.15/_search

# Good
https://localhost:9200/products/_search
```

### 2. Use Naming Conventions

```
Index:  products-v1, products-v2
Alias:  products (points to active version)

Index:  logs-2024.01.01-000001
Alias:  logs (for all logs)
        logs-current (write index)
```

### 3. Document Alias Mappings

Maintain documentation of which aliases point where:

```bash
# Export alias configuration
curl -X GET "https://localhost:9200/_alias?pretty" \
  -u elastic:password > aliases-backup.json
```

### 4. Monitor Alias Configuration

Regularly verify alias state:

```bash
curl -X GET "https://localhost:9200/_cat/aliases?v" \
  -u elastic:password
```

### 5. Use Filtered Aliases for Access Control

Combine with application-level security:

```bash
curl -X POST "https://localhost:9200/_aliases" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "actions": [
      {
        "add": {
          "index": "documents",
          "alias": "documents-public",
          "filter": { "term": { "visibility": "public" } }
        }
      }
    ]
  }'
```

## Troubleshooting

### Alias Not Found

```bash
# Check if alias exists
curl -X GET "https://localhost:9200/_alias/my-alias" \
  -u elastic:password
```

### Write to Alias Fails

Ensure write index is set:

```bash
curl -X GET "https://localhost:9200/_alias/my-alias?pretty" \
  -u elastic:password
```

Look for `"is_write_index": true`.

### Duplicate Alias Error

Cannot have same alias pointing to index twice with different filters:

```bash
# This will fail
curl -X POST "https://localhost:9200/_aliases" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "actions": [
      { "add": { "index": "data", "alias": "alias1", "filter": {"term": {"a": "1"}} } },
      { "add": { "index": "data", "alias": "alias1", "filter": {"term": {"b": "2"}} } }
    ]
  }'
```

## Conclusion

Index aliases are essential for production Elasticsearch deployments. Key takeaways:

1. **Use aliases for all client access** - Never point directly to indices
2. **Enable zero-downtime operations** - Atomic swaps for reindexing
3. **Designate write indices** - Control where writes go
4. **Use filtered aliases** - For data isolation and access control
5. **Integrate with ILM** - Automate rolling indices
6. **Follow naming conventions** - Keep alias management organized

With proper alias management, you can maintain and update your Elasticsearch indices without impacting applications or users.
