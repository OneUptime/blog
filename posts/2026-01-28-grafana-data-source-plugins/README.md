# How to Configure Grafana Data Source Plugins

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, Data Sources, Plugins, Observability, Monitoring

Description: A practical guide to configuring Grafana data source plugins for connecting to various backends like Prometheus, InfluxDB, Elasticsearch, and custom APIs.

---

Data source plugins are the backbone of Grafana's visualization capabilities. They allow Grafana to connect to your monitoring backends, databases, and APIs to pull metrics, logs, and traces for dashboards. This guide walks through configuring both built-in and external data source plugins with practical examples you can apply immediately.

---

## Table of Contents

1. Understanding Data Source Plugins
2. Installing Data Source Plugins
3. Configuring Prometheus Data Source
4. Configuring InfluxDB Data Source
5. Configuring Elasticsearch Data Source
6. Configuring JSON API Data Source
7. Using Provisioning for Configuration as Code
8. Authentication and Security Best Practices
9. Troubleshooting Common Issues
10. Testing Data Source Connections

---

## 1. Understanding Data Source Plugins

Data source plugins define how Grafana communicates with external systems. Each plugin implements a specific protocol or API to fetch data and transform it into a format Grafana can visualize.

```mermaid
flowchart LR
    subgraph Grafana
        DS[Data Source Plugin]
        Q[Query Editor]
        V[Visualization]
    end

    subgraph Backends
        P[Prometheus]
        I[InfluxDB]
        E[Elasticsearch]
        C[Custom API]
    end

    Q --> DS
    DS --> P
    DS --> I
    DS --> E
    DS --> C
    DS --> V
```

Data sources can be categorized into:

| Category | Examples | Use Case |
|----------|----------|----------|
| Time Series | Prometheus, InfluxDB, Graphite | Metrics and performance data |
| Logging | Elasticsearch, Loki | Log aggregation and search |
| Tracing | Jaeger, Tempo, Zipkin | Distributed tracing |
| SQL | PostgreSQL, MySQL, MSSQL | Business metrics from databases |
| Cloud | CloudWatch, Azure Monitor, GCP | Cloud-native monitoring |

---

## 2. Installing Data Source Plugins

Grafana ships with many built-in data sources. For additional plugins, use the Grafana CLI or configure them via environment variables.

### Using Grafana CLI

```bash
# List available plugins
grafana-cli plugins list-remote

# Install a specific plugin
grafana-cli plugins install grafana-piechart-panel

# Install a specific version
grafana-cli plugins install grafana-clock-panel 1.3.0

# Restart Grafana after installation
sudo systemctl restart grafana-server
```

### Using Environment Variables (Docker)

```yaml
# docker-compose.yml
version: '3.8'
services:
  grafana:
    image: grafana/grafana:latest
    environment:
      # Install plugins on container start
      - GF_INSTALL_PLUGINS=grafana-clock-panel,grafana-piechart-panel,yesoreyeram-infinity-datasource
    ports:
      - "3000:3000"
    volumes:
      - grafana-data:/var/lib/grafana

volumes:
  grafana-data:
```

### Using Kubernetes ConfigMap

```yaml
# grafana-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
spec:
  template:
    spec:
      containers:
        - name: grafana
          image: grafana/grafana:latest
          env:
            - name: GF_INSTALL_PLUGINS
              value: "grafana-clock-panel,yesoreyeram-infinity-datasource"
```

---

## 3. Configuring Prometheus Data Source

Prometheus is the most common metrics backend used with Grafana. Here is a complete configuration example.

### Basic Configuration via UI

Navigate to Configuration > Data Sources > Add data source > Prometheus:

```yaml
# Key settings to configure
Name: prometheus-prod
URL: http://prometheus-server:9090
Access: Server (default)  # Grafana backend proxies requests
Scrape interval: 15s      # Match your Prometheus scrape interval
Query timeout: 60s        # For slow queries
HTTP Method: POST         # Better for large queries
```

### Advanced Settings

