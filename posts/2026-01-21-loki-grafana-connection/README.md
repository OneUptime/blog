# How to Connect Loki to Grafana

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Loki, Grafana, Data Source, Log Exploration, Observability, Dashboards

Description: A comprehensive guide to connecting Grafana Loki to Grafana for log visualization, covering data source configuration, LogQL exploration, and advanced querying techniques.

---

Grafana provides the primary interface for exploring and visualizing logs stored in Loki. Proper data source configuration enables powerful log analysis through Grafana's Explore view, dashboards, and alerting features. This guide covers everything from basic setup to advanced configuration options.

## Prerequisites

Before starting, ensure you have:

- Grafana 9.0 or later running (10.x recommended)
- Loki instance accessible from Grafana
- Network connectivity between Grafana and Loki
- Basic understanding of LogQL query language

## Basic Data Source Configuration

### Via Grafana UI

1. Navigate to **Configuration** > **Data Sources** > **Add data source**
2. Search for and select **Loki**
3. Configure the connection:

| Setting | Value | Description |
|---------|-------|-------------|
| Name | Loki | Display name for the data source |
| URL | http://loki:3100 | Loki server URL |
| Access | Server (default) | Proxy through Grafana backend |

4. Click **Save & Test** to verify the connection

### Via Provisioning (Recommended)

Create a provisioning file for automated setup:

```yaml
# /etc/grafana/provisioning/datasources/loki.yaml
apiVersion: 1

datasources:
  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    isDefault: true
    editable: false
    jsonData:
      maxLines: 1000
      timeout: 60
```

For Kubernetes deployments, create a ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasources
  namespace: monitoring
  labels:
    grafana_datasource: "1"
data:
  loki.yaml: |
    apiVersion: 1
    datasources:
      - name: Loki
        type: loki
        access: proxy
        url: http://loki-gateway.loki.svc.cluster.local
        isDefault: true
        editable: false
        jsonData:
          maxLines: 1000
          timeout: 60
```

## Multi-Tenant Configuration

When Loki runs with `auth_enabled: true`, configure tenant headers:

```yaml
apiVersion: 1

datasources:
  - name: Loki-Production
    type: loki
    access: proxy
    url: http://loki:3100
    jsonData:
      httpHeaderName1: X-Scope-OrgID
      maxLines: 1000
    secureJsonData:
      httpHeaderValue1: production

  - name: Loki-Staging
    type: loki
    access: proxy
    url: http://loki:3100
    jsonData:
      httpHeaderName1: X-Scope-OrgID
      maxLines: 1000
    secureJsonData:
      httpHeaderValue1: staging
```

## Authentication Options

### Basic Authentication

```yaml
apiVersion: 1

datasources:
  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    basicAuth: true
    basicAuthUser: admin
    secureJsonData:
      basicAuthPassword: ${LOKI_PASSWORD}
```

### TLS Client Authentication

```yaml
apiVersion: 1

datasources:
  - name: Loki
    type: loki
    access: proxy
    url: https://loki:3100
    jsonData:
      tlsAuth: true
      tlsAuthWithCACert: true
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

### OAuth/Forward Auth Headers

```yaml
apiVersion: 1

datasources:
  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    jsonData:
      oauthPassThru: true
```

## Advanced Data Source Settings

### Complete Configuration Example

```yaml
apiVersion: 1

datasources:
  - name: Loki
    type: loki
    access: proxy
    url: http://loki-gateway.loki.svc.cluster.local
    isDefault: true
    editable: false
    jsonData:
      # Query settings
      maxLines: 5000
      timeout: 120

      # Derived fields for trace correlation
      derivedFields:
        - name: TraceID
          matcherRegex: '"trace_id":"([a-f0-9]+)"'
          url: '$${__value.raw}'
          datasourceUid: tempo
          urlDisplayLabel: View Trace
        - name: RequestID
          matcherRegex: 'request_id=([a-zA-Z0-9-]+)'
          url: 'http://request-service/requests/$${__value.raw}'
          urlDisplayLabel: View Request

      # HTTP headers
      httpHeaderName1: X-Scope-OrgID
      httpHeaderName2: X-Custom-Header

    secureJsonData:
      httpHeaderValue1: production
      httpHeaderValue2: custom-value
```

### Derived Fields for Trace Correlation

Connect logs to traces automatically:

```yaml
jsonData:
  derivedFields:
    # Tempo integration
    - name: TraceID
      matcherRegex: '(?:trace_id|traceId|traceid)[=:]\\s*["\']?([a-f0-9]{32})["\']?'
      url: '$${__value.raw}'
      datasourceUid: tempo
      urlDisplayLabel: View in Tempo

    # Jaeger integration
    - name: JaegerTrace
      matcherRegex: 'trace_id=([a-f0-9]+)'
      url: 'http://jaeger:16686/trace/$${__value.raw}'
      urlDisplayLabel: View in Jaeger

    # Zipkin integration
    - name: ZipkinTrace
      matcherRegex: 'X-B3-TraceId: ([a-f0-9]+)'
      url: 'http://zipkin:9411/zipkin/traces/$${__value.raw}'
      urlDisplayLabel: View in Zipkin
```

## Exploring Logs in Grafana

### Basic Log Query

Navigate to **Explore** and select the Loki data source:

```logql
{namespace="production", app="api-server"}
```

### Filtering Logs

```logql
# Contains text
{namespace="production"} |= "error"

# Does not contain
{namespace="production"} != "healthcheck"

# Regular expression match
{namespace="production"} |~ "error|warning|critical"

# Case-insensitive search
{namespace="production"} |~ "(?i)error"
```

### JSON Log Parsing

```logql
# Parse JSON and filter by level
{namespace="production"} | json | level="error"

# Extract specific fields
{namespace="production"} | json | line_format "{{.level}} - {{.message}}"

# Filter by parsed field value
{namespace="production"} | json | status_code >= 500
```

### Logfmt Parsing

```logql
# Parse logfmt
{namespace="production"} | logfmt | level="error"

# Extract and format
{namespace="production"} | logfmt | line_format "{{.method}} {{.path}} {{.status}}"
```

### Pattern Parsing

```logql
# Parse unstructured logs
{namespace="production"}
  | pattern "<ip> - - [<timestamp>] \"<method> <path> <_>\" <status> <size>"
  | status >= 500
```

## Building Dashboards with Loki

### Logs Panel

Create a dashboard panel showing logs:

```json
{
  "type": "logs",
  "title": "Application Logs",
  "targets": [
    {
      "datasource": {
        "type": "loki",
        "uid": "loki"
      },
      "expr": "{namespace=\"production\", app=\"$app\"}",
      "refId": "A"
    }
  ],
  "options": {
    "showTime": true,
    "showLabels": true,
    "showCommonLabels": false,
    "wrapLogMessage": true,
    "prettifyLogMessage": true,
    "enableLogDetails": true,
    "dedupStrategy": "none",
    "sortOrder": "Descending"
  }
}
```

### Metric Queries for Graphs

Display log-based metrics in time series panels:

```logql
# Error rate over time
sum(rate({namespace="production"} |= "error" [5m])) by (app)

# Request count by status code
sum by (status_code) (
  count_over_time(
    {namespace="production"}
    | json
    | __error__=""
    [1m]
  )
)

# P99 latency from logs
quantile_over_time(0.99,
  {namespace="production"}
  | json
  | unwrap duration
  [5m]
) by (endpoint)

# Log volume by service
sum(bytes_over_time({namespace="production"}[1h])) by (app)
```

### Dashboard Variables

Create template variables for dynamic filtering:

```yaml
# Label values query
label_values({namespace="production"}, app)

# Label names
label_names()

# Custom query with regex
label_values({namespace=~"prod.*"}, service)
```

Example variable configuration:

```json
{
  "templating": {
    "list": [
      {
        "name": "namespace",
        "type": "query",
        "datasource": {
          "type": "loki",
          "uid": "loki"
        },
        "query": "label_values(namespace)",
        "refresh": 2,
        "sort": 1
      },
      {
        "name": "app",
        "type": "query",
        "datasource": {
          "type": "loki",
          "uid": "loki"
        },
        "query": "label_values({namespace=\"$namespace\"}, app)",
        "refresh": 2,
        "sort": 1
      }
    ]
  }
}
```

## Log-Based Alerting

### Creating Alert Rules

Create alerting rules in Grafana based on LogQL queries:

```yaml
apiVersion: 1
groups:
  - orgId: 1
    name: log-alerts
    folder: Alerts
    interval: 1m
    rules:
      - uid: error-rate-high
        title: High Error Rate
        condition: C
        data:
          - refId: A
            datasourceUid: loki
            model:
              expr: sum(rate({namespace="production"} |= "error" [5m]))
              queryType: range
          - refId: B
            datasourceUid: __expr__
            model:
              expression: A
              type: reduce
              reducer: last
          - refId: C
            datasourceUid: __expr__
            model:
              expression: B > 10
              type: threshold
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: Error rate is above threshold
          description: "Error rate is {{ $values.B }} errors/sec"
```

