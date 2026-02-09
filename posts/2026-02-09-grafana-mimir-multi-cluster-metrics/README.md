# How to Use Grafana Mimir for Multi-Cluster Metrics at Scale

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, Mimir, Prometheus, Monitoring, Multi-Cluster

Description: Learn how to deploy Grafana Mimir for scalable multi-cluster metric collection with high cardinality support and long-term storage capabilities.

---

Grafana Mimir provides a horizontally scalable Prometheus-compatible metrics backend designed specifically for multi-tenant, multi-cluster environments. Unlike Thanos, which extends existing Prometheus instances, Mimir replaces Prometheus as your metrics storage backend, offering better performance at scale and simplified operations.

In this guide, you'll learn how to deploy Mimir for multi-cluster metric aggregation, configure Prometheus agents to send metrics to Mimir, and query metrics across your entire infrastructure.

## Why Choose Mimir Over Thanos

Mimir and Thanos solve similar problems but take different architectural approaches. Mimir provides a single, centralized metrics backend with built-in multi-tenancy, making it simpler to operate at scale. It handles higher cardinality metrics better than Prometheus or Thanos through its sophisticated indexing and storage architecture. The query performance remains consistent even with hundreds of millions of active series.

Thanos works better if you want to keep Prometheus instances independent with federated querying. Mimir works better if you want centralized metrics storage with simplified operations.

## Deploying Mimir with Helm

The easiest way to deploy Mimir is using the official Helm chart. Start by adding the Grafana Helm repository:

```bash
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
```

Create a values file for your Mimir deployment:

```yaml
# mimir-values.yaml
mimir:
  structuredConfig:
    multitenancy_enabled: true
    limits:
      max_global_series_per_user: 10000000
      max_global_series_per_metric: 1000000
      ingestion_rate: 100000
      ingestion_burst_size: 200000

    blocks_storage:
      backend: s3
      s3:
        endpoint: s3.amazonaws.com
        bucket_name: mimir-blocks
        region: us-east-1

    ruler_storage:
      backend: s3
      s3:
        endpoint: s3.amazonaws.com
        bucket_name: mimir-ruler
        region: us-east-1

    alertmanager_storage:
      backend: s3
      s3:
        endpoint: s3.amazonaws.com
        bucket_name: mimir-alertmanager
        region: us-east-1

# Scale components based on your needs
ingester:
  replicas: 6
  resources:
    requests:
      cpu: 2
      memory: 8Gi
    limits:
      memory: 12Gi

distributor:
  replicas: 3
  resources:
    requests:
      cpu: 1
      memory: 2Gi

querier:
  replicas: 4
  resources:
    requests:
      cpu: 2
      memory: 4Gi

query_frontend:
  replicas: 2
  resources:
    requests:
      cpu: 1
      memory: 2Gi

compactor:
  replicas: 1
  resources:
    requests:
      cpu: 1
      memory: 4Gi

store_gateway:
  replicas: 3
  resources:
    requests:
      cpu: 1
      memory: 4Gi

# Use object storage for long-term retention
minio:
  enabled: false  # Use cloud provider object storage instead

nginx:
  enabled: true
  replicas: 2
```

Deploy Mimir:

```bash
kubectl create namespace mimir

# Create secret for object storage credentials
kubectl create secret generic mimir-object-storage \
  --from-literal=access-key-id="${AWS_ACCESS_KEY_ID}" \
  --from-literal=secret-access-key="${AWS_SECRET_ACCESS_KEY}" \
  -n mimir

helm install mimir grafana/mimir-distributed \
  -n mimir \
  -f mimir-values.yaml
```

Mimir consists of several microservices that work together. The distributor receives metrics from Prometheus agents. Ingesters buffer recent metrics in memory. The query frontend handles query requests. Queriers execute queries against ingesters and storage. The store gateway serves historical data from object storage. The compactor optimizes stored data.

## Configuring Prometheus Agents to Send Metrics to Mimir

In each Kubernetes cluster, deploy Prometheus in agent mode. Agent mode removes query and storage components, making Prometheus a lightweight metrics collector that forwards everything to Mimir.

```yaml
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: prometheus-agent
  namespace: monitoring
  labels:
    cluster: cluster-1
spec:
  mode: Agent  # Run in agent mode
  replicas: 2
  externalLabels:
    cluster: cluster-1
    region: us-east-1
    environment: production

  # No local storage needed in agent mode
  retention: 2h

  remoteWrite:
  - url: http://mimir-nginx.mimir.svc.cluster.local/api/v1/push
    headers:
      X-Scope-OrgID: cluster-1  # Tenant ID for multi-tenancy
    queueConfig:
      capacity: 10000
      maxShards: 50
      minShards: 10
      maxSamplesPerSend: 5000
      batchSendDeadline: 5s
      minBackoff: 30ms
      maxBackoff: 5s
    writeRelabelConfigs:
    # Add additional labels if needed
    - sourceLabels: [__name__]
      targetLabel: cluster
      replacement: cluster-1

  # Scrape configurations
  serviceMonitorSelector: {}
  podMonitorSelector: {}
  probeSelector: {}
```