```yaml
# Custom HTTP headers (useful for auth proxies)
Custom HTTP Headers:
  - Header: X-Scope-OrgID
    Value: tenant-1

# Exemplar configuration for tracing correlation
Exemplars:
  Internal link: enabled
  Data source: tempo-prod
  URL label: traceID

# Performance tuning
Incremental querying: enabled  # Better for range queries
Disable metrics lookup: false  # Keep for auto-complete
```

### Provisioning via YAML

```yaml
# /etc/grafana/provisioning/datasources/prometheus.yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    uid: prometheus-prod
    access: proxy
    url: http://prometheus-server:9090
    isDefault: true
    jsonData:
      httpMethod: POST
      manageAlerts: true
      prometheusType: Prometheus
      prometheusVersion: 2.44.0
      incrementalQuerying: true
      incrementalQueryOverlapWindow: 10m
      exemplarTraceIdDestinations:
        - name: traceID
          datasourceUid: tempo-prod
    editable: false
```

---

## 4. Configuring InfluxDB Data Source

InfluxDB configuration varies between v1.x (InfluxQL) and v2.x (Flux).

### InfluxDB 2.x Configuration

```yaml
# /etc/grafana/provisioning/datasources/influxdb.yaml
apiVersion: 1

datasources:
  - name: InfluxDB
    type: influxdb
    uid: influxdb-prod
    access: proxy
    url: http://influxdb:8086
    jsonData:
      version: Flux
      organization: my-org
      defaultBucket: metrics
      tlsSkipVerify: false
    secureJsonData:
      token: ${INFLUXDB_TOKEN}  # Use environment variable
```

### InfluxDB 1.x Configuration

```yaml
apiVersion: 1

datasources:
  - name: InfluxDB-Legacy
    type: influxdb
    uid: influxdb-legacy
    access: proxy
    url: http://influxdb:8086
    database: telegraf
    user: grafana_reader
    jsonData:
      httpMode: GET
    secureJsonData:
      password: ${INFLUXDB_PASSWORD}
```

### Example Flux Query

```flux
from(bucket: "metrics")
  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)
  |> filter(fn: (r) => r["_measurement"] == "cpu")
  |> filter(fn: (r) => r["_field"] == "usage_idle")
  |> filter(fn: (r) => r["host"] == "server-01")
  |> aggregateWindow(every: v.windowPeriod, fn: mean, createEmpty: false)
  |> yield(name: "mean")
```

---

## 5. Configuring Elasticsearch Data Source

Elasticsearch serves as both a logging and metrics backend. Configuration differs based on your use case.

### Basic Configuration

```yaml
# /etc/grafana/provisioning/datasources/elasticsearch.yaml
apiVersion: 1

datasources:
  - name: Elasticsearch-Logs
    type: elasticsearch
    uid: elasticsearch-logs
    access: proxy
    url: http://elasticsearch:9200
    database: "logs-*"  # Index pattern
    jsonData:
      esVersion: 8.0.0
      timeField: "@timestamp"
      logMessageField: message
      logLevelField: level
      maxConcurrentShardRequests: 5
      includeFrozen: false
    secureJsonData:
      basicAuthPassword: ${ES_PASSWORD}
    basicAuth: true
    basicAuthUser: grafana_reader
```

### With OpenSearch

```yaml
apiVersion: 1

datasources:
  - name: OpenSearch
    type: grafana-opensearch-datasource
    uid: opensearch-prod
    access: proxy
    url: https://opensearch-node:9200
    jsonData:
      database: "application-logs-*"
      flavor: opensearch
      version: 2.11.0
      timeField: "@timestamp"
      logMessageField: message
      logLevelField: severity
      pplEnabled: true  # Enable Piped Processing Language
    secureJsonData:
      basicAuthPassword: ${OPENSEARCH_PASSWORD}
    basicAuth: true
    basicAuthUser: admin
```

---

## 6. Configuring JSON API Data Source

The Infinity data source plugin allows Grafana to query any REST API that returns JSON, CSV, or XML.

### Installation

```bash
grafana-cli plugins install yesoreyeram-infinity-datasource
```

