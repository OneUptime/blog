# How to Update Multiple Documents by Query in Elasticsearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Update By Query, Bulk Operations, Painless Script, Data Management

Description: Learn how to update multiple documents in Elasticsearch using the Update By Query API. This guide covers query syntax, Painless scripting, conflict handling, and performance optimization for batch updates.

The Update By Query API allows you to update multiple documents that match a query in a single operation. This is essential for bulk data modifications, schema migrations, and maintaining data consistency.

## Basic Update By Query

The simplest form updates all documents matching a query:

```json
POST /products/_update_by_query
{
  "query": {
    "term": {
      "status": "draft"
    }
  },
  "script": {
    "source": "ctx._source.status = 'published'"
  }
}
```

Response includes operation statistics:

```json
{
  "took": 125,
  "timed_out": false,
  "total": 150,
  "updated": 150,
  "deleted": 0,
  "batches": 2,
  "version_conflicts": 0,
  "noops": 0,
  "failures": []
}
```

```mermaid
graph LR
    A[Update By Query Request] --> B[Find Matching Documents]
    B --> C[Apply Script to Each]
    C --> D[Reindex Updated Docs]
    D --> E[Return Statistics]
```

## Painless Scripting Basics

Painless is Elasticsearch's scripting language for document manipulation:

### Setting Field Values

```json
POST /products/_update_by_query
{
  "query": { "match_all": {} },
  "script": {
    "source": "ctx._source.last_updated = params.timestamp",
    "params": {
      "timestamp": "2024-01-15T10:30:00Z"
    }
  }
}
```

### Conditional Updates

```json
POST /products/_update_by_query
{
  "query": {
    "range": {
      "stock": { "lte": 10 }
    }
  },
  "script": {
    "source": """
      if (ctx._source.stock <= 0) {
        ctx._source.status = 'out_of_stock';
      } else {
        ctx._source.status = 'low_stock';
      }
    """
  }
}
```

### Numeric Operations

```json
// Increment a counter
POST /products/_update_by_query
{
  "query": {
    "term": { "category": "electronics" }
  },
  "script": {
    "source": "ctx._source.view_count += params.increment",
    "params": {
      "increment": 1
    }
  }
}

// Apply percentage discount
POST /products/_update_by_query
{
  "query": {
    "term": { "on_sale": true }
  },
  "script": {
    "source": "ctx._source.price = ctx._source.price * (1 - params.discount)",
    "params": {
      "discount": 0.10
    }
  }
}
```

### Working with Arrays

```json
// Add item to array
POST /products/_update_by_query
{
  "query": {
    "term": { "category": "electronics" }
  },
  "script": {
    "source": """
      if (ctx._source.tags == null) {
        ctx._source.tags = [];
      }
      if (!ctx._source.tags.contains(params.new_tag)) {
        ctx._source.tags.add(params.new_tag);
      }
    """,
    "params": {
      "new_tag": "featured"
    }
  }
}

// Remove item from array
POST /products/_update_by_query
{
  "query": {
    "term": { "tags": "deprecated" }
  },
  "script": {
    "source": "ctx._source.tags.remove(ctx._source.tags.indexOf('deprecated'))"
  }
}
```

### Working with Nested Objects

```json
// Update nested field
POST /products/_update_by_query
{
  "query": {
    "exists": { "field": "metadata" }
  },
  "script": {
    "source": """
      if (ctx._source.metadata == null) {
        ctx._source.metadata = [:];
      }
      ctx._source.metadata.updated_at = params.timestamp;
      ctx._source.metadata.version = (ctx._source.metadata.version ?: 0) + 1;
    """,
    "params": {
      "timestamp": "2024-01-15T10:30:00Z"
    }
  }
}
```

## Query Options

### Limit Documents with max_docs

```json
POST /products/_update_by_query?max_docs=1000
{
  "query": { "match_all": {} },
  "script": {
    "source": "ctx._source.batch_id = params.batch",
    "params": { "batch": "batch_001" }
  }
}
```

### Throttling with requests_per_second

```json
POST /products/_update_by_query?requests_per_second=500
{
  "query": { "match_all": {} },
  "script": {
    "source": "ctx._source.indexed_at = params.now",
    "params": { "now": "2024-01-15" }
  }
}
```

### Handling Version Conflicts

```json
// Proceed despite conflicts
POST /products/_update_by_query?conflicts=proceed
{
  "query": { "match_all": {} },
  "script": {
    "source": "ctx._source.sync_version += 1"
  }
}
```

### Async Execution

For long-running updates:

```json
POST /products/_update_by_query?wait_for_completion=false
{
  "query": { "match_all": {} },
  "script": {
    "source": "ctx._source.migrated = true"
  }
}

// Response
{
  "task": "node_id:12345"
}

// Check task status
GET /_tasks/node_id:12345

// Cancel if needed
POST /_tasks/node_id:12345/_cancel
```

