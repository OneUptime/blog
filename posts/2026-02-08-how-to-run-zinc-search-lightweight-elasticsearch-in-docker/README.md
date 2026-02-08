# How to Run Zinc Search (Lightweight Elasticsearch) in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Zinc Search, Elasticsearch Alternative, Search, Observability, DevOps, Golang

Description: Deploy Zinc Search in Docker as a resource-efficient Elasticsearch alternative with a compatible API and built-in web UI.

---

Zinc Search (now called ZincObserve or OpenObserve in its latest iteration) is a lightweight search engine that provides Elasticsearch-compatible APIs while using significantly fewer resources. It was built in Go and designed for teams that need log search, application search, or observability data ingestion without the operational overhead of running an Elasticsearch cluster.

A single Zinc instance can handle millions of documents while running on a few hundred megabytes of memory. Compare that to Elasticsearch, which typically needs several gigabytes just to start. For development environments, small-to-medium deployments, and log aggregation use cases, Zinc is an excellent alternative.

## Quick Start

Run Zinc with a single command:

```bash
# Start Zinc Search with default credentials
docker run -d \
  --name zinc \
  -p 4080:4080 \
  -e ZINC_FIRST_ADMIN_USER=admin \
  -e ZINC_FIRST_ADMIN_PASSWORD=Complexpass#123 \
  -e ZINC_DATA_PATH=/data \
  -v zinc_data:/data \
  public.ecr.aws/zinclabs/zinc:latest
```

Open `http://localhost:4080` to access the Zinc web UI. Log in with `admin` / `Complexpass#123`.

## Docker Compose Setup

```yaml
# docker-compose.yml - Zinc Search for development
version: "3.8"

services:
  zinc:
    image: public.ecr.aws/zinclabs/zinc:latest
    ports:
      # Web UI and API
      - "4080:4080"
    environment:
      # Initial admin credentials
      ZINC_FIRST_ADMIN_USER: admin
      ZINC_FIRST_ADMIN_PASSWORD: Complexpass#123
      # Data storage path inside the container
      ZINC_DATA_PATH: /data
      # Enable Prometheus metrics endpoint
      ZINC_PROMETHEUS_ENABLE: "true"
    volumes:
      # Persist index data
      - zinc_data:/data
    restart: unless-stopped

volumes:
  zinc_data:
```

Start the service:

```bash
# Launch Zinc
docker compose up -d

# Verify it is running
curl -u admin:Complexpass#123 http://localhost:4080/api/index
```

## Creating Indexes

Zinc uses indexes to organize data, similar to Elasticsearch. You can create an index with a schema or let Zinc auto-detect field types:

```bash
# Create an index with explicit field mappings
curl -X POST http://localhost:4080/api/index \
  -u admin:Complexpass#123 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "products",
    "storage_type": "disk",
    "mappings": {
      "properties": {
        "name": { "type": "text", "index": true, "store": true, "highlightable": true },
        "description": { "type": "text", "index": true, "store": true, "highlightable": true },
        "category": { "type": "keyword", "index": true, "store": true, "sortable": true },
        "brand": { "type": "keyword", "index": true, "store": true },
        "price": { "type": "numeric", "index": true, "store": true, "sortable": true },
        "in_stock": { "type": "bool", "index": true, "store": true },
        "created_at": { "type": "date", "index": true, "store": true, "sortable": true }
      }
    }
  }'

# List all indexes
curl -u admin:Complexpass#123 http://localhost:4080/api/index
```

## Indexing Documents

Zinc accepts documents through its native API and an Elasticsearch-compatible API:

```bash
# Index a single document using the Zinc API
curl -X POST http://localhost:4080/api/products/_doc \
  -u admin:Complexpass#123 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Wireless Bluetooth Headphones",
    "description": "Premium noise-cancelling headphones with 30-hour battery life",
    "category": "Electronics",
    "brand": "AudioTech",
    "price": 149.99,
    "in_stock": true,
    "created_at": "2024-01-15T10:30:00Z"
  }'

# Bulk index multiple documents (Elasticsearch-compatible format)
curl -X POST http://localhost:4080/api/_bulk \
  -u admin:Complexpass#123 \
  -H "Content-Type: application/json" \
  -d '
{"index": {"_index": "products", "_id": "prod-002"}}
{"name": "Mechanical Gaming Keyboard", "description": "RGB backlit with Cherry MX switches", "category": "Electronics", "brand": "KeyMaster", "price": 89.99, "in_stock": true}
{"index": {"_index": "products", "_id": "prod-003"}}
{"name": "Organic Cotton T-Shirt", "description": "Soft organic cotton in multiple colors", "category": "Clothing", "brand": "EcoWear", "price": 29.99, "in_stock": true}
{"index": {"_index": "products", "_id": "prod-004"}}
{"name": "Running Shoes Pro", "description": "Lightweight with cushioned sole for long runs", "category": "Footwear", "brand": "SpeedRun", "price": 119.99, "in_stock": false}
'
```

## Searching

Zinc supports Elasticsearch-compatible search queries:

