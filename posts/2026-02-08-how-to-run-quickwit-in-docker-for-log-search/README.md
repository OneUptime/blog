# How to Run Quickwit in Docker for Log Search

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Quickwit, Log Search, Observability, Search, DevOps, Rust

Description: Deploy Quickwit in Docker for cost-effective log and trace search with sub-second query performance on object storage backends.

---

Quickwit is a cloud-native search engine designed for log and trace data. It was built in Rust and takes a fundamentally different approach to search storage. Instead of keeping indexes on local SSDs like Elasticsearch, Quickwit stores its indexes on object storage (S3, MinIO, GCS) and uses local storage only as a cache. This architecture makes it dramatically cheaper to store and search large volumes of observability data.

Quickwit is Elasticsearch-compatible for both indexing and searching, so existing tools and pipelines work with minimal changes. It also natively supports OpenTelemetry for logs and traces, making it a natural fit for modern observability stacks.

## Quick Start

Run Quickwit with local file storage for development:

```bash
# Start Quickwit in standalone mode
docker run -d \
  --name quickwit \
  -p 7280:7280 \
  -v quickwit_data:/quickwit/qwdata \
  quickwit/quickwit \
  run
```

Port 7280 serves both the API and the web UI. Open `http://localhost:7280` to access the Quickwit UI.

## Docker Compose Setup

```yaml
# docker-compose.yml - Quickwit for local log search
version: "3.8"

services:
  quickwit:
    image: quickwit/quickwit
    command: run
    ports:
      # REST API and Web UI
      - "7280:7280"
      # gRPC port for OpenTelemetry
      - "7281:7281"
    environment:
      QW_ENABLE_OPENTELEMETRY_OTLP_EXPORTER: "true"
      QW_ENABLE_JAEGER_EXPORTER: "true"
    volumes:
      # Persist index data and configuration
      - quickwit_data:/quickwit/qwdata
    restart: unless-stopped

volumes:
  quickwit_data:
```

Start the service:

```bash
# Launch Quickwit
docker compose up -d

# Check the API is responding
curl http://localhost:7280/api/v1/version
```

## Creating an Index for Logs

Quickwit uses index configurations in YAML format. Create a log index:

```bash
# Create a log index using the Quickwit API
curl -X POST http://localhost:7280/api/v1/indexes \
  -H "Content-Type: application/yaml" \
  -d '
version: 0.7
index_id: app-logs
doc_mapping:
  field_mappings:
    - name: timestamp
      type: datetime
      input_formats:
        - rfc3339
        - unix_timestamp
      output_format: rfc3339
      fast: true
    - name: level
      type: text
      tokenizer: raw
      fast: true
    - name: service
      type: text
      tokenizer: raw
      fast: true
    - name: message
      type: text
      tokenizer: default
      record: position
    - name: trace_id
      type: text
      tokenizer: raw
    - name: host
      type: text
      tokenizer: raw
      fast: true
    - name: status_code
      type: u64
      fast: true
    - name: duration_ms
      type: f64
      fast: true
  timestamp_field: timestamp
  mode: dynamic
indexing_settings:
  commit_timeout_secs: 10
search_settings:
  default_search_fields:
    - message
retention:
  period: 30 days
  schedule: daily
'
```

## Ingesting Log Data

Send logs to Quickwit using the ingest API:

```bash
# Ingest log entries in NDJSON format (one JSON object per line)
curl -X POST http://localhost:7280/api/v1/app-logs/ingest \
  -H "Content-Type: application/json" \
  -d '
{"timestamp": "2024-01-15T10:30:00Z", "level": "INFO", "service": "api-gateway", "message": "Request processed", "host": "web-01", "status_code": 200, "duration_ms": 45.2}
{"timestamp": "2024-01-15T10:30:01Z", "level": "ERROR", "service": "user-service", "message": "Database connection timeout after 5000ms", "host": "app-02", "status_code": 500, "duration_ms": 5001.0}
{"timestamp": "2024-01-15T10:30:02Z", "level": "WARN", "service": "payment-service", "message": "Retry attempt 2 for payment processing", "host": "app-01", "trace_id": "abc123def456"}
{"timestamp": "2024-01-15T10:30:03Z", "level": "INFO", "service": "api-gateway", "message": "Health check passed", "host": "web-01", "status_code": 200, "duration_ms": 2.1}
{"timestamp": "2024-01-15T10:30:04Z", "level": "ERROR", "service": "email-service", "message": "SMTP connection refused to mail.example.com:587", "host": "worker-01"}
'
```

## Searching Logs

Quickwit supports a query language similar to Elasticsearch:

```bash
# Search for error logs
curl "http://localhost:7280/api/v1/app-logs/search?query=level:ERROR"

# Full-text search across the message field
curl "http://localhost:7280/api/v1/app-logs/search?query=connection+timeout"

# Filter by service and time range
curl "http://localhost:7280/api/v1/app-logs/search?query=service:api-gateway&start_timestamp=1705312200&end_timestamp=1705315800"

# Search with aggregations for log level distribution
curl -X POST http://localhost:7280/api/v1/app-logs/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "*",
    "max_hits": 0,
    "aggs": {
      "level_counts": {
        "terms": {
          "field": "level"
        }
      }
    }
  }'

# Histogram of log volumes over time
curl -X POST http://localhost:7280/api/v1/app-logs/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "*",
    "max_hits": 0,
    "aggs": {
      "logs_over_time": {
        "date_histogram": {
          "field": "timestamp",
          "fixed_interval": "1h"
        }
      }
    }
  }'

# Find slow requests
curl "http://localhost:7280/api/v1/app-logs/search?query=duration_ms:>1000&sort_by=-duration_ms"
```

## Elasticsearch-Compatible API

Quickwit implements the Elasticsearch search API, so tools like Kibana and Grafana work:

```bash
# Use the Elasticsearch-compatible endpoint
curl -X POST http://localhost:7280/api/v1/_elastic/app-logs/_search \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "bool": {
        "must": [
          { "match": { "message": "timeout" } }
        ],
        "filter": [
          { "term": { "level": "ERROR" } }
        ]
      }
    },
    "size": 10,
    "sort": [
      { "timestamp": "desc" }
    ]
  }'
```

## OpenTelemetry Integration

Quickwit natively accepts OpenTelemetry logs and traces over gRPC:

```yaml
# docker-compose.yml - Quickwit with OpenTelemetry Collector
version: "3.8"

services:
  quickwit:
    image: quickwit/quickwit
    command: run
    ports:
      - "7280:7280"
      - "7281:7281"
    environment:
      QW_ENABLE_OPENTELEMETRY_OTLP_EXPORTER: "true"
    volumes:
      - quickwit_data:/quickwit/qwdata

  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    command: ["--config", "/etc/otel-collector-config.yaml"]
    volumes:
      - ./otel-collector-config.yaml:/etc/otel-collector-config.yaml
    ports:
      - "4317:4317"   # OTLP gRPC receiver
      - "4318:4318"   # OTLP HTTP receiver
    depends_on:
      - quickwit

volumes:
  quickwit_data:
```

OpenTelemetry Collector configuration:

```yaml
# otel-collector-config.yaml - Forward telemetry to Quickwit
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 5s

exporters:
  otlp/quickwit:
    endpoint: quickwit:7281
    tls:
      insecure: true

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/quickwit]
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/quickwit]
```

## Using with MinIO for Object Storage

For a production-like setup, use MinIO as the storage backend:

```yaml
# docker-compose.yml - Quickwit with MinIO storage
version: "3.8"

services:
  quickwit:
    image: quickwit/quickwit
    command: run
    ports:
      - "7280:7280"
      - "7281:7281"
    environment:
      AWS_ACCESS_KEY_ID: minioadmin
      AWS_SECRET_ACCESS_KEY: minioadmin
      AWS_REGION: us-east-1
      QW_DEFAULT_INDEX_ROOT_URI: s3://quickwit/indexes
      QW_METASTORE_URI: s3://quickwit/indexes
      AWS_ENDPOINT: http://minio:9000
    volumes:
      - quickwit_data:/quickwit/qwdata
    depends_on:
      minio-init:
        condition: service_completed_successfully

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio_data:/data

  minio-init:
    image: minio/mc
    entrypoint: >
      /bin/sh -c "
      mc alias set myminio http://minio:9000 minioadmin minioadmin;
      mc mb myminio/quickwit --ignore-existing;
      exit 0;
      "
    depends_on:
      - minio

volumes:
  quickwit_data:
  minio_data:
```

## Grafana Integration

Connect Grafana to Quickwit for log visualization:

```yaml
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      GF_INSTALL_PLUGINS: https://github.com/quickwit-oss/quickwit-datasource/releases/download/v0.4.1/quickwit-quickwit-datasource-0.4.1.zip;quickwit-quickwit-datasource
    depends_on:
      - quickwit
```

## Management Commands

```bash
# List all indexes
curl http://localhost:7280/api/v1/indexes

# Get index metadata
curl http://localhost:7280/api/v1/indexes/app-logs

# Get index stats (document count, size)
curl http://localhost:7280/api/v1/indexes/app-logs/describe

# Delete an index and all its data
curl -X DELETE http://localhost:7280/api/v1/indexes/app-logs

# Force a merge of index splits for better query performance
curl -X PUT http://localhost:7280/api/v1/indexes/app-logs/merge
```

## Summary

Quickwit is purpose-built for log and trace search. Its object storage-first architecture means you can store months or years of observability data at a fraction of the cost of Elasticsearch. The sub-second search performance, Elasticsearch-compatible APIs, and native OpenTelemetry support make it a modern alternative for observability use cases. The Docker setup works well for development, and the MinIO integration lets you test the object storage architecture locally before deploying to S3 or GCS in production.
