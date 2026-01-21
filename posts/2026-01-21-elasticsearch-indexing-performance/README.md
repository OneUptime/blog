# How to Tune Elasticsearch Indexing Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Indexing, Performance, Bulk API, Optimization, Throughput

Description: A comprehensive guide to optimizing Elasticsearch indexing performance, covering bulk indexing, refresh intervals, thread pools, and best practices for high-throughput data ingestion.

---

Fast indexing is crucial for real-time data pipelines, log ingestion, and data migration. Elasticsearch can index thousands of documents per second when properly tuned. This guide covers techniques for maximizing indexing throughput.

## Understanding Indexing

When you index a document, Elasticsearch:

1. Parses and validates the document
2. Applies analyzers to text fields
3. Writes to in-memory buffer
4. Periodically refreshes to make searchable
5. Eventually flushes to disk (segments)

Each step can be optimized.

## Bulk Indexing

### Use the Bulk API

Never index documents one at a time:

```bash
# Bad: Single document requests
curl -X POST "https://localhost:9200/products/_doc" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{"name": "Product 1", "price": 100}'

curl -X POST "https://localhost:9200/products/_doc" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{"name": "Product 2", "price": 200}'

# Good: Bulk request
curl -X POST "https://localhost:9200/_bulk" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '
{"index": {"_index": "products"}}
{"name": "Product 1", "price": 100}
{"index": {"_index": "products"}}
{"name": "Product 2", "price": 200}
'
```

### Optimal Bulk Size

```bash
# Test different bulk sizes to find optimal
# Start with 1000-5000 documents or 5-15 MB per batch

curl -X POST "https://localhost:9200/_bulk" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  --data-binary @bulk_data.ndjson
```

Guidelines:
- Start with 1000 documents per batch
- Aim for 5-15 MB per request
- Monitor and adjust based on performance
- Too large: Memory issues, timeouts
- Too small: Overhead from many requests

### Bulk Request Structure

```json
{"index": {"_index": "products", "_id": "1"}}
{"name": "Product 1", "price": 100}
{"index": {"_index": "products", "_id": "2"}}
{"name": "Product 2", "price": 200}
{"create": {"_index": "products", "_id": "3"}}
{"name": "Product 3", "price": 300}
{"update": {"_index": "products", "_id": "1"}}
{"doc": {"price": 150}}
{"delete": {"_index": "products", "_id": "2"}}
```

### Handle Bulk Errors

```bash
curl -X POST "https://localhost:9200/_bulk" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '...' | jq '.errors, .items[] | select(.index.error)'
```

Always check for partial failures:

```python
response = es.bulk(body=actions)
if response['errors']:
    for item in response['items']:
        if 'error' in item.get('index', {}):
            print(f"Error: {item['index']['error']}")
```

## Refresh Interval

### Increase Refresh Interval

Default is 1 second. Increase for bulk loading:

```bash
# Disable refresh during bulk load
curl -X PUT "https://localhost:9200/products/_settings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "index": {
      "refresh_interval": "-1"
    }
  }'

# After bulk load, re-enable and force refresh
curl -X PUT "https://localhost:9200/products/_settings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "index": {
      "refresh_interval": "1s"
    }
  }'

curl -X POST "https://localhost:9200/products/_refresh" \
  -u elastic:password
```

### Set at Index Creation

```bash
curl -X PUT "https://localhost:9200/products" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "index": {
        "refresh_interval": "30s"
      }
    }
  }'
```

## Replica Settings

### Disable Replicas During Bulk Load

```bash
# Disable replicas
curl -X PUT "https://localhost:9200/products/_settings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "index": {
      "number_of_replicas": 0
    }
  }'

# Perform bulk indexing...

# Re-enable replicas
curl -X PUT "https://localhost:9200/products/_settings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "index": {
      "number_of_replicas": 1
    }
  }'
```

## Thread Pool Configuration

### Index Thread Pool

```yaml
# elasticsearch.yml
thread_pool:
  write:
    size: 8
    queue_size: 1000
```

### Monitor Thread Pools

```bash
curl -X GET "https://localhost:9200/_cat/thread_pool/write?v&h=node_name,name,active,rejected,completed" \
  -u elastic:password
```

## Memory and Buffer Settings

### Index Buffer Size

```yaml
# elasticsearch.yml
indices.memory.index_buffer_size: 20%

# Or absolute value
indices.memory.index_buffer_size: 2gb
```

### Translog Settings

```bash
curl -X PUT "https://localhost:9200/products/_settings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "index": {
      "translog": {
        "durability": "async",
        "sync_interval": "30s",
        "flush_threshold_size": "1gb"
      }
    }
  }'
```

**Warning**: Async translog risks data loss on crash. Use only for bulk loading when data can be re-indexed.

## Mapping Optimization

### Disable Unused Features

```bash
curl -X PUT "https://localhost:9200/products" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "mappings": {
      "properties": {
        "description": {
          "type": "text",
          "norms": false
        },
        "raw_data": {
          "type": "keyword",
          "index": false
        },
        "internal_id": {
          "type": "keyword",
          "doc_values": false
        }
      }
    }
  }'
```

Options:
- `norms: false` - Disable if no relevance scoring needed
- `index: false` - Disable if field not searchable
- `doc_values: false` - Disable if not sorting/aggregating

### Avoid Expensive Analyzers