## Advanced Patterns

### Data Migration

Rename a field across all documents:

```json
POST /products/_update_by_query
{
  "query": {
    "exists": { "field": "old_field_name" }
  },
  "script": {
    "source": """
      ctx._source.new_field_name = ctx._source.old_field_name;
      ctx._source.remove('old_field_name');
    """
  }
}
```

### Type Conversion

Convert string to number:

```json
POST /products/_update_by_query
{
  "query": {
    "exists": { "field": "price_string" }
  },
  "script": {
    "source": """
      def priceStr = ctx._source.price_string;
      if (priceStr != null) {
        ctx._source.price = Double.parseDouble(priceStr.replace('$', '').replace(',', ''));
        ctx._source.remove('price_string');
      }
    """
  }
}
```

### Conditional Deletion

Delete documents that match certain criteria:

```json
POST /products/_update_by_query
{
  "query": {
    "range": {
      "created_at": {
        "lt": "2023-01-01"
      }
    }
  },
  "script": {
    "source": """
      if (ctx._source.status == 'archived') {
        ctx.op = 'delete';
      } else {
        ctx.op = 'noop';
      }
    """
  }
}
```

### Complex Business Logic

```json
POST /orders/_update_by_query
{
  "query": {
    "bool": {
      "must": [
        { "term": { "status": "pending" } },
        { "range": { "created_at": { "lt": "now-7d" } } }
      ]
    }
  },
  "script": {
    "source": """
      // Calculate days since order
      def orderDate = ZonedDateTime.parse(ctx._source.created_at);
      def now = ZonedDateTime.parse(params.now);
      def daysSinceOrder = ChronoUnit.DAYS.between(orderDate, now);

      // Update status based on age
      if (daysSinceOrder > 30) {
        ctx._source.status = 'expired';
        ctx._source.expired_at = params.now;
      } else if (daysSinceOrder > 14) {
        ctx._source.status = 'stale';
        ctx._source.reminder_sent = true;
      }

      ctx._source.last_checked = params.now;
    """,
    "params": {
      "now": "2024-01-15T10:30:00Z"
    }
  }
}
```

## Implementation Examples

### Python

```python
from elasticsearch import Elasticsearch
from datetime import datetime

es = Elasticsearch("http://localhost:9200")

def update_by_query_with_progress(index, query, script, batch_size=1000):
    """Execute update by query with progress tracking."""

    # Start async update
    task = es.update_by_query(
        index=index,
        body={
            "query": query,
            "script": script
        },
        wait_for_completion=False,
        requests_per_second=batch_size
    )

    task_id = task["task"]
    print(f"Started task: {task_id}")

    # Monitor progress
    while True:
        status = es.tasks.get(task_id=task_id)
        task_info = status["task"]

        if status.get("completed"):
            response = status.get("response", {})
            print(f"\nCompleted!")
            print(f"  Updated: {response.get('updated', 0)}")
            print(f"  Failures: {len(response.get('failures', []))}")
            break

        # Show progress
        running_time = task_info.get("running_time_in_nanos", 0) / 1e9
        status_info = task_info.get("status", {})
        total = status_info.get("total", 0)
        updated = status_info.get("updated", 0)

        if total > 0:
            progress = (updated / total) * 100
            print(f"Progress: {progress:.1f}% ({updated}/{total}) - {running_time:.1f}s")

        import time
        time.sleep(2)

    return status.get("response", {})

# Usage
result = update_by_query_with_progress(
    index="products",
    query={"term": {"category": "electronics"}},
    script={
        "source": "ctx._source.updated_at = params.now",
        "params": {"now": datetime.utcnow().isoformat()}
    }
)
```

### Batch Update Helper

```python
def batch_update_documents(es, index, updates, id_field="_id"):
    """
    Update multiple documents with different values.

    updates: list of {"id": "doc_id", "changes": {"field": "value"}}
    """

    results = {"success": 0, "failed": 0, "errors": []}

    for update in updates:
        doc_id = update["id"]
        changes = update["changes"]

        try:
            # Build dynamic script
            assignments = "; ".join([
                f"ctx._source.{field} = params.{field}"
                for field in changes.keys()
            ])

            es.update(
                index=index,
                id=doc_id,
                body={
                    "script": {
                        "source": assignments,
                        "params": changes
                    }
                }
            )
            results["success"] += 1

        except Exception as e:
            results["failed"] += 1
            results["errors"].append({"id": doc_id, "error": str(e)})

    return results
```

### Node.js