### Configuration

```yaml
# /etc/grafana/provisioning/datasources/infinity.yaml
apiVersion: 1

datasources:
  - name: Custom-API
    type: yesoreyeram-infinity-datasource
    uid: custom-api
    access: proxy
    jsonData:
      tlsSkipVerify: false
      timeout: 30
    secureJsonData:
      bearerToken: ${API_BEARER_TOKEN}
```

### Example Query Configuration

```json
{
  "type": "json",
  "source": "url",
  "url": "https://api.example.com/metrics",
  "url_options": {
    "method": "GET",
    "headers": [
      {
        "key": "Accept",
        "value": "application/json"
      }
    ]
  },
  "root_selector": "data.metrics",
  "columns": [
    {
      "selector": "timestamp",
      "text": "Time",
      "type": "timestamp"
    },
    {
      "selector": "value",
      "text": "Value",
      "type": "number"
    },
    {
      "selector": "host",
      "text": "Host",
      "type": "string"
    }
  ]
}
```

---

## 7. Using Provisioning for Configuration as Code

Provisioning allows you to manage data sources through version-controlled YAML files instead of the UI.

```mermaid
flowchart TB
    subgraph Repository
        Y[datasources.yaml]
        D[dashboards.yaml]
        A[alerting.yaml]
    end

    subgraph "CI/CD Pipeline"
        V[Validate]
        T[Test]
        P[Deploy]
    end

    subgraph Grafana
        PR[Provisioning]
        DS[Data Sources]
        DB[Dashboards]
    end

    Y --> V
    D --> V
    A --> V
    V --> T
    T --> P
    P --> PR
    PR --> DS
    PR --> DB
```

### Directory Structure

```
/etc/grafana/provisioning/
  datasources/
    prometheus.yaml
    influxdb.yaml
    elasticsearch.yaml
  dashboards/
    default.yaml
  alerting/
    rules.yaml
```

### Complete Multi-Environment Example

```yaml
# /etc/grafana/provisioning/datasources/all.yaml
apiVersion: 1

# Delete data sources not defined in this file
deleteDatasources:
  - name: Old-Prometheus
    orgId: 1

datasources:
  # Production Prometheus
  - name: Prometheus-Prod
    type: prometheus
    uid: prom-prod
    access: proxy
    url: ${PROMETHEUS_PROD_URL}
    isDefault: true
    jsonData:
      httpMethod: POST
      timeInterval: 15s

  # Staging Prometheus
  - name: Prometheus-Staging
    type: prometheus
    uid: prom-staging
    access: proxy
    url: ${PROMETHEUS_STAGING_URL}
    jsonData:
      httpMethod: POST
      timeInterval: 30s

  # Loki for logs
  - name: Loki
    type: loki
    uid: loki-prod
    access: proxy
    url: ${LOKI_URL}
    jsonData:
      derivedFields:
        - datasourceUid: tempo-prod
          matcherRegex: "traceID=(\\w+)"
          name: TraceID
          url: "$${__value.raw}"

  # Tempo for traces
  - name: Tempo
    type: tempo
    uid: tempo-prod
    access: proxy
    url: ${TEMPO_URL}
    jsonData:
      tracesToLogs:
        datasourceUid: loki-prod
        tags: ['job', 'instance', 'pod', 'namespace']
        mappedTags: [{ key: 'service.name', value: 'service' }]
        mapTagNamesEnabled: true
        spanStartTimeShift: '-1h'
        spanEndTimeShift: '1h'
        filterByTraceID: true
        filterBySpanID: false
```

---

## 8. Authentication and Security Best Practices

### Using Secrets Management

Never hardcode credentials in provisioning files. Use environment variables or secret management tools.

```yaml
# Reference environment variables
secureJsonData:
  password: ${DB_PASSWORD}
  token: ${API_TOKEN}

# Or use file-based secrets (Kubernetes)
secureJsonData:
  password: $__file{/run/secrets/db-password}
```

### TLS Configuration