```bash
# Simple search across all fields
curl -X POST http://localhost:4080/api/products/_search \
  -u admin:Complexpass#123 \
  -H "Content-Type: application/json" \
  -d '{
    "search_type": "match",
    "query": {
      "term": "bluetooth wireless"
    },
    "from": 0,
    "max_results": 10,
    "_source": ["name", "price", "category"]
  }'

# Search with field-specific queries
curl -X POST http://localhost:4080/api/products/_search \
  -u admin:Complexpass#123 \
  -H "Content-Type: application/json" \
  -d '{
    "search_type": "querystring",
    "query": {
      "term": "category:Electronics AND price:>50"
    },
    "sort_fields": ["-price"],
    "from": 0,
    "max_results": 10
  }'

# Search with highlighting
curl -X POST http://localhost:4080/api/products/_search \
  -u admin:Complexpass#123 \
  -H "Content-Type: application/json" \
  -d '{
    "search_type": "match",
    "query": {
      "term": "headphones"
    },
    "max_results": 10,
    "highlight": {
      "fields": {
        "name": {},
        "description": {}
      }
    }
  }'

# Elasticsearch-compatible search API
curl -X POST http://localhost:4080/es/products/_search \
  -u admin:Complexpass#123 \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "bool": {
        "must": [
          { "match": { "name": "keyboard" } }
        ],
        "filter": [
          { "term": { "in_stock": true } }
        ]
      }
    },
    "sort": [
      { "price": "asc" }
    ]
  }'
```

## Log Ingestion

Zinc works well as a log aggregation backend. Here is how to send application logs:

```bash
# Send log entries to a logs index
curl -X POST http://localhost:4080/api/_bulk \
  -u admin:Complexpass#123 \
  -H "Content-Type: application/json" \
  -d '
{"index": {"_index": "app-logs"}}
{"timestamp": "2024-01-15T10:30:00Z", "level": "INFO", "service": "api", "message": "Request processed successfully", "status_code": 200, "duration_ms": 45}
{"index": {"_index": "app-logs"}}
{"timestamp": "2024-01-15T10:30:01Z", "level": "ERROR", "service": "api", "message": "Database connection failed", "error": "connection refused", "duration_ms": 5000}
{"index": {"_index": "app-logs"}}
{"timestamp": "2024-01-15T10:30:02Z", "level": "WARN", "service": "worker", "message": "Queue backlog exceeding threshold", "queue_size": 1500}
'
```

## Fluentd to Zinc Pipeline

Forward logs from Fluentd to Zinc:

```yaml
# docker-compose.yml - Log pipeline with Fluentd and Zinc
version: "3.8"

services:
  zinc:
    image: public.ecr.aws/zinclabs/zinc:latest
    ports:
      - "4080:4080"
    environment:
      ZINC_FIRST_ADMIN_USER: admin
      ZINC_FIRST_ADMIN_PASSWORD: Complexpass#123
      ZINC_DATA_PATH: /data
    volumes:
      - zinc_data:/data

  fluentd:
    build:
      context: ./fluentd
      dockerfile: Dockerfile
    volumes:
      - ./fluentd/fluent.conf:/fluentd/etc/fluent.conf
    ports:
      - "24224:24224"
    depends_on:
      - zinc

  # Example app that logs to Fluentd
  app:
    image: nginx:alpine
    logging:
      driver: fluentd
      options:
        fluentd-address: localhost:24224
        tag: nginx.access

volumes:
  zinc_data:
```

Fluentd configuration to forward logs to Zinc:

```
# fluentd/fluent.conf - Forward logs to Zinc
<source>
  @type forward
  port 24224
</source>

<match **>
  @type elasticsearch
  host zinc
  port 4080
  scheme http
  user admin
  password Complexpass#123
  index_name fluentd-logs
  type_name _doc
  logstash_format true
  logstash_prefix fluentd
  flush_interval 5s
</match>
```

## Python Client

```python
# zinc_client.py - Zinc Search Python integration
import requests
import json

ZINC_URL = "http://localhost:4080"
AUTH = ("admin", "Complexpass#123")

def create_index(name, mappings):
    """Create an index with field mappings."""
    response = requests.post(
        f"{ZINC_URL}/api/index",
        auth=AUTH,
        json={"name": name, "mappings": mappings}
    )
    return response.json()

def index_document(index, doc, doc_id=None):
    """Index a single document."""
    url = f"{ZINC_URL}/api/{index}/_doc"
    if doc_id:
        url += f"/{doc_id}"
    response = requests.post(url, auth=AUTH, json=doc)
    return response.json()

def search(index, query, max_results=10):
    """Search an index."""
    response = requests.post(
        f"{ZINC_URL}/api/{index}/_search",
        auth=AUTH,
        json={
            "search_type": "match",
            "query": {"term": query},
            "max_results": max_results
        }
    )
    return response.json()

# Usage
result = search("products", "bluetooth")
for hit in result.get("hits", {}).get("hits", []):
    print(f"{hit['_source']['name']} - ${hit['_source']['price']}")
```

## Monitoring

```bash
# Check cluster health
curl -u admin:Complexpass#123 http://localhost:4080/api/healthz

# Get index statistics
curl -u admin:Complexpass#123 http://localhost:4080/api/products/_mapping

# Get Prometheus metrics
curl -u admin:Complexpass#123 http://localhost:4080/metrics
```

## Summary

Zinc Search brings Elasticsearch-compatible search to resource-constrained environments. It uses a fraction of the memory and disk space, starts instantly, and provides a built-in web UI for exploring your data. The Elasticsearch-compatible APIs mean many existing tools and client libraries work without modification. For log aggregation, application search, and small-to-medium datasets, Zinc delivers comparable search functionality at a much lower operational cost. The Docker deployment requires zero configuration beyond setting admin credentials, making it one of the easiest search engines to get running.
