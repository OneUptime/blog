# How to Reindex Data in Elasticsearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Reindex, Migration, Data, Zero Downtime, Index

Description: A comprehensive guide to reindexing data in Elasticsearch, covering the Reindex API, zero-downtime strategies, remote reindexing, and best practices for data migration.

---

Reindexing is essential when you need to change mappings, update analyzers, or restructure data. Elasticsearch provides the Reindex API for copying documents between indices. This guide covers reindexing strategies for various scenarios.

## When to Reindex

- Change field mappings
- Update analyzers
- Change shard count
- Restructure documents
- Upgrade from old indices
- Migrate between clusters

## Basic Reindex

### Simple Reindex

```bash
curl -X POST "https://localhost:9200/_reindex" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "source": {
      "index": "old_products"
    },
    "dest": {
      "index": "new_products"
    }
  }'
```

### Reindex with Query

```bash
curl -X POST "https://localhost:9200/_reindex" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "source": {
      "index": "products",
      "query": {
        "bool": {
          "filter": [
            { "term": { "status": "active" } },
            { "range": { "created_at": { "gte": "2024-01-01" } } }
          ]
        }
      }
    },
    "dest": {
      "index": "products_active"
    }
  }'
```

### Async Reindex

For large indices:

```bash
curl -X POST "https://localhost:9200/_reindex?wait_for_completion=false" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "source": { "index": "old_products" },
    "dest": { "index": "new_products" }
  }'
```

Response includes task ID:

```json
{
  "task": "oTUltX4IQMOUUVeiohTt8A:12345"
}
```

### Check Task Status

```bash
curl -X GET "https://localhost:9200/_tasks/oTUltX4IQMOUUVeiohTt8A:12345" \
  -u elastic:password
```

### Cancel Reindex Task

```bash
curl -X POST "https://localhost:9200/_tasks/oTUltX4IQMOUUVeiohTt8A:12345/_cancel" \
  -u elastic:password
```

## Reindex with Transformations

### Rename Field

```bash
curl -X POST "https://localhost:9200/_reindex" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "source": { "index": "old_products" },
    "dest": { "index": "new_products" },
    "script": {
      "source": "ctx._source.product_name = ctx._source.remove(\"name\")"
    }
  }'
```

### Add Field

```bash
curl -X POST "https://localhost:9200/_reindex" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "source": { "index": "products" },
    "dest": { "index": "products_v2" },
    "script": {
      "source": "ctx._source.indexed_at = new Date().toISOString()"
    }
  }'
```

### Remove Field

```bash
curl -X POST "https://localhost:9200/_reindex" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "source": { "index": "products" },
    "dest": { "index": "products_clean" },
    "script": {
      "source": "ctx._source.remove(\"internal_field\")"
    }
  }'
```

### Complex Transformation

```bash
curl -X POST "https://localhost:9200/_reindex" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "source": { "index": "products" },
    "dest": { "index": "products_v2" },
    "script": {
      "source": """
        // Rename field
        ctx._source.product_name = ctx._source.remove("name");

        // Add computed field
        ctx._source.price_with_tax = ctx._source.price * 1.2;

        // Conditional transformation
        if (ctx._source.category == "electronics") {
          ctx._source.department = "tech";
        } else {
          ctx._source.department = "general";
        }

        // Remove sensitive fields
        ctx._source.remove("internal_id");
      """
    }
  }'
```

## Zero-Downtime Reindex

### Using Aliases

```bash
# 1. Create new index with updated mappings
curl -X PUT "https://localhost:9200/products_v2" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "mappings": {
      "properties": {
        "name": { "type": "text", "analyzer": "english" },
        "price": { "type": "float" }
      }
    }
  }'

# 2. Reindex data
curl -X POST "https://localhost:9200/_reindex?wait_for_completion=false" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "source": { "index": "products_v1" },
    "dest": { "index": "products_v2" }
  }'

# 3. Wait for reindex to complete
# Check task status...

# 4. Atomically switch alias
curl -X POST "https://localhost:9200/_aliases" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "actions": [
      { "remove": { "index": "products_v1", "alias": "products" } },
      { "add": { "index": "products_v2", "alias": "products" } }
    ]
  }'

# 5. Delete old index (optional)
curl -X DELETE "https://localhost:9200/products_v1" \
  -u elastic:password
```

### Handling New Documents During Reindex

For active indices, handle documents written during reindex:

```bash
# 1. Record start time
START_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# 2. Start reindex
curl -X POST "https://localhost:9200/_reindex?wait_for_completion=false" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "source": { "index": "products_v1" },
    "dest": { "index": "products_v2" }
  }'

# 3. Wait for completion...

# 4. Reindex documents written during the reindex
curl -X POST "https://localhost:9200/_reindex" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "source": {
      "index": "products_v1",
      "query": {
        "range": {
          "updated_at": {
            "gte": "'$START_TIME'"
          }
        }
      }
    },
    "dest": {
      "index": "products_v2"
    }
  }'

# 5. Switch alias
```

## Remote Reindex

### Configure Remote Whitelist

```yaml
# elasticsearch.yml
reindex.remote.whitelist: "source-cluster:9200"
```

### Reindex from Remote Cluster

```bash
curl -X POST "https://localhost:9200/_reindex" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "source": {
      "remote": {
        "host": "https://source-cluster:9200",
        "username": "remote_user",
        "password": "remote_password"
      },
      "index": "products",
      "query": {
        "match_all": {}
      }
    },
    "dest": {
      "index": "products"
    }
  }'
```

### Remote Reindex with SSL

```bash
curl -X POST "https://localhost:9200/_reindex" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "source": {
      "remote": {
        "host": "https://source-cluster:9200",
        "username": "remote_user",
        "password": "remote_password",
        "socket_timeout": "1m",
        "connect_timeout": "30s"
      },
      "index": "products",
      "size": 1000
    },
    "dest": {
      "index": "products"
    }
  }'
```

## Performance Optimization

### Batch Size

```bash
curl -X POST "https://localhost:9200/_reindex" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "source": {
      "index": "products",
      "size": 5000
    },
    "dest": {
      "index": "products_v2"
    }
  }'
```

### Sliced Scroll

Parallelize reindexing:

```bash
curl -X POST "https://localhost:9200/_reindex?slices=auto" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "source": { "index": "products" },
    "dest": { "index": "products_v2" }
  }'

# Or specify number of slices
curl -X POST "https://localhost:9200/_reindex?slices=5" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "source": { "index": "products" },
    "dest": { "index": "products_v2" }
  }'
```

### Optimize Destination Index

```bash
# Prepare destination index for bulk loading
curl -X PUT "https://localhost:9200/products_v2/_settings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "index": {
      "refresh_interval": "-1",
      "number_of_replicas": 0
    }
  }'

# Perform reindex...

# Restore settings after reindex
curl -X PUT "https://localhost:9200/products_v2/_settings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "index": {
      "refresh_interval": "1s",
      "number_of_replicas": 1
    }
  }'

# Force refresh
curl -X POST "https://localhost:9200/products_v2/_refresh" \
  -u elastic:password
```

### Throttling

Limit reindex speed to reduce cluster load:

```bash
curl -X POST "https://localhost:9200/_reindex?requests_per_second=1000" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "source": { "index": "products" },
    "dest": { "index": "products_v2" }
  }'
```

### Update Throttle

```bash
curl -X POST "https://localhost:9200/_reindex/task_id/_rethrottle?requests_per_second=500" \
  -u elastic:password
```

## Conflict Handling

### Version Conflicts

```bash
curl -X POST "https://localhost:9200/_reindex" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "conflicts": "proceed",
    "source": { "index": "products" },
    "dest": { "index": "products_v2" }
  }'
```

### Version Type

```bash
curl -X POST "https://localhost:9200/_reindex" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "source": { "index": "products" },
    "dest": {
      "index": "products_v2",
      "version_type": "external"
    }
  }'
```

Options:
- `internal`: Use Elasticsearch version
- `external`: Use source document version
- `external_gte`: Version must be >= current

## Reindex with Ingest Pipeline

```bash
# Create pipeline
curl -X PUT "https://localhost:9200/_ingest/pipeline/product_enrichment" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "description": "Enrich product data",
    "processors": [
      {
        "set": {
          "field": "processed_at",
          "value": "{{{_ingest.timestamp}}}"
        }
      },
      {
        "lowercase": {
          "field": "category"
        }
      }
    ]
  }'

# Reindex with pipeline
curl -X POST "https://localhost:9200/_reindex" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "source": { "index": "products" },
    "dest": {
      "index": "products_v2",
      "pipeline": "product_enrichment"
    }
  }'
```