Deploy this in each cluster with appropriate cluster and region labels. The `X-Scope-OrgID` header identifies which tenant the metrics belong to, enabling multi-tenant isolation.

For environments where Mimir is in a separate cluster, expose Mimir via ingress:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: mimir-ingress
  namespace: mimir
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/proxy-body-size: "0"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "300"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - mimir.example.com
    secretName: mimir-tls
  rules:
  - host: mimir.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: mimir-nginx
            port:
              number: 80
```

Update the Prometheus agent configuration to use the public endpoint:

```yaml
remoteWrite:
- url: https://mimir.example.com/api/v1/push
  headers:
    X-Scope-OrgID: cluster-1
```

## Configuring Multi-Tenancy

Mimir's multi-tenancy feature isolates metrics between clusters or teams. Create tenant-specific configurations:

```yaml
# mimir-tenants-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mimir-overrides
  namespace: mimir
data:
  overrides.yaml: |
    overrides:
      cluster-1:
        max_global_series_per_user: 5000000
        ingestion_rate: 50000
        ingestion_burst_size: 100000
      cluster-2:
        max_global_series_per_user: 10000000
        ingestion_rate: 100000
        ingestion_burst_size: 200000
      team-analytics:
        max_global_series_per_user: 1000000
        ingestion_rate: 10000
        ingestion_burst_size: 20000
```

Reference this ConfigMap in your Mimir deployment:

```yaml
mimir:
  structuredConfig:
    limits:
      # Override specific tenant limits
      overrides_config_file: /etc/mimir/overrides.yaml
```

## Querying Metrics from Mimir

Configure Grafana to query Mimir with multi-tenant support:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasources
  namespace: monitoring
data:
  mimir-datasources.yaml: |
    apiVersion: 1
    datasources:
    - name: Mimir (All Clusters)
      type: prometheus
      access: proxy
      url: http://mimir-query-frontend.mimir.svc:8080/prometheus
      isDefault: true
      jsonData:
        timeInterval: 30s
        httpHeaderName1: X-Scope-OrgID
      secureJsonData:
        httpHeaderValue1: cluster-1|cluster-2  # Query multiple tenants

    - name: Mimir (Cluster 1)
      type: prometheus
      access: proxy
      url: http://mimir-query-frontend.mimir.svc:8080/prometheus
      jsonData:
        timeInterval: 30s
        httpHeaderName1: X-Scope-OrgID
      secureJsonData:
        httpHeaderValue1: cluster-1

    - name: Mimir (Cluster 2)
      type: prometheus
      access: proxy
      url: http://mimir-query-frontend.mimir.svc:8080/prometheus
      jsonData:
        timeInterval: 30s
        httpHeaderName1: X-Scope-OrgID
      secureJsonData:
        httpHeaderValue1: cluster-2
```

Query metrics using standard PromQL:

```promql
# Total memory usage across all clusters
sum(container_memory_usage_bytes) by (cluster)

# Request rate per cluster
sum(rate(http_requests_total[5m])) by (cluster)

# High cardinality query - unique users per service per cluster
count(count by (user_id, service, cluster) (user_sessions))

# Historical query from 90 days ago
rate(http_requests_total[5m] offset 90d)
```

Mimir handles high cardinality queries efficiently, making it suitable for tracking metrics with many unique label combinations.

## Setting Up Recording Rules in Mimir

Mimir includes a built-in ruler that evaluates recording and alerting rules. This centralizes rule management instead of running rules in each Prometheus instance.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mimir-rules
  namespace: mimir
data:
  rules.yaml: |
    groups:
    - name: aggregate-metrics
      interval: 30s
      rules:
      # Pre-aggregate expensive queries
      - record: cluster:request_rate:sum
        expr: sum(rate(http_requests_total[5m])) by (cluster)

      - record: cluster:error_rate:ratio
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m])) by (cluster)
          /
          sum(rate(http_requests_total[5m])) by (cluster)

      - record: cluster:cpu_usage:avg
        expr: avg(rate(container_cpu_usage_seconds_total[5m])) by (cluster)

      - record: cluster:memory_usage:sum
        expr: sum(container_memory_usage_bytes) by (cluster)