```javascript
const { Client } = require('@elastic/elasticsearch');
const client = new Client({ node: 'http://localhost:9200' });

async function updateByQueryWithRetry(index, query, script, maxRetries = 3) {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await client.updateByQuery({
        index,
        conflicts: 'proceed',
        refresh: true,
        body: { query, script }
      });

      console.log(`Updated ${response.updated} documents`);

      if (response.version_conflicts > 0) {
        console.log(`${response.version_conflicts} version conflicts`);
      }

      if (response.failures.length > 0) {
        console.log(`${response.failures.length} failures`);
      }

      return response;

    } catch (error) {
      attempt++;
      console.error(`Attempt ${attempt} failed:`, error.message);

      if (attempt >= maxRetries) {
        throw error;
      }

      // Exponential backoff
      await new Promise(resolve =>
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }
}

// Async update with progress monitoring
async function updateWithProgress(index, query, script) {
  // Start async task
  const task = await client.updateByQuery({
    index,
    wait_for_completion: false,
    body: { query, script }
  });

  const taskId = task.task;
  console.log(`Started task: ${taskId}`);

  // Monitor until complete
  while (true) {
    const status = await client.tasks.get({ task_id: taskId });

    if (status.completed) {
      console.log('\nUpdate completed');
      console.log(`  Updated: ${status.response?.updated || 0}`);
      console.log(`  Deleted: ${status.response?.deleted || 0}`);
      console.log(`  Conflicts: ${status.response?.version_conflicts || 0}`);
      return status.response;
    }

    const { total, updated } = status.task.status || {};
    if (total > 0) {
      const percent = ((updated / total) * 100).toFixed(1);
      console.log(`Progress: ${percent}% (${updated}/${total})`);
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// Usage
async function main() {
  await updateByQueryWithRetry(
    'products',
    { term: { status: 'draft' } },
    { source: "ctx._source.status = 'review'" }
  );

  await updateWithProgress(
    'products',
    { match_all: {} },
    {
      source: "ctx._source.last_sync = params.now",
      params: { now: new Date().toISOString() }
    }
  );
}

main().catch(console.error);
```

## Performance Optimization

### 1. Limit Scope with Precise Queries

```json
// Bad - scans entire index
POST /products/_update_by_query
{
  "script": { "source": "ctx._source.processed = true" }
}

// Good - targets specific documents
POST /products/_update_by_query
{
  "query": {
    "bool": {
      "must": [
        { "term": { "status": "pending" } },
        { "range": { "created_at": { "gte": "2024-01-01" } } }
      ]
    }
  },
  "script": { "source": "ctx._source.processed = true" }
}
```

### 2. Use Routing for Large Indexes

```json
POST /products/_update_by_query?routing=category_electronics
{
  "query": {
    "term": { "category": "electronics" }
  },
  "script": {
    "source": "ctx._source.category_updated = true"
  }
}
```

### 3. Adjust Scroll Size

```json
POST /products/_update_by_query?scroll_size=5000
{
  "query": { "match_all": {} },
  "script": { "source": "ctx._source.batch_processed = true" }
}
```

### 4. Disable Refresh During Large Updates

```json
// Pause refresh
PUT /products/_settings
{
  "refresh_interval": "-1"
}

// Run update
POST /products/_update_by_query
{
  "query": { "match_all": {} },
  "script": { "source": "..." }
}

// Restore refresh and force refresh
PUT /products/_settings
{
  "refresh_interval": "1s"
}

POST /products/_refresh
```

## Error Handling

Common errors and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| version_conflict_engine_exception | Document modified during update | Use `conflicts=proceed` or retry |
| script_exception | Invalid Painless script | Check script syntax |
| timeout | Update took too long | Use async mode or throttle |
| rejected_execution | Thread pool exhausted | Reduce requests_per_second |

```json
// Handle all scenarios
POST /products/_update_by_query?conflicts=proceed&timeout=30m&requests_per_second=500
{
  "query": { "match_all": {} },
  "script": {
    "source": """
      try {
        ctx._source.processed = true;
      } catch (Exception e) {
        ctx.op = 'noop';
      }
    """
  }
}
```

## Conclusion

Update By Query is powerful for batch document modifications in Elasticsearch:

1. **Use precise queries** to limit scope and improve performance
2. **Leverage Painless scripts** for complex transformations
3. **Handle conflicts** with `conflicts=proceed` for idempotent updates
4. **Use async mode** for long-running operations
5. **Monitor progress** for large updates
6. **Throttle updates** to prevent cluster overload

With proper use, Update By Query enables efficient data migrations, bulk corrections, and schema evolution without downtime.

---

**Related Reading:**

- [How to Remove a Field from Elasticsearch Documents](https://oneuptime.com/blog/post/2025-12-19-remove-field-elasticsearch-documents/view)
- [How to Bulk Index JSON Data in Elasticsearch](https://oneuptime.com/blog/post/2025-12-19-bulk-index-json-data-elasticsearch/view)
- [How to Handle Unassigned Shards in Elasticsearch](https://oneuptime.com/blog/post/2025-12-19-handle-unassigned-shards-elasticsearch/view)
