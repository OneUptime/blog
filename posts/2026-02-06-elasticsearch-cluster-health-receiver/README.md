# How to Monitor Elasticsearch Cluster Health (Node Status, Shard Count, Pending Tasks) with the Elasticsearch Receiver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Elasticsearch, Cluster Health, Monitoring

Description: Monitor Elasticsearch cluster health including node status, shard counts, and pending tasks using the OpenTelemetry Collector Elasticsearch receiver.

The OpenTelemetry Collector includes a dedicated Elasticsearch receiver that connects to the Elasticsearch cluster APIs and collects health, performance, and resource metrics. This gives you visibility into cluster state, node availability, shard distribution, and pending operations without installing any plugins on your Elasticsearch nodes.

## Collector Configuration

```yaml
# otel-collector-config.yaml
receivers:
  elasticsearch:
    # Elasticsearch cluster endpoint
    endpoint: https://elasticsearch:9200
    # Authentication
    username: monitoring_user
    password: "${ELASTICSEARCH_PASSWORD}"
    # Collection interval
    collection_interval: 30s
    # Skip TLS verification for self-signed certs
    tls:
      insecure_skip_verify: true
    # Collect node-level metrics
    nodes: ["_all"]
    # Enable specific metric groups
    metrics:
      elasticsearch.cluster.health.status:
        enabled: true
      elasticsearch.cluster.shards:
        enabled: true
      elasticsearch.cluster.pending_tasks:
        enabled: true
      elasticsearch.node.operations.completed:
        enabled: true
      elasticsearch.node.fs.disk.available:
        enabled: true

processors:
  batch:
    timeout: 10s
  resource:
    attributes:
      - key: service.name
        value: elasticsearch
        action: upsert

exporters:
  otlp:
    endpoint: "your-backend:4317"
    tls:
      insecure: false

service:
  pipelines:
    metrics:
      receivers: [elasticsearch]
      processors: [resource, batch]
      exporters: [otlp]
```

## Key Cluster Health Metrics

### Cluster Status

```
elasticsearch.cluster.health.status - Cluster status (green, yellow, red)
  green:  All primary and replica shards assigned
  yellow: All primaries assigned, some replicas unassigned
  red:    Some primary shards unassigned (data loss risk)
```

### Shard Metrics

```
elasticsearch.cluster.shards                  - Total shard count
elasticsearch.cluster.health.active_shards    - Active shards
elasticsearch.cluster.health.relocating_shards - Shards being moved
elasticsearch.cluster.health.initializing_shards - Shards being initialized
elasticsearch.cluster.health.unassigned_shards - Unassigned shards
elasticsearch.cluster.health.active_primary_shards - Active primary shards
```

### Pending Tasks

```
elasticsearch.cluster.pending_tasks - Number of pending cluster tasks
```

A growing pending task queue indicates the cluster master node is overloaded.

### Node Status

```
elasticsearch.cluster.health.number_of_nodes       - Total nodes
elasticsearch.cluster.health.number_of_data_nodes   - Data nodes
```

## Creating a Monitoring User

Create a dedicated monitoring user with minimal permissions:

```bash
# Using Elasticsearch API
curl -X POST "https://elasticsearch:9200/_security/user/monitoring_user" \
  -H "Content-Type: application/json" \
  -u "elastic:password" \
  -d '{
    "password": "monitoring_password",
    "roles": ["monitoring_user"],
    "full_name": "OTel Monitoring"
  }'

# Create the monitoring role
curl -X POST "https://elasticsearch:9200/_security/role/monitoring_user" \
  -H "Content-Type: application/json" \
  -u "elastic:password" \
  -d '{
    "cluster": ["monitor"],
    "indices": [{
      "names": ["*"],
      "privileges": ["monitor"]
    }]
  }'
```

## Docker Compose Setup

```yaml
version: "3.8"

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.12.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=true
      - ELASTIC_PASSWORD=changeme
    ports:
      - "9200:9200"
    volumes:
      - es-data:/usr/share/elasticsearch/data

  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    environment:
      - ELASTICSEARCH_PASSWORD=changeme
    volumes:
      - ./otel-config.yaml:/etc/otelcol-contrib/config.yaml
    ports:
      - "4317:4317"

volumes:
  es-data:
```

## Alert Conditions

### Cluster Status Red

```yaml
- alert: ElasticsearchClusterRed
  condition: elasticsearch.cluster.health.status == "red"
  for: 1m
  severity: critical
  message: "Elasticsearch cluster is RED. Primary shards are unassigned."
```

### High Unassigned Shards

```yaml
- alert: ElasticsearchUnassignedShards
  condition: elasticsearch.cluster.health.unassigned_shards > 0
  for: 10m
  severity: warning
  message: "{{ value }} unassigned shards detected."
```

### Node Count Drop

```yaml
- alert: ElasticsearchNodeDown
  condition: elasticsearch.cluster.health.number_of_data_nodes < 3
  for: 2m
  severity: critical
  message: "Expected 3 data nodes, found {{ value }}."
```

### Pending Task Backlog

```yaml
- alert: ElasticsearchPendingTasks
  condition: elasticsearch.cluster.pending_tasks > 50
  for: 5m
  severity: warning
  message: "{{ value }} pending cluster tasks. Master node may be overloaded."
```

## Monitoring Multiple Clusters

For multiple Elasticsearch clusters, use multiple receiver instances:

```yaml
receivers:
  elasticsearch/production:
    endpoint: https://prod-es:9200
    username: monitoring
    password: "${PROD_ES_PASSWORD}"
    collection_interval: 30s

  elasticsearch/staging:
    endpoint: https://staging-es:9200
    username: monitoring
    password: "${STAGING_ES_PASSWORD}"
    collection_interval: 60s

service:
  pipelines:
    metrics:
      receivers: [elasticsearch/production, elasticsearch/staging]
      processors: [resource, batch]
      exporters: [otlp]
```

## Summary

The OpenTelemetry Collector's Elasticsearch receiver provides direct access to cluster health metrics without installing plugins on Elasticsearch nodes. Monitor cluster status (green/yellow/red), shard distribution, pending tasks, and node count. Set up alerts on cluster status changes and unassigned shards to catch issues before they impact search and indexing performance. Use a dedicated monitoring user with minimal permissions for security.
