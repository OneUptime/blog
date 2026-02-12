# How to Index Data into Amazon OpenSearch

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, OpenSearch, Indexing, Data Engineering, Search

Description: Learn how to index data into Amazon OpenSearch Service using the REST API, Python clients, and bulk operations with best practices for performance and mapping.

---

Getting data into OpenSearch is straightforward for small datasets but gets tricky at scale. A single document index takes milliseconds; indexing a billion documents without bringing your cluster to its knees requires careful planning. This post covers everything from your first document to high-throughput bulk indexing pipelines.

## Your First Document

Let's start simple. Index a single document using the REST API.

This indexes a single log event into an OpenSearch index.

```bash
curl -XPUT "https://vpc-my-domain.us-east-1.es.amazonaws.com/app-logs/_doc/1" \
  -H "Content-Type: application/json" \
  -u admin:Admin\$ecure123! \
  -d '{
    "@timestamp": "2026-02-12T10:30:00Z",
    "level": "ERROR",
    "service": "payment-service",
    "message": "Failed to process payment for order #12345",
    "host": "payment-svc-3.internal",
    "trace_id": "abc123def456",
    "status_code": 500,
    "response_time_ms": 2340
  }'
```

If you don't specify an ID, OpenSearch generates one automatically. Use auto-generated IDs unless you need to update documents by ID.

```bash
# Auto-generated ID (faster for write-heavy workloads)
curl -XPOST "https://vpc-my-domain.us-east-1.es.amazonaws.com/app-logs/_doc" \
  -H "Content-Type: application/json" \
  -u admin:Admin\$ecure123! \
  -d '{
    "@timestamp": "2026-02-12T10:31:00Z",
    "level": "INFO",
    "service": "user-service",
    "message": "User login successful"
  }'
```

## Setting Up Index Mappings

Before indexing data, define your mappings. Mappings tell OpenSearch how to interpret each field - as text, keyword, number, date, etc.

This creates an index with explicit mappings for a log analytics use case.

```bash
curl -XPUT "https://vpc-my-domain.us-east-1.es.amazonaws.com/app-logs" \
  -H "Content-Type: application/json" \
  -u admin:Admin\$ecure123! \
  -d '{
    "settings": {
      "number_of_shards": 3,
      "number_of_replicas": 1,
      "index.refresh_interval": "10s",
      "index.max_result_window": 50000
    },
    "mappings": {
      "properties": {
        "@timestamp": {
          "type": "date",
          "format": "strict_date_optional_time||epoch_millis"
        },
        "level": {
          "type": "keyword"
        },
        "service": {
          "type": "keyword"
        },
        "message": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "host": {
          "type": "keyword"
        },
        "trace_id": {
          "type": "keyword"
        },
        "status_code": {
          "type": "integer"
        },
        "response_time_ms": {
          "type": "float"
        },
        "metadata": {
          "type": "object",
          "dynamic": true
        },
        "tags": {
          "type": "keyword"
        }
      }
    }
  }'
```

Key mapping decisions:
- Use `keyword` for fields you filter or aggregate on (never full-text searched)
- Use `text` for fields you need to search with free-text queries
- Use multi-fields (`text` + `keyword`) when you need both search and aggregation on the same field
- Disable indexing on fields you only store but never query

## Indexing with Python

For application-level indexing, use the opensearch-py client.

This Python script indexes documents into OpenSearch with proper authentication.

```python
from opensearchpy import OpenSearch, RequestsHttpConnection
from requests_aws4auth import AWS4Auth
import boto3

# AWS authentication
credentials = boto3.Session().get_credentials()
awsauth = AWS4Auth(
    credentials.access_key,
    credentials.secret_key,
    'us-east-1',
    'es',
    session_token=credentials.token
)

# Create the client
client = OpenSearch(
    hosts=[{'host': 'vpc-my-domain.us-east-1.es.amazonaws.com', 'port': 443}],
    http_auth=awsauth,
    use_ssl=True,
    verify_certs=True,
    connection_class=RequestsHttpConnection
)

# Index a single document
doc = {
    '@timestamp': '2026-02-12T10:30:00Z',
    'level': 'ERROR',
    'service': 'payment-service',
    'message': 'Payment processing failed for order #12345',
    'host': 'payment-svc-3.internal',
    'status_code': 500,
    'response_time_ms': 2340
}

response = client.index(
    index='app-logs',
    body=doc,
    refresh=False  # Don't refresh after every document
)

print(f"Indexed: {response['_id']}")
```