### Alert Notification Templates

```yaml
annotations:
  summary: "High error rate in {{ $labels.namespace }}/{{ $labels.app }}"
  description: |
    Error rate has exceeded threshold.

    Current value: {{ $values.B | printf "%.2f" }} errors/sec
    Threshold: 10 errors/sec

    View logs: {{ grafanaExternalUrl }}/explore?left=["now-1h","now","Loki",{"expr":"{namespace=\"{{ $labels.namespace }}\",app=\"{{ $labels.app }}\"} |= \"error\""}]
```

## Performance Optimization

### Query Hints

Use query hints to improve performance:

```logql
# Limit time range
{namespace="production"} [1h]

# Limit results
{namespace="production"} | limit 1000

# Use specific labels (avoid regex when possible)
{namespace="production", app="api-server"}  # Good
{namespace=~"prod.*"}  # Less efficient
```

### Caching Configuration

Configure Grafana caching for Loki queries:

```ini
# grafana.ini
[dataproxy]
max_conns_per_host = 100
timeout = 300
```

### Data Source Timeout

Increase timeout for complex queries:

```yaml
jsonData:
  timeout: 120  # seconds
```

## Troubleshooting

### Connection Issues

1. Verify network connectivity:
```bash
# From Grafana pod
curl http://loki:3100/ready
```

2. Check Grafana logs:
```bash
kubectl logs -n monitoring deploy/grafana | grep -i loki
```

3. Verify data source settings:
```bash
# Grafana API
curl -H "Authorization: Bearer $GRAFANA_TOKEN" \
  http://grafana:3000/api/datasources
```

### Query Errors

**"too many outstanding requests"**
- Reduce query parallelism
- Narrow time range
- Add more specific label filters

**"context deadline exceeded"**
- Increase timeout in data source settings
- Optimize query with better label selection
- Check Loki resource allocation

### No Data Returned

1. Verify logs exist:
```bash
curl -G "http://loki:3100/loki/api/v1/label" \
  -H "X-Scope-OrgID: production"
```

2. Check time range alignment
3. Verify label values match exactly
4. Check tenant ID configuration

## Complete Example - Production Setup

### Grafana Deployment with Loki Data Source

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasources
  namespace: monitoring
data:
  datasources.yaml: |
    apiVersion: 1
    datasources:
      - name: Loki
        type: loki
        access: proxy
        url: http://loki-gateway.loki.svc.cluster.local
        isDefault: false
        editable: false
        jsonData:
          maxLines: 5000
          timeout: 120
          derivedFields:
            - name: TraceID
              matcherRegex: 'trace_id=([a-f0-9]+)'
              url: '$${__value.raw}'
              datasourceUid: tempo
              urlDisplayLabel: View Trace
          httpHeaderName1: X-Scope-OrgID
        secureJsonData:
          httpHeaderValue1: production

      - name: Prometheus
        type: prometheus
        access: proxy
        url: http://prometheus:9090
        isDefault: true
        editable: false

      - name: Tempo
        type: tempo
        access: proxy
        url: http://tempo:3200
        uid: tempo
        editable: false
        jsonData:
          tracesToLogs:
            datasourceUid: loki
            tags: ['namespace', 'pod']
            mappedTags: [{ key: 'service.name', value: 'app' }]
            mapTagNamesEnabled: true
            spanStartTimeShift: '-1h'
            spanEndTimeShift: '1h'
            filterByTraceID: true
            filterBySpanID: false
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: grafana
  template:
    metadata:
      labels:
        app: grafana
    spec:
      containers:
        - name: grafana
          image: grafana/grafana:10.3.1
          ports:
            - containerPort: 3000
          env:
            - name: GF_SECURITY_ADMIN_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: grafana-secrets
                  key: admin-password
          volumeMounts:
            - name: datasources
              mountPath: /etc/grafana/provisioning/datasources
      volumes:
        - name: datasources
          configMap:
            name: grafana-datasources
```

## Conclusion

Connecting Grafana to Loki provides a powerful interface for log exploration and analysis. Key takeaways:

- Use provisioning for reproducible data source configuration
- Configure multi-tenant headers when auth is enabled
- Set up derived fields for trace correlation
- Use template variables for dynamic dashboards
- Configure appropriate timeouts for complex queries
- Implement log-based alerting for proactive monitoring

With proper configuration, Grafana and Loki together provide a comprehensive observability solution that scales from development to enterprise production environments.
