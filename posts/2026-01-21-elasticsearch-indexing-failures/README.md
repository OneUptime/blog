# How to Debug Elasticsearch Indexing Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Indexing, Troubleshooting, Mapping, Bulk API, Data Ingestion

Description: A comprehensive guide to debugging Elasticsearch indexing failures, covering mapping conflicts, bulk errors, rejection handling, and best practices for reliable data ingestion.

---

Indexing failures in Elasticsearch can result from various issues including mapping conflicts, validation errors, and resource constraints. This guide covers systematic approaches to identifying and resolving indexing problems.

## Common Indexing Error Types

### 1. Mapping Conflicts

```json
{
  "error": {
    "type": "mapper_parsing_exception",
    "reason": "failed to parse field [count] of type [long] in document with id '1'",
    "caused_by": {
      "type": "illegal_argument_exception",
      "reason": "For input string: \"not_a_number\""
    }
  }
}
```

### 2. Version Conflicts

```json
{
  "error": {
    "type": "version_conflict_engine_exception",
    "reason": "[1]: version conflict, required seqNo [3], primary term [1]. current document has seqNo [4] and primary term [1]"
  }
}
```

### 3. Rejection Errors

```json
{
  "error": {
    "type": "es_rejected_execution_exception",
    "reason": "rejected execution of coordinating operation"
  }
}
```

## Diagnosing Indexing Issues

### Check Index Health

```bash
curl -u elastic:password -X GET "localhost:9200/_cat/indices/my-index?v&h=index,health,status,pri,rep,docs.count"
```

### Check Index Mappings

```bash
curl -u elastic:password -X GET "localhost:9200/my-index/_mapping?pretty"
```

### Check Index Settings

```bash
curl -u elastic:password -X GET "localhost:9200/my-index/_settings?pretty"
```

### Validate a Document

```bash
curl -u elastic:password -X POST "localhost:9200/my-index/_validate/query?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "match_all": {}
  }
}'
```

## Mapping-Related Failures

### Dynamic Mapping Issues

**Problem:** Elasticsearch auto-detects field types incorrectly.

```bash
# First document indexes "count" as long
curl -u elastic:password -X POST "localhost:9200/my-index/_doc" -H 'Content-Type: application/json' -d'
{"count": 100}'

# Second document fails because "count" is now a string
curl -u elastic:password -X POST "localhost:9200/my-index/_doc" -H 'Content-Type: application/json' -d'
{"count": "not_a_number"}'
```

**Solution:** Define explicit mappings:

```bash
curl -u elastic:password -X PUT "localhost:9200/my-index" -H 'Content-Type: application/json' -d'
{
  "mappings": {
    "dynamic": "strict",
    "properties": {
      "count": {"type": "long"},
      "message": {"type": "text"},
      "timestamp": {"type": "date"}
    }
  }
}'
```

### Field Type Mismatch

**Problem:** Document field type doesn't match mapping.

**Solution 1:** Transform data before indexing:

```python
import json

def transform_document(doc):
    if 'count' in doc:
        try:
            doc['count'] = int(doc['count'])
        except (ValueError, TypeError):
            doc['count'] = 0
    return doc
```

**Solution 2:** Use ingest pipeline for coercion:

```bash
curl -u elastic:password -X PUT "localhost:9200/_ingest/pipeline/coerce-types" -H 'Content-Type: application/json' -d'
{
  "processors": [
    {
      "convert": {
        "field": "count",
        "type": "long",
        "ignore_missing": true,
        "ignore_failure": true
      }
    }
  ]
}'
```

### Object vs Nested Conflict

**Problem:** Array of objects mapped as object instead of nested.

```bash
# This query won't work correctly with object type
curl -u elastic:password -X GET "localhost:9200/my-index/_search" -H 'Content-Type: application/json' -d'
{
  "query": {
    "bool": {
      "must": [
        {"match": {"items.name": "apple"}},
        {"match": {"items.color": "red"}}
      ]
    }
  }
}'
```

**Solution:** Use nested type:

```bash
curl -u elastic:password -X PUT "localhost:9200/my-index" -H 'Content-Type: application/json' -d'
{
  "mappings": {
    "properties": {
      "items": {
        "type": "nested",
        "properties": {
          "name": {"type": "keyword"},
          "color": {"type": "keyword"}
        }
      }
    }
  }
}'
```