## Bulk Indexing

For any serious volume of data, always use the bulk API. It's dramatically more efficient than indexing documents one at a time.

This Python function indexes documents in bulk with error handling and retries.

```python
from opensearchpy import OpenSearch, helpers
import json
import time

def bulk_index(client, index_name, documents, chunk_size=500):
    """Index documents in bulk with error handling."""

    def generate_actions(docs):
        for doc in docs:
            yield {
                '_index': index_name,
                '_source': doc
            }

    success_count = 0
    error_count = 0
    errors = []

    # Use the streaming_bulk helper for memory efficiency
    for ok, result in helpers.streaming_bulk(
        client,
        generate_actions(documents),
        chunk_size=chunk_size,
        max_retries=3,
        initial_backoff=1,
        max_backoff=30,
        raise_on_error=False,
        raise_on_exception=False
    ):
        if ok:
            success_count += 1
        else:
            error_count += 1
            errors.append(result)

    print(f"Indexed {success_count} documents, {error_count} errors")
    if errors:
        print(f"Sample errors: {errors[:5]}")

    return success_count, error_count

# Generate sample documents
documents = [
    {
        '@timestamp': f'2026-02-12T{h:02d}:{m:02d}:00Z',
        'level': 'INFO',
        'service': f'service-{i % 5}',
        'message': f'Request processed in {i * 10}ms',
        'host': f'host-{i % 10}.internal',
        'status_code': 200,
        'response_time_ms': i * 10
    }
    for i in range(10000)
    for h in range(24)
    for m in [0, 30]
]

bulk_index(client, 'app-logs', documents, chunk_size=1000)
```

## Raw Bulk API

If you want lower-level control, use the bulk API directly. The format is newline-delimited JSON (NDJSON) with alternating action and document lines.

This sends a raw bulk indexing request using the REST API.

```bash
curl -XPOST "https://vpc-my-domain.us-east-1.es.amazonaws.com/_bulk" \
  -H "Content-Type: application/x-ndjson" \
  -u admin:Admin\$ecure123! \
  --data-binary '
{"index": {"_index": "app-logs"}}
{"@timestamp": "2026-02-12T10:00:00Z", "level": "INFO", "message": "Request 1"}
{"index": {"_index": "app-logs"}}
{"@timestamp": "2026-02-12T10:01:00Z", "level": "WARN", "message": "Request 2"}
{"index": {"_index": "app-logs"}}
{"@timestamp": "2026-02-12T10:02:00Z", "level": "ERROR", "message": "Request 3"}
'
```

## Building a Bulk Indexing Pipeline

For production pipelines that need to index millions of documents, here's a more robust approach.

This pipeline reads data from S3, transforms it, and indexes it into OpenSearch with parallel workers.