```

Load rules via the Mimir API:

```bash
# Create rules for tenant cluster-1
curl -X POST \
  -H "X-Scope-OrgID: cluster-1" \
  -H "Content-Type: application/yaml" \
  --data-binary @rules.yaml \
  http://mimir-nginx.mimir.svc/prometheus/config/v1/rules/default
```

## Configuring Alertmanager in Mimir

Mimir includes a distributed Alertmanager for handling alerts:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mimir-alertmanager-config
  namespace: mimir
data:
  alertmanager.yaml: |
    global:
      resolve_timeout: 5m
      slack_api_url: ${SLACK_WEBHOOK_URL}

    route:
      group_by: ['alertname', 'cluster']
      group_wait: 10s
      group_interval: 10s
      repeat_interval: 12h
      receiver: 'slack-notifications'
      routes:
      - match:
          severity: critical
        receiver: 'pagerduty-critical'
      - match:
          cluster: cluster-1
        receiver: 'team-cluster-1'

    receivers:
    - name: 'slack-notifications'
      slack_configs:
      - channel: '#alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}\n{{ end }}'

    - name: 'pagerduty-critical'
      pagerduty_configs:
      - service_key: ${PAGERDUTY_KEY}

    - name: 'team-cluster-1'
      slack_configs:
      - channel: '#cluster-1-alerts'
```

Upload the configuration:

```bash
curl -X POST \
  -H "X-Scope-OrgID: cluster-1" \
  -H "Content-Type: application/yaml" \
  --data-binary @alertmanager.yaml \
  http://mimir-nginx.mimir.svc/api/v1/alerts
```

## Monitoring Mimir Performance

Monitor Mimir itself to ensure healthy operation:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: mimir-components
  namespace: mimir
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: mimir
  endpoints:
  - port: http-metrics
    interval: 30s

---
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: mimir-alerts
  namespace: mimir
spec:
  groups:
  - name: mimir
    rules:
    - alert: MimirIngesterUnhealthy
      expr: up{job="mimir-ingester"} == 0
      for: 5m
      annotations:
        summary: "Mimir ingester {{ $labels.instance }} is down"

    - alert: MimirHighIngestionRate
      expr: rate(cortex_distributor_received_samples_total[1m]) > 200000
      for: 5m
      annotations:
        summary: "Very high ingestion rate"

    - alert: MimirQueryLatencyHigh
      expr: histogram_quantile(0.99, sum(rate(cortex_request_duration_seconds_bucket{route=~"/api/v1/query.*"}[5m])) by (le)) > 10
      for: 5m
      annotations:
        summary: "P99 query latency above 10s"
```

## Optimizing Mimir for Large-Scale Deployments

For very large deployments with billions of active series:

```yaml
mimir:
  structuredConfig:
    ingester:
      ring:
        replication_factor: 3
        # Spread load across many ingesters
        heartbeat_timeout: 10m

    store_gateway:
      sharding_ring:
        # More store gateways for better query performance
        replication_factor: 3

    compactor:
      compaction_interval: 15m
      block_ranges:
      - 2h
      - 12h
      - 24h

    limits:
      # Increase limits for high-scale environments
      max_global_series_per_user: 50000000
      max_label_names_per_series: 100
      # Enable active series tracking for better visibility
      max_global_exemplars_per_user: 100000
```

Scale components horizontally:

```bash
# Scale ingesters
kubectl scale statefulset mimir-ingester -n mimir --replicas=12

# Scale queriers
kubectl scale deployment mimir-querier -n mimir --replicas=8

# Scale store gateways
kubectl scale statefulset mimir-store-gateway -n mimir --replicas=6
```

## Best Practices

Use meaningful tenant IDs that map to your organizational structure. Common patterns include using cluster names, team names, or environment identifiers.

Configure appropriate ingestion limits per tenant to prevent any single tenant from overwhelming the system.

Deploy Mimir components with anti-affinity rules to spread them across nodes and availability zones for better resilience.

Use recording rules aggressively to pre-compute expensive queries. Mimir's ruler evaluates these centrally and stores the results.

Monitor object storage costs carefully. Mimir stores significant data in object storage, and costs can grow without proper compaction and retention policies.

## Conclusion

Grafana Mimir provides a powerful, scalable solution for multi-cluster metric aggregation. Its centralized architecture simplifies operations compared to federated approaches, while its sophisticated storage engine handles high cardinality metrics that would overwhelm traditional Prometheus deployments.

Start with a basic deployment and scale components as your metric volume grows. The modular architecture lets you scale individual components independently based on your specific bottlenecks.
