# How to Configure Data Sources in Grafana

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, Data Sources, Prometheus, Loki, InfluxDB, Configuration, Monitoring

Description: A comprehensive guide to configuring data sources in Grafana, covering Prometheus, Loki, InfluxDB, PostgreSQL, and best practices for managing multiple sources in production.

---

Data sources are the backbone of Grafana. Without properly configured data sources, your dashboards have no data to display. This guide covers how to configure the most common data sources and manage them effectively in production environments.

## Understanding Data Sources

A data source in Grafana is a connection to a database or service that stores your metrics, logs, or traces. Grafana supports over 60 data sources out of the box, including:

- **Time series databases**: Prometheus, InfluxDB, Graphite
- **Log databases**: Loki, Elasticsearch
- **Tracing backends**: Tempo, Jaeger, Zipkin
- **SQL databases**: PostgreSQL, MySQL, Microsoft SQL Server
- **Cloud services**: CloudWatch, Azure Monitor, Google Cloud Monitoring

## Adding Your First Data Source

Navigate to Configuration > Data Sources > Add data source. Select the data source type from the list.

### Prometheus Configuration

Prometheus is the most common data source for Grafana in Kubernetes environments.

```yaml
# Basic Prometheus data source configuration
Name: Prometheus
Type: Prometheus
URL: http://prometheus-server:9090
Access: Server (default)

# Optional settings
Scrape interval: 15s
Query timeout: 60s
HTTP Method: POST
```

If Prometheus requires authentication:

```yaml
# Basic auth configuration
Basic auth: enabled
User: prometheus
Password: your-password

# Or use custom headers
Custom HTTP Headers:
  X-Scope-OrgID: tenant1
```

Test the connection by clicking **Save & Test**. You should see "Data source is working".

### Loki Configuration for Logs

Loki stores and queries logs. Configure it alongside Prometheus for unified observability.

```yaml
Name: Loki
Type: Loki
URL: http://loki-gateway:3100
Access: Server

# Derived fields - link logs to traces
Derived fields:
  - Name: TraceID
    Regex: traceID=(\w+)
    URL: http://tempo:3100/trace/${__value.raw}
    Data source: Tempo
```

The derived fields configuration creates clickable links from log entries to traces.

### InfluxDB Configuration

InfluxDB is popular for IoT and high-cardinality time series data.

For InfluxDB 2.x:

```yaml
Name: InfluxDB
Type: InfluxDB
URL: http://influxdb:8086
Access: Server

# InfluxDB 2.x specific
Query Language: Flux
Organization: my-org
Token: your-api-token
Default Bucket: metrics
```

For InfluxDB 1.x:

```yaml
Name: InfluxDB
Type: InfluxDB
URL: http://influxdb:8086
Access: Server

# InfluxDB 1.x specific
Database: telegraf
User: admin
Password: your-password
HTTP Method: GET
```

### PostgreSQL Configuration

Query relational data directly for application dashboards.

```yaml
Name: PostgreSQL
Type: PostgreSQL
Host: postgres.database.svc:5432
Database: application_db
User: grafana_reader
Password: your-password
SSL Mode: require
Version: 14

# Time series settings
TimescaleDB: disabled
Max open connections: 10
Max idle connections: 2
Connection max lifetime: 14400
```

Create a read-only user for Grafana:

```sql
-- PostgreSQL: Create a read-only user for Grafana
CREATE USER grafana_reader WITH PASSWORD 'secure-password';
GRANT CONNECT ON DATABASE application_db TO grafana_reader;
GRANT USAGE ON SCHEMA public TO grafana_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO grafana_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO grafana_reader;
```

## Data Source Architecture

Here is how Grafana connects to various data sources:

```mermaid
flowchart TD
    subgraph Grafana
        DS[Data Source Manager]
        QE[Query Engine]
    end

    subgraph Time Series
        Prom[Prometheus]
        Influx[InfluxDB]
    end

    subgraph Logs
        Loki[Loki]
        ES[Elasticsearch]
    end

    subgraph Traces
        Tempo[Tempo]
        Jaeger[Jaeger]
    end

    subgraph SQL
        PG[PostgreSQL]
        MySQL[MySQL]
    end

    DS --> Prom
    DS --> Influx
    DS --> Loki
    DS --> ES
    DS --> Tempo
    DS --> Jaeger
    DS --> PG
    DS --> MySQL

    QE --> DS
```

## Provisioning Data Sources as Code

For production, define data sources in YAML files instead of the UI. This enables version control and reproducible deployments.

Create a provisioning file:

```yaml
# /etc/grafana/provisioning/datasources/datasources.yaml
apiVersion: 1

datasources:
  # Primary Prometheus instance
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus-server:9090
    isDefault: true
    editable: false
    jsonData:
      timeInterval: "15s"
      httpMethod: POST

  # Loki for logs
  - name: Loki
    type: loki
    access: proxy
    url: http://loki-gateway:3100
    editable: false
    jsonData:
      derivedFields:
        - name: TraceID
          matcherRegex: "traceID=(\\w+)"
          url: "${__value.raw}"
          datasourceUid: tempo

  # Tempo for traces
  - name: Tempo
    type: tempo
    access: proxy
    url: http://tempo:3100
    uid: tempo
    editable: false
    jsonData:
      tracesToLogs:
        datasourceUid: loki
        tags: ["service"]
        mappedTags: [{ key: "service.name", value: "service" }]
        mapTagNamesEnabled: true
        filterByTraceID: true

  # PostgreSQL for application data
  - name: PostgreSQL
    type: postgres
    url: postgres.database.svc:5432
    user: grafana_reader
    secureJsonData:
      password: ${PG_PASSWORD}
    jsonData:
      database: application_db
      sslmode: require
      maxOpenConns: 10
      maxIdleConns: 2
      connMaxLifetime: 14400
```

In Kubernetes, mount this as a ConfigMap:

```yaml
# grafana-datasources-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasources
  namespace: monitoring
  labels:
    grafana_datasource: "1"
data:
  datasources.yaml: |
    apiVersion: 1
    datasources:
      - name: Prometheus
        type: prometheus
        access: proxy
        url: http://prometheus-server:9090
        isDefault: true
```

## Managing Secrets for Data Sources

Never hardcode passwords in provisioning files. Use environment variables or Kubernetes secrets.

### Using Environment Variables

```yaml
# In datasources.yaml
secureJsonData:
  password: ${DB_PASSWORD}
```

Set the environment variable in your Grafana deployment:

```yaml
# grafana-deployment.yaml
env:
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef:
        name: grafana-secrets
        key: db-password
```

### Using Kubernetes Secrets

Create a secret:

```bash
kubectl create secret generic grafana-secrets \
  --from-literal=db-password='your-secure-password' \
  -n monitoring
```

## Configuring Data Source Access Modes

Grafana offers two access modes:

### Server Mode (Recommended)
Grafana backend makes requests to the data source. The browser never connects directly.

Benefits:
- Data source credentials stay on the server
- Works with data sources behind firewalls
- Better security

### Browser Mode
The browser makes requests directly to the data source.

Use cases:
- Data sources requiring browser-based auth (OAuth)
- Public data sources

## Testing Data Source Connectivity

After configuring a data source, verify it works:

```bash
# Test Prometheus from Grafana pod
kubectl exec -it grafana-pod -n monitoring -- \
  curl -s http://prometheus-server:9090/api/v1/query?query=up | jq

# Test Loki
kubectl exec -it grafana-pod -n monitoring -- \
  curl -s http://loki-gateway:3100/ready

# Test PostgreSQL
kubectl exec -it grafana-pod -n monitoring -- \
  psql "postgres://grafana_reader:password@postgres:5432/app_db" -c "SELECT 1"
```

## Working with Multiple Data Sources

Large organizations often have multiple instances of the same data source type. Name them clearly:

```yaml
datasources:
  - name: Prometheus-Production
    type: prometheus
    url: http://prometheus-prod:9090
    isDefault: true

  - name: Prometheus-Staging
    type: prometheus
    url: http://prometheus-staging:9090

  - name: Prometheus-Dev
    type: prometheus
    url: http://prometheus-dev:9090
```

In dashboards, use variables to switch between data sources:

```yaml
# Dashboard variable configuration
Name: datasource
Type: Data source
Query: prometheus
Regex: /Prometheus-.*/
```

## Configuring Data Source Timeouts

Slow data sources can make dashboards unresponsive. Configure appropriate timeouts:

```yaml
jsonData:
  timeInterval: "15s"    # Minimum scrape interval
  queryTimeout: "60s"    # Maximum query execution time
  httpMethod: POST       # POST handles larger queries
```

For complex queries, increase the timeout:

```yaml
jsonData:
  queryTimeout: "120s"
```

## Monitoring Data Source Health

Create alerts for data source connectivity issues:

```promql
# Alert when Prometheus is unreachable
up{job="prometheus"} == 0

# Alert when Loki is unhealthy
loki_build_info == 0 or absent(loki_build_info)
```

## Common Issues and Solutions

**"Data source is not working" error**:
1. Check the URL is reachable from Grafana
2. Verify authentication credentials
3. Check network policies allow traffic

**Slow queries**:
1. Add indexes to PostgreSQL tables
2. Use recording rules in Prometheus
3. Increase timeout values

**Authentication failures**:
1. Verify credentials are correct
2. Check if passwords contain special characters (escape them)
3. Review data source logs for details

## Best Practices

1. **Use provisioning for production**: Define data sources as code for reproducibility
2. **Set appropriate defaults**: Mark your primary Prometheus as default
3. **Use read-only credentials**: Never give Grafana write access to databases
4. **Test connectivity**: Always click "Save & Test" after configuration
5. **Document data sources**: Add descriptions explaining what each source contains
6. **Regular credential rotation**: Update passwords periodically and redeploy

Data sources connect Grafana to your observability data. Configure them correctly, and your dashboards will provide reliable visibility into your systems.