## Bulk Indexing Failures

### Handling Bulk Response Errors

```bash
curl -u elastic:password -X POST "localhost:9200/_bulk" -H 'Content-Type: application/x-ndjson' -d'
{"index": {"_index": "my-index", "_id": "1"}}
{"field": "value1"}
{"index": {"_index": "my-index", "_id": "2"}}
{"field": "value2"}
'
```

Response with errors:

```json
{
  "took": 30,
  "errors": true,
  "items": [
    {
      "index": {
        "_index": "my-index",
        "_id": "1",
        "status": 201,
        "result": "created"
      }
    },
    {
      "index": {
        "_index": "my-index",
        "_id": "2",
        "status": 400,
        "error": {
          "type": "mapper_parsing_exception",
          "reason": "failed to parse"
        }
      }
    }
  ]
}
```

### Script to Process Bulk Response

```python
import requests
import json

def bulk_index_with_error_handling(es_host, documents):
    bulk_body = ""
    for doc in documents:
        bulk_body += json.dumps({"index": {"_index": "my-index"}}) + "\n"
        bulk_body += json.dumps(doc) + "\n"

    response = requests.post(
        f"{es_host}/_bulk",
        headers={"Content-Type": "application/x-ndjson"},
        data=bulk_body,
        auth=("elastic", "password")
    )

    result = response.json()

    if result.get("errors"):
        failed_docs = []
        for i, item in enumerate(result["items"]):
            if "error" in item.get("index", {}):
                failed_docs.append({
                    "document": documents[i],
                    "error": item["index"]["error"]
                })
        return failed_docs
    return []

# Usage
failed = bulk_index_with_error_handling("http://localhost:9200", documents)
for failure in failed:
    print(f"Failed: {failure['error']['reason']}")
```

## Rejection Errors

### Queue Rejection

**Problem:** Write queue is full.

```json
{
  "error": {
    "type": "es_rejected_execution_exception",
    "reason": "rejected execution of processing of [_bulk]"
  }
}
```

**Solution 1:** Increase queue size:

```yaml
# elasticsearch.yml
thread_pool.write.queue_size: 2000
```

**Solution 2:** Implement backoff in client:

```python
import time
import requests
from requests.exceptions import RequestException

def index_with_retry(es_host, doc, max_retries=5, base_delay=1):
    for attempt in range(max_retries):
        try:
            response = requests.post(
                f"{es_host}/my-index/_doc",
                json=doc,
                auth=("elastic", "password")
            )

            if response.status_code == 429:
                delay = base_delay * (2 ** attempt)
                time.sleep(delay)
                continue

            response.raise_for_status()
            return response.json()

        except RequestException as e:
            if attempt == max_retries - 1:
                raise
            time.sleep(base_delay * (2 ** attempt))

    raise Exception("Max retries exceeded")
```

### Memory Pressure

**Check thread pool stats:**

```bash
curl -u elastic:password -X GET "localhost:9200/_nodes/stats/thread_pool?pretty"
```

**Monitor rejection rate:**

```bash
curl -u elastic:password -X GET "localhost:9200/_cat/thread_pool/write?v&h=node_name,name,active,queue,rejected"
```

## Index Write Blocks

### Identify Write Blocks

```bash
curl -u elastic:password -X GET "localhost:9200/my-index/_settings?pretty" | grep -E "blocks|read_only"
```

### Clear Write Block

```bash
# Clear read-only block (usually from disk watermark)
curl -u elastic:password -X PUT "localhost:9200/my-index/_settings" -H 'Content-Type: application/json' -d'
{
  "index.blocks.read_only_allow_delete": null
}'

# Clear all blocks
curl -u elastic:password -X PUT "localhost:9200/_all/_settings" -H 'Content-Type: application/json' -d'
{
  "index.blocks.read_only_allow_delete": null
}'
```

## Ingest Pipeline Failures

### Check Pipeline Errors

```bash
curl -u elastic:password -X GET "localhost:9200/_nodes/stats/ingest?pretty"
```

### Simulate Pipeline

```bash
curl -u elastic:password -X POST "localhost:9200/_ingest/pipeline/my-pipeline/_simulate?pretty" -H 'Content-Type: application/json' -d'
{
  "docs": [
    {
      "_source": {
        "message": "test message",
        "timestamp": "2024-01-21T10:30:00Z"
      }
    }
  ]
}'
```