```python
import boto3
import json
from opensearchpy import OpenSearch, helpers, RequestsHttpConnection
from requests_aws4auth import AWS4Auth
from concurrent.futures import ThreadPoolExecutor, as_completed
import gzip

def create_client():
    credentials = boto3.Session().get_credentials()
    awsauth = AWS4Auth(
        credentials.access_key, credentials.secret_key,
        'us-east-1', 'es', session_token=credentials.token
    )
    return OpenSearch(
        hosts=[{'host': 'vpc-my-domain.us-east-1.es.amazonaws.com', 'port': 443}],
        http_auth=awsauth,
        use_ssl=True,
        verify_certs=True,
        connection_class=RequestsHttpConnection,
        timeout=120,
        max_retries=3,
        retry_on_timeout=True
    )

def process_s3_file(s3_key):
    """Download a file from S3 and index its contents."""
    s3 = boto3.client('s3')
    client = create_client()

    # Download and decompress
    response = s3.get_object(Bucket='my-data-bucket', Key=s3_key)
    content = gzip.decompress(response['Body'].read())

    documents = []
    for line in content.decode('utf-8').strip().split('\n'):
        try:
            doc = json.loads(line)
            documents.append(doc)
        except json.JSONDecodeError:
            continue

    # Bulk index
    success, errors = 0, 0
    for ok, result in helpers.streaming_bulk(
        client,
        ({'_index': 'app-logs', '_source': doc} for doc in documents),
        chunk_size=1000,
        max_retries=3,
        raise_on_error=False
    ):
        if ok:
            success += 1
        else:
            errors += 1

    return s3_key, success, errors

def index_from_s3(prefix):
    """Index all files under an S3 prefix using parallel workers."""
    s3 = boto3.client('s3')
    paginator = s3.get_paginator('list_objects_v2')

    keys = []
    for page in paginator.paginate(Bucket='my-data-bucket', Prefix=prefix):
        for obj in page.get('Contents', []):
            keys.append(obj['Key'])

    print(f"Found {len(keys)} files to index")

    total_success = 0
    total_errors = 0

    # Process files in parallel
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = {executor.submit(process_s3_file, key): key for key in keys}
        for future in as_completed(futures):
            key, success, errors = future.result()
            total_success += success
            total_errors += errors
            print(f"Processed {key}: {success} indexed, {errors} errors")

    print(f"Total: {total_success} indexed, {total_errors} errors")

# Run the pipeline
index_from_s3('raw/logs/2026/02/12/')
```

## Performance Tuning for Bulk Indexing

When indexing large volumes, tune these settings to maximize throughput.

This temporarily adjusts index settings for faster bulk indexing.

```bash
# Before bulk indexing: reduce refresh interval and replica count
curl -XPUT "https://vpc-my-domain.us-east-1.es.amazonaws.com/app-logs/_settings" \
  -H "Content-Type: application/json" \
  -u admin:Admin\$ecure123! \
  -d '{
    "index": {
      "refresh_interval": "30s",
      "number_of_replicas": 0,
      "translog.durability": "async",
      "translog.sync_interval": "30s"
    }
  }'

# After bulk indexing: restore settings
curl -XPUT "https://vpc-my-domain.us-east-1.es.amazonaws.com/app-logs/_settings" \
  -H "Content-Type: application/json" \
  -u admin:Admin\$ecure123! \
  -d '{
    "index": {
      "refresh_interval": "10s",
      "number_of_replicas": 1,
      "translog.durability": "request"
    }
  }'
```

## Index Aliases

Use aliases to manage index rotation without changing client code.

```bash
# Create an alias pointing to the current index
curl -XPOST "https://vpc-my-domain.us-east-1.es.amazonaws.com/_aliases" \
  -H "Content-Type: application/json" \
  -u admin:Admin\$ecure123! \
  -d '{
    "actions": [
      {"add": {"index": "app-logs-2026-02-12", "alias": "app-logs-write"}},
      {"add": {"index": "app-logs-*", "alias": "app-logs-read"}}
    ]
  }'
```

Index to the write alias, query from the read alias. When you rotate indices, just update the alias.

## Monitoring Indexing Performance

Check these metrics to ensure your indexing pipeline is healthy:

```bash
# Check indexing rate and latency
curl -XGET "https://vpc-my-domain.us-east-1.es.amazonaws.com/_nodes/stats/indices/indexing" \
  -u admin:Admin\$ecure123! | python3 -m json.tool
```

Watch for:
- **indexing.index_total** - Total documents indexed
- **indexing.index_time_in_millis** - Time spent indexing
- **indexing.index_failed** - Failed index operations
- **Bulk rejections** - The thread pool is full, back off

For setting up your OpenSearch domain, see our guide on [setting up Amazon OpenSearch Service domains](https://oneuptime.com/blog/post/set-up-amazon-opensearch-service-domains/view). Once your data is indexed, check out [using OpenSearch Dashboards](https://oneuptime.com/blog/post/opensearch-dashboards-for-visualization/view) for visualization.

The key to fast indexing is batching, proper bulk sizes (1000-5000 documents per batch), and tuning refresh intervals during heavy loads. Start with the defaults, measure your throughput, and tune from there.