```bash
# Complex analyzer (slower)
curl -X PUT "https://localhost:9200/slow_index" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "analyzer": {
          "complex": {
            "tokenizer": "standard",
            "filter": ["lowercase", "synonym", "stemmer", "ngram"]
          }
        }
      }
    }
  }'

# Simple analyzer (faster)
curl -X PUT "https://localhost:9200/fast_index" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "analysis": {
        "analyzer": {
          "simple": {
            "tokenizer": "standard",
            "filter": ["lowercase"]
          }
        }
      }
    }
  }'
```

## Parallel Indexing

### Multiple Bulk Requests

Use multiple threads/processes:

```python
from concurrent.futures import ThreadPoolExecutor
from elasticsearch import Elasticsearch
from elasticsearch.helpers import bulk

es = Elasticsearch(['localhost:9200'])

def index_batch(docs):
    actions = [
        {"_index": "products", "_source": doc}
        for doc in docs
    ]
    bulk(es, actions)

# Split data into batches
batches = [docs[i:i+1000] for i in range(0, len(docs), 1000)]

# Index in parallel
with ThreadPoolExecutor(max_workers=4) as executor:
    executor.map(index_batch, batches)
```

### Routing for Parallel Indexing

Distribute indexing across shards:

```bash
curl -X POST "https://localhost:9200/_bulk" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '
{"index": {"_index": "products", "routing": "category_a"}}
{"name": "Product 1", "category": "category_a"}
{"index": {"_index": "products", "routing": "category_b"}}
{"name": "Product 2", "category": "category_b"}
'
```

## Hardware Optimization

### Use SSDs

SSD provides 10-100x better indexing than HDD.

### Increase File Descriptors

```bash
# Check current limit
curl -X GET "https://localhost:9200/_nodes/stats/process?filter_path=**.max_file_descriptors" \
  -u elastic:password

# Set in /etc/security/limits.conf
elasticsearch  -  nofile  65535
```

### Disable Swapping

```bash
# Option 1: Disable swap entirely
sudo swapoff -a

# Option 2: Set swappiness
sudo sysctl vm.swappiness=1

# Option 3: Memory lock in elasticsearch.yml
bootstrap.memory_lock: true
```

## Segment Management

### Force Merge After Bulk Load

```bash
# After bulk indexing is complete
curl -X POST "https://localhost:9200/products/_forcemerge?max_num_segments=1" \
  -u elastic:password
```

**Warning**: Force merge is resource intensive. Run during off-peak hours.

### Monitor Segments

```bash
curl -X GET "https://localhost:9200/_cat/segments/products?v" \
  -u elastic:password
```

## Monitoring Indexing Performance

### Index Stats

```bash
curl -X GET "https://localhost:9200/products/_stats/indexing" \
  -u elastic:password
```

Key metrics:
- `indexing.index_total`: Total documents indexed
- `indexing.index_time_in_millis`: Total indexing time
- `indexing.index_current`: Currently indexing

### Node Stats

```bash
curl -X GET "https://localhost:9200/_nodes/stats/indices/indexing" \
  -u elastic:password
```

### Bulk Rejections

```bash
curl -X GET "https://localhost:9200/_cat/thread_pool/write?v&h=node_name,active,queue,rejected" \
  -u elastic:password
```

If rejections occur, reduce bulk request rate or increase queue size.

## Complete Bulk Loading Example

```bash
# 1. Prepare index for bulk loading
curl -X PUT "https://localhost:9200/products" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "index": {
        "number_of_shards": 3,
        "number_of_replicas": 0,
        "refresh_interval": "-1",
        "translog": {
          "durability": "async",
          "sync_interval": "30s"
        }
      }
    },
    "mappings": {
      "properties": {
        "name": { "type": "text" },
        "price": { "type": "float" },
        "category": { "type": "keyword" },
        "description": {
          "type": "text",
          "norms": false
        }
      }
    }
  }'

# 2. Perform bulk indexing
curl -X POST "https://localhost:9200/_bulk?refresh=false" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  --data-binary @bulk_data.ndjson

# 3. Restore normal settings
curl -X PUT "https://localhost:9200/products/_settings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "index": {
      "number_of_replicas": 1,
      "refresh_interval": "1s",
      "translog": {
        "durability": "request"
      }
    }
  }'

# 4. Force refresh
curl -X POST "https://localhost:9200/products/_refresh" \
  -u elastic:password

# 5. Force merge (optional, during off-peak)
curl -X POST "https://localhost:9200/products/_forcemerge?max_num_segments=1" \
  -u elastic:password
```

## Best Practices Summary

1. **Always use Bulk API** - Never single document requests
2. **Tune bulk size** - 1000-5000 docs or 5-15 MB
3. **Disable refresh** - Set to -1 during bulk load
4. **Remove replicas** - Set to 0 during bulk load
5. **Async translog** - For bulk load only
6. **Parallel indexing** - Multiple bulk request threads
7. **Optimize mappings** - Disable unused features
8. **Use SSDs** - Critical for indexing performance
9. **Monitor rejections** - Watch thread pool queue
10. **Force merge** - After bulk load completes

## Conclusion

Elasticsearch indexing performance depends on:

1. **Bulk API usage** - Batch documents efficiently
2. **Refresh settings** - Balance visibility vs throughput
3. **Replica configuration** - Reduce during bulk load
4. **Hardware** - SSDs and memory are key
5. **Mapping optimization** - Disable unused features

With proper tuning, Elasticsearch can achieve tens of thousands of documents per second on modest hardware.
