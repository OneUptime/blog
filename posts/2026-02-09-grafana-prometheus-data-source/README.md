# How to Configure Grafana with Prometheus Data Source

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, Prometheus, Monitoring

Description: Learn how to configure Prometheus as a data source in Grafana with proper authentication, query optimization, and best practices for visualizing metrics and creating performant dashboards.

---

Grafana and Prometheus are a perfect match. Prometheus collects and stores metrics, while Grafana provides beautiful visualizations. Connecting them is straightforward, but doing it right requires understanding authentication, query performance, and dashboard design.

This guide covers everything from basic configuration to advanced techniques for building fast, reliable dashboards backed by Prometheus.

## Basic Prometheus Data Source Setup

The simplest way to add Prometheus is through the Grafana UI:

1. Navigate to Configuration > Data Sources
2. Click "Add data source"
3. Select Prometheus
4. Enter the URL: `http://prometheus:9090`
5. Click "Save & Test"

But for production, you want this configuration in code.

## Provisioning Prometheus Data Source

Create a provisioning file to automate data source creation:

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
    - name: Prometheus
      type: prometheus
      access: proxy
      url: http://prometheus:9090
      isDefault: true
      editable: false
      jsonData:
        httpMethod: POST
        timeInterval: 30s
```

Mount this ConfigMap in your Grafana deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
  namespace: monitoring
spec:
  template:
    spec:
      containers:
      - name: grafana
        image: grafana/grafana:10.2.0
        volumeMounts:
        - name: datasources
          mountPath: /etc/grafana/provisioning/datasources
      volumes:
      - name: datasources
        configMap:
          name: grafana-datasources
```

Grafana will automatically configure the data source on startup.

## Configuring Prometheus with Authentication

If your Prometheus requires authentication, add credentials:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: prometheus-credentials
  namespace: monitoring
type: Opaque
stringData:
  username: grafana
  password: SecurePassword123!
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasources
  namespace: monitoring
data:
  datasources.yaml: |
    apiVersion: 1
    datasources:
    - name: Prometheus
      type: prometheus
      access: proxy
      url: http://prometheus:9090
      isDefault: true
      basicAuth: true
      basicAuthUser: $PROMETHEUS_USER
      secureJsonData:
        basicAuthPassword: $PROMETHEUS_PASSWORD
      jsonData:
        httpMethod: POST
        timeInterval: 30s
```

Add environment variables to Grafana:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
  namespace: monitoring
spec:
  template:
    spec:
      containers:
      - name: grafana
        env:
        - name: PROMETHEUS_USER
          valueFrom:
            secretKeyRef:
              name: prometheus-credentials
              key: username
        - name: PROMETHEUS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: prometheus-credentials
              key: password
```

## Using TLS for Secure Connections

For secure communication with Prometheus:

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
    - name: Prometheus
      type: prometheus
      access: proxy
      url: https://prometheus.example.com:9090
      isDefault: true
      jsonData:
        httpMethod: POST
        tlsAuth: true
        tlsAuthWithCACert: true
        timeInterval: 30s
      secureJsonData:
        tlsCACert: |
          -----BEGIN CERTIFICATE-----
          MIIDXTCCAkWgAwIBAgIJAKL...
          -----END CERTIFICATE-----
        tlsClientCert: |
          -----BEGIN CERTIFICATE-----
          MIIDXTCCAkWgAwIBAgIJAKL...
          -----END CERTIFICATE-----
        tlsClientKey: |
          -----BEGIN PRIVATE KEY-----
          MIIEvQIBADANBgkqhkiG9w...
          -----END PRIVATE KEY-----
```

## Configuring Multiple Prometheus Instances

For multi-cluster or federated setups:

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
    - name: Prometheus-US-East
      type: prometheus
      access: proxy
      url: http://prometheus-us-east:9090
      isDefault: true
      jsonData:
        httpMethod: POST
        timeInterval: 30s

    - name: Prometheus-US-West
      type: prometheus
      access: proxy
      url: http://prometheus-us-west:9090
      isDefault: false
      jsonData:
        httpMethod: POST
        timeInterval: 30s

    - name: Prometheus-EU
      type: prometheus
      access: proxy
      url: http://prometheus-eu:9090
      isDefault: false
      jsonData:
        httpMethod: POST
        timeInterval: 30s
```

Use variables in dashboards to switch between data sources dynamically.

## Optimizing Query Performance

Configure query timeouts and caching:

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
    - name: Prometheus
      type: prometheus
      access: proxy
      url: http://prometheus:9090
      isDefault: true
      jsonData:
        httpMethod: POST
        timeInterval: 30s
        queryTimeout: 60s
        # Cache responses for better performance
        cacheLevel: High
        incrementalQuerying: true
        incrementalQueryOverlapWindow: 10m
        # Disable metrics lookup for faster load times
        disableMetricsLookup: false
        # Custom query parameters
        customQueryParameters: "timeout=30s"
```

## Setting Scrape Intervals

Match Grafana's query interval to Prometheus scrape intervals:

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
    - name: Prometheus
      type: prometheus
      access: proxy
      url: http://prometheus:9090
      isDefault: true
      jsonData:
        httpMethod: POST
        # Match your Prometheus scrape interval
        timeInterval: 15s  # If Prometheus scrapes every 15s
        # Min step for range queries
        minInterval: 15s
```

This prevents Grafana from requesting data at intervals finer than what Prometheus collects.

## Creating Your First Dashboard

With Prometheus configured, create a dashboard:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboards
  namespace: monitoring