### Pipeline with Error Handling

```bash
curl -u elastic:password -X PUT "localhost:9200/_ingest/pipeline/safe-pipeline" -H 'Content-Type: application/json' -d'
{
  "processors": [
    {
      "grok": {
        "field": "message",
        "patterns": ["%{TIMESTAMP_ISO8601:timestamp} %{LOGLEVEL:level} %{GREEDYDATA:msg}"],
        "ignore_failure": true
      }
    },
    {
      "date": {
        "field": "timestamp",
        "formats": ["ISO8601"],
        "target_field": "@timestamp",
        "ignore_failure": true
      }
    }
  ],
  "on_failure": [
    {
      "set": {
        "field": "_index",
        "value": "failed-documents"
      }
    },
    {
      "set": {
        "field": "error.message",
        "value": "{{ _ingest.on_failure_message }}"
      }
    }
  ]
}'
```

## Debugging Workflow

### Step 1: Identify the Error

```bash
# Check cluster logs
journalctl -u elasticsearch -n 100 | grep -i error

# Check indexing stats
curl -u elastic:password -X GET "localhost:9200/_stats/indexing?pretty"
```

### Step 2: Test Individual Document

```bash
# Index a single document to see the exact error
curl -u elastic:password -X POST "localhost:9200/my-index/_doc?pretty" -H 'Content-Type: application/json' -d'
{
  "your": "document"
}'
```

### Step 3: Check Mapping

```bash
curl -u elastic:password -X GET "localhost:9200/my-index/_mapping?pretty"
```

### Step 4: Validate Document Against Mapping

```bash
# Use the _validate API
curl -u elastic:password -X POST "localhost:9200/my-index/_doc?dry_run=true" -H 'Content-Type: application/json' -d'
{
  "your": "document"
}'
```

## Best Practices

### 1. Define Explicit Mappings

```bash
curl -u elastic:password -X PUT "localhost:9200/my-index" -H 'Content-Type: application/json' -d'
{
  "settings": {
    "index.mapping.total_fields.limit": 2000
  },
  "mappings": {
    "dynamic": "strict",
    "properties": {
      "field1": {"type": "keyword"},
      "field2": {"type": "text"},
      "field3": {"type": "date"}
    }
  }
}'
```

### 2. Use Index Templates

```bash
curl -u elastic:password -X PUT "localhost:9200/_index_template/my-template" -H 'Content-Type: application/json' -d'
{
  "index_patterns": ["my-index-*"],
  "template": {
    "mappings": {
      "dynamic": "strict",
      "properties": {
        "field1": {"type": "keyword"}
      }
    }
  }
}'
```

### 3. Implement Dead Letter Queue

Route failed documents to a separate index for analysis:

```bash
# Ingest pipeline with DLQ
curl -u elastic:password -X PUT "localhost:9200/_ingest/pipeline/with-dlq" -H 'Content-Type: application/json' -d'
{
  "processors": [...],
  "on_failure": [
    {
      "set": {
        "field": "_index",
        "value": "dlq-{{ _index }}"
      }
    },
    {
      "set": {
        "field": "error",
        "value": {
          "message": "{{ _ingest.on_failure_message }}",
          "processor": "{{ _ingest.on_failure_processor_type }}"
        }
      }
    }
  ]
}'
```

### 4. Monitor Indexing Metrics

```bash
# Indexing rate
curl -u elastic:password -X GET "localhost:9200/_cat/nodes?v&h=name,indexing.index_total,indexing.index_failed"

# Thread pool rejections
curl -u elastic:password -X GET "localhost:9200/_cat/thread_pool/write?v&h=name,rejected"
```

## Summary

Debugging Elasticsearch indexing failures requires:

1. **Identify error type** - mapping, rejection, or validation
2. **Check mappings** - ensure field types match
3. **Test individually** - isolate problematic documents
4. **Handle bulk errors** - process response for failures
5. **Implement retries** - handle transient failures
6. **Use pipelines** - transform and validate data
7. **Monitor continuously** - track rejection rates and failures

With proper error handling and monitoring, you can ensure reliable data ingestion into Elasticsearch.