## Complete Reindex Script

```bash
#!/bin/bash

SOURCE_INDEX="products_v1"
DEST_INDEX="products_v2"
ALIAS="products"
ES_HOST="https://localhost:9200"
ES_USER="elastic"
ES_PASS="password"

echo "=== Zero-Downtime Reindex ==="

# 1. Create new index with updated mappings
echo "Creating new index..."
curl -X PUT "$ES_HOST/$DEST_INDEX" \
  -H "Content-Type: application/json" \
  -u $ES_USER:$ES_PASS \
  -d '{
    "settings": {
      "number_of_shards": 3,
      "number_of_replicas": 0,
      "refresh_interval": "-1"
    },
    "mappings": {
      "properties": {
        "name": { "type": "text", "analyzer": "english" },
        "price": { "type": "float" }
      }
    }
  }'

# 2. Start reindex
echo "Starting reindex..."
TASK_ID=$(curl -s -X POST "$ES_HOST/_reindex?wait_for_completion=false&slices=auto" \
  -H "Content-Type: application/json" \
  -u $ES_USER:$ES_PASS \
  -d '{
    "source": { "index": "'$SOURCE_INDEX'" },
    "dest": { "index": "'$DEST_INDEX'" }
  }' | jq -r '.task')

echo "Task ID: $TASK_ID"

# 3. Wait for completion
echo "Waiting for reindex to complete..."
while true; do
  STATUS=$(curl -s -X GET "$ES_HOST/_tasks/$TASK_ID" \
    -u $ES_USER:$ES_PASS | jq -r '.completed')
  if [ "$STATUS" == "true" ]; then
    break
  fi
  PROGRESS=$(curl -s -X GET "$ES_HOST/_tasks/$TASK_ID" \
    -u $ES_USER:$ES_PASS | jq '.task.status')
  echo "Progress: $PROGRESS"
  sleep 10
done

# 4. Restore settings
echo "Restoring index settings..."
curl -X PUT "$ES_HOST/$DEST_INDEX/_settings" \
  -H "Content-Type: application/json" \
  -u $ES_USER:$ES_PASS \
  -d '{
    "index": {
      "refresh_interval": "1s",
      "number_of_replicas": 1
    }
  }'

# 5. Refresh index
echo "Refreshing index..."
curl -X POST "$ES_HOST/$DEST_INDEX/_refresh" \
  -u $ES_USER:$ES_PASS

# 6. Verify document count
echo "Verifying document count..."
SOURCE_COUNT=$(curl -s -X GET "$ES_HOST/$SOURCE_INDEX/_count" \
  -u $ES_USER:$ES_PASS | jq '.count')
DEST_COUNT=$(curl -s -X GET "$ES_HOST/$DEST_INDEX/_count" \
  -u $ES_USER:$ES_PASS | jq '.count')
echo "Source: $SOURCE_COUNT, Destination: $DEST_COUNT"

if [ "$SOURCE_COUNT" != "$DEST_COUNT" ]; then
  echo "WARNING: Document counts do not match!"
  exit 1
fi

# 7. Switch alias
echo "Switching alias..."
curl -X POST "$ES_HOST/_aliases" \
  -H "Content-Type: application/json" \
  -u $ES_USER:$ES_PASS \
  -d '{
    "actions": [
      { "remove": { "index": "'$SOURCE_INDEX'", "alias": "'$ALIAS'" } },
      { "add": { "index": "'$DEST_INDEX'", "alias": "'$ALIAS'" } }
    ]
  }'

echo "=== Reindex complete! ==="
```

## Best Practices

### 1. Always Use Aliases

Never point applications directly to index names.

### 2. Verify Document Count

Compare source and destination counts after reindex.

### 3. Test on Small Dataset First

Verify transformations work correctly.

### 4. Monitor Cluster Health

Watch for resource pressure during reindex.

### 5. Use Sliced Scroll for Large Indices

Parallelize for better performance.

### 6. Optimize Destination Index

Disable refresh and replicas during reindex.

### 7. Plan for Active Indices

Handle documents written during reindex.

## Conclusion

Reindexing in Elasticsearch enables:

1. **Mapping changes** without data loss
2. **Zero-downtime** migrations with aliases
3. **Data transformation** with scripts
4. **Cross-cluster** migration
5. **Performance optimization** with parallel processing

Proper reindex strategies ensure smooth data migrations and index updates.