data:
  cluster-overview.json: |
    {
      "dashboard": {
        "title": "Cluster Overview",
        "panels": [
          {
            "title": "CPU Usage",
            "targets": [
              {
                "expr": "100 - (avg by(instance) (rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
                "legendFormat": "{{instance}}"
              }
            ],
            "type": "graph"
          },
          {
            "title": "Memory Usage",
            "targets": [
              {
                "expr": "(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100",
                "legendFormat": "{{instance}}"
              }
            ],
            "type": "graph"
          },
          {
            "title": "Pod Count",
            "targets": [
              {
                "expr": "count(kube_pod_info) by (namespace)",
                "legendFormat": "{{namespace}}"
              }
            ],
            "type": "graph"
          }
        ]
      }
    }
```

Provision this dashboard:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboard-providers
  namespace: monitoring
data:
  dashboards.yaml: |
    apiVersion: 1
    providers:
    - name: 'default'
      orgId: 1
      folder: ''
      type: file
      disableDeletion: false
      updateIntervalSeconds: 30
      allowUiUpdates: true
      options:
        path: /var/lib/grafana/dashboards
```

Mount both ConfigMaps:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
  namespace: monitoring
spec:
  template:
    spec:
      containers:
      - name: grafana
        volumeMounts:
        - name: datasources
          mountPath: /etc/grafana/provisioning/datasources
        - name: dashboard-providers
          mountPath: /etc/grafana/provisioning/dashboards
        - name: dashboards
          mountPath: /var/lib/grafana/dashboards
      volumes:
      - name: datasources
        configMap:
          name: grafana-datasources
      - name: dashboard-providers
        configMap:
          name: grafana-dashboard-providers
      - name: dashboards
        configMap:
          name: grafana-dashboards
```

## Using Exemplars

Exemplars link metrics to traces. Configure Prometheus to provide exemplars:

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
    - name: Prometheus
      type: prometheus
      access: proxy
      url: http://prometheus:9090
      isDefault: true
      jsonData:
        httpMethod: POST
        exemplarTraceIdDestinations:
        - name: trace_id
          datasourceUid: tempo-uid  # UID of Tempo datasource
          urlDisplayLabel: View Trace
```

This allows you to click on a metric spike and jump to the corresponding trace in Tempo.

## Query Performance Best Practices

Write efficient PromQL queries:

```yaml
# Good: Specific label selectors
up{job="kubernetes-nodes"}

# Bad: Wide selector requiring more processing
up

# Good: Pre-aggregated metrics
node:node_cpu_utilization:avg1m

# Bad: Calculating aggregation every time
avg(rate(node_cpu_seconds_total[1m]))

# Good: Use recording rules for complex queries
apiserver_request:rate5m

# Bad: Complex query executed every dashboard refresh
sum(rate(apiserver_request_total[5m])) by (verb, code)
```

Create recording rules in Prometheus for frequently used queries:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-rules
  namespace: monitoring
data:
  recording-rules.yaml: |
    groups:
    - name: node
      interval: 30s
      rules:
      - record: node:node_cpu_utilization:avg1m
        expr: avg by (instance) (rate(node_cpu_seconds_total{mode!="idle"}[1m]))

      - record: node:node_memory_utilization:ratio
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes
```

## Debugging Data Source Issues

When Grafana can't connect to Prometheus:

```bash
# Check if Prometheus is reachable from Grafana pod
kubectl exec -n monitoring -it $(kubectl get pod -n monitoring -l app=grafana -o jsonpath='{.items[0].metadata.name}') -- \
  curl http://prometheus:9090/api/v1/status/config

# Check Grafana logs for connection errors
kubectl logs -n monitoring -l app=grafana | grep -i prometheus

# Test data source from Grafana UI
# Configuration > Data Sources > Prometheus > Save & Test

# Check Prometheus logs
kubectl logs -n monitoring -l app=prometheus
```

Common issues:

1. **Connection refused**: Prometheus service name or port incorrect
2. **Timeout**: Prometheus overloaded or network issues
3. **401 Unauthorized**: Authentication credentials incorrect
4. **SSL errors**: Certificate configuration issues

## Monitoring Data Source Health

Create alerts for data source issues:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-health-dashboard
  namespace: monitoring
data:
  health.json: |
    {
      "dashboard": {
        "title": "Grafana Health",
        "panels": [
          {
            "title": "Data Source Status",
            "targets": [
              {
                "expr": "grafana_datasource_request_total",
                "legendFormat": "{{datasource}}"
              }
            ],
            "type": "stat"
          },
          {
            "title": "Query Errors",
            "targets": [
              {
                "expr": "rate(grafana_datasource_request_errors_total[5m])",
                "legendFormat": "{{datasource}}"
              }
            ],
            "type": "graph"
          }
        ]
      }
    }
```

## Best Practices

Follow these guidelines for optimal Prometheus data source configuration:

1. **Use provisioning**: Define data sources as code for reproducibility.
2. **Enable authentication**: Don't leave Prometheus unsecured.
3. **Set appropriate timeouts**: Match query complexity to timeout values.
4. **Use recording rules**: Pre-calculate complex queries.
5. **Configure caching**: Enable response caching for better performance.
6. **Match scrape intervals**: Set minInterval to match Prometheus scrape interval.
7. **Monitor health**: Track data source connectivity and query performance.
8. **Use POST method**: Better for complex queries with long label lists.

Connecting Grafana to Prometheus is just the beginning. Proper configuration ensures your dashboards are fast, reliable, and provide the insights you need to monitor your infrastructure effectively.