```yaml
jsonData:
  tlsAuth: true
  tlsAuthWithCACert: true
  serverName: prometheus.internal  # For SNI
secureJsonData:
  tlsCACert: |
    -----BEGIN CERTIFICATE-----
    ...
    -----END CERTIFICATE-----
  tlsClientCert: |
    -----BEGIN CERTIFICATE-----
    ...
    -----END CERTIFICATE-----
  tlsClientKey: |
    -----BEGIN RSA PRIVATE KEY-----
    ...
    -----END RSA PRIVATE KEY-----
```

### OAuth2 for API Data Sources

```yaml
jsonData:
  oauthPassThru: false  # Use service account, not user token
  httpHeaderName1: Authorization
secureJsonData:
  httpHeaderValue1: Bearer ${SERVICE_ACCOUNT_TOKEN}
```

---

## 9. Troubleshooting Common Issues

### Connection Refused

```bash
# Check if the backend is reachable from Grafana
docker exec -it grafana curl -v http://prometheus:9090/api/v1/status/runtimeinfo

# Check DNS resolution
docker exec -it grafana nslookup prometheus

# Verify network connectivity
docker exec -it grafana nc -zv prometheus 9090
```

### Authentication Failures

```bash
# Test credentials directly
curl -u grafana_reader:password http://elasticsearch:9200/_cluster/health

# Check Grafana logs for auth errors
docker logs grafana 2>&1 | grep -i "auth\|401\|403"
```

### Slow Queries

```yaml
# Increase timeouts
jsonData:
  timeout: 120  # seconds
  queryTimeout: 120s

# Enable query caching (Grafana Enterprise)
jsonData:
  cacheLevel: low  # low, medium, high
```

### SSL Certificate Issues

```yaml
# For self-signed certificates in non-production
jsonData:
  tlsSkipVerify: true  # Not recommended for production

# Better: Add CA certificate
jsonData:
  tlsAuthWithCACert: true
secureJsonData:
  tlsCACert: ${CA_CERT}
```

---

## 10. Testing Data Source Connections

### Automated Testing with API

```bash
#!/bin/bash
# test-datasources.sh

GRAFANA_URL="http://localhost:3000"
API_KEY="your-api-key"

# Get all data sources
datasources=$(curl -s -H "Authorization: Bearer $API_KEY" \
  "$GRAFANA_URL/api/datasources")

# Test each data source
echo "$datasources" | jq -r '.[].uid' | while read uid; do
  name=$(echo "$datasources" | jq -r ".[] | select(.uid==\"$uid\") | .name")

  result=$(curl -s -H "Authorization: Bearer $API_KEY" \
    "$GRAFANA_URL/api/datasources/uid/$uid/health")

  status=$(echo "$result" | jq -r '.status // "error"')

  if [ "$status" = "OK" ]; then
    echo "PASS: $name"
  else
    echo "FAIL: $name - $(echo $result | jq -r '.message // "unknown error"')"
  fi
done
```

### Health Check in CI/CD

```yaml
# .github/workflows/test-grafana.yaml
name: Test Grafana Data Sources

on:
  push:
    paths:
      - 'grafana/provisioning/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Start Grafana
        run: docker-compose up -d grafana

      - name: Wait for Grafana
        run: |
          until curl -s http://localhost:3000/api/health | grep -q "ok"; do
            sleep 2
          done

      - name: Test Data Sources
        run: ./scripts/test-datasources.sh
```

---

## Summary

Configuring Grafana data source plugins effectively requires understanding the specific requirements of each backend system. Key takeaways:

- Use provisioning files for configuration as code and version control
- Never hardcode credentials - use environment variables or secret management
- Test data source connectivity as part of your CI/CD pipeline
- Configure appropriate timeouts and caching for production workloads
- Enable TLS and proper authentication for all production data sources

Data sources are the foundation of your Grafana observability stack. Taking the time to configure them properly pays dividends in reliability and maintainability.

---

*Looking for a unified observability platform that simplifies data source management? [OneUptime](https://oneuptime.com) provides integrated metrics, logs, and traces with built-in dashboards - no plugin configuration required.*
