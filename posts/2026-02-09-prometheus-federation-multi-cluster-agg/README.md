# How to Implement Prometheus Federation for Multi-Cluster Metrics Aggregation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Federation, Multi-Cluster, Kubernetes, Monitoring

Description: Learn how to use Prometheus federation to aggregate metrics across multiple Kubernetes clusters for centralized monitoring and global queries.

---

Managing monitoring across multiple Kubernetes clusters presents unique challenges. Prometheus federation provides a hierarchical approach to metrics aggregation, allowing a central Prometheus instance to scrape and store metrics from multiple downstream Prometheus servers. This enables global dashboards, cross-cluster alerting, and centralized observability without overwhelming individual cluster Prometheus instances.

## Understanding Prometheus Federation

Prometheus federation works by having one Prometheus server scrape the `/federate` endpoint of another Prometheus server. The scraping Prometheus can filter which metrics to pull using match parameters. This creates a hierarchy where:

- **Leaf Prometheus instances** scrape metrics from applications and infrastructure within each cluster
- **Central Prometheus instance** federates aggregated metrics from all leaf instances

Federation is distinct from remote write. Federation pulls metrics on-demand, while remote write pushes metrics continuously. Use federation when you need selective metric aggregation and can tolerate slightly stale data.

## Basic Federation Setup

Configure a central Prometheus to federate from cluster Prometheus instances:

```yaml
# central-prometheus-values.yaml
prometheus:
  prometheusSpec:
    # Disable local scraping since this is a federation-only instance
    scrapeInterval: 60s

    # External labels to identify the central instance
    externalLabels:
      prometheus: central
      role: federation

    # Federation scrape configuration
    additionalScrapeConfigs:
      - job_name: 'federate-cluster-1'
        scrape_interval: 60s
        honor_labels: true  # Preserve labels from source
        metrics_path: '/federate'

        # Match specific metrics to federate
        params:
          'match[]':
            # Aggregate instance-level metrics
            - '{job="kubernetes-nodes"}'
            - '{job="kubernetes-pods"}'

            # Application metrics
            - '{__name__=~"http_requests_.*"}'
            - '{__name__=~"http_request_duration_.*"}'

            # Resource metrics
            - '{__name__=~"container_.*"}'
            - '{__name__=~"node_.*"}'

        static_configs:
          - targets:
              - 'prometheus.cluster-1.example.com:9090'
            labels:
              cluster: 'cluster-1'
              region: 'us-east-1'

      - job_name: 'federate-cluster-2'
        scrape_interval: 60s
        honor_labels: true
        metrics_path: '/federate'
        params:
          'match[]':
            - '{job="kubernetes-nodes"}'
            - '{job="kubernetes-pods"}'
            - '{__name__=~"http_requests_.*"}'
            - '{__name__=~"http_request_duration_.*"}'
            - '{__name__=~"container_.*"}'
            - '{__name__=~"node_.*"}'
        static_configs:
          - targets:
              - 'prometheus.cluster-2.example.com:9090'
            labels:
              cluster: 'cluster-2'
              region: 'eu-west-1'
```

Deploy the central Prometheus:

```bash
helm install central-prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --values central-prometheus-values.yaml
```

## Hierarchical Federation

For very large deployments, create multiple federation levels:

```yaml
# Level 1: Cluster Prometheus (scrapes applications)
prometheus:
  prometheusSpec:
    externalLabels:
      cluster: 'cluster-1'
      datacenter: 'dc-east'
      level: 'cluster'

# Level 2: Regional Prometheus (federates from clusters)
prometheus:
  prometheusSpec:
    externalLabels:
      region: 'us-east'
      level: 'regional'

    additionalScrapeConfigs:
      - job_name: 'federate-clusters'
        scrape_interval: 60s
        honor_labels: true
        metrics_path: '/federate'
        params:
          'match[]':
            # Only federate pre-aggregated metrics
            - '{__name__=~"cluster:.*"}'
            - '{job="kubernetes-nodes"}'
        static_configs:
          - targets:
              - 'prometheus.cluster-1.local:9090'
              - 'prometheus.cluster-2.local:9090'
              - 'prometheus.cluster-3.local:9090'

# Level 3: Global Prometheus (federates from regions)
prometheus:
  prometheusSpec:
    externalLabels:
      level: 'global'

    additionalScrapeConfigs:
      - job_name: 'federate-regions'
        scrape_interval: 120s
        honor_labels: true
        metrics_path: '/federate'
        params:
          'match[]':
            - '{__name__=~"region:.*"}'
        static_configs:
          - targets:
              - 'prometheus.us-east.example.com:9090'
              - 'prometheus.eu-west.example.com:9090'
              - 'prometheus.ap-south.example.com:9090'
```

## Recording Rules for Federation

Pre-aggregate metrics in leaf Prometheus instances to reduce federation load:

```yaml
# cluster-prometheus-recording-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: federation-recording-rules
  namespace: monitoring
  labels:
    release: prometheus-stack
spec:
  groups:
    - name: cluster-aggregations
      interval: 30s
      rules:
        # Aggregate CPU by namespace
        - record: cluster:namespace_cpu:sum
          expr: |
            sum(rate(container_cpu_usage_seconds_total[5m])) by (namespace)

        # Aggregate memory by namespace
        - record: cluster:namespace_memory:sum
          expr: |
            sum(container_memory_usage_bytes) by (namespace)

        # Aggregate request rate by service
        - record: cluster:service_http_requests:rate5m
          expr: |
            sum(rate(http_requests_total[5m])) by (service, namespace)

        # Aggregate error rate by service
        - record: cluster:service_http_errors:rate5m
          expr: |
            sum(rate(http_requests_total{status=~"5.."}[5m])) by (service, namespace)

        # Pod count by namespace
        - record: cluster:namespace_pod_count:sum
          expr: |
            count(kube_pod_info) by (namespace)

        # Node resource usage
        - record: cluster:node_cpu_utilization:avg
          expr: |
            avg(rate(node_cpu_seconds_total{mode!="idle"}[5m])) by (node)

        - record: cluster:node_memory_utilization:avg
          expr: |
            avg(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) by (node)
```

Then federate only the aggregated metrics:

```yaml
# central-prometheus configuration
params:
  'match[]':
    - '{__name__=~"cluster:.*"}'  # Only federate recording rules
```

## Selective Metric Federation

Choose specific metrics to reduce data volume:

```yaml
# Federate only essential metrics
params:
  'match[]':
    # System health metrics
    - 'up'
    - '{__name__=~"kube_node_.*"}'
    - '{__name__=~"kube_pod_status_.*"}'

    # Critical application metrics
    - '{__name__="http_requests_total"}'
    - '{__name__="http_request_duration_seconds"}'

    # Resource metrics (recording rules only)
    - '{__name__=~"cluster:.*"}'
    - '{__name__=~"namespace:.*"}'

    # Exclude high-cardinality metrics
    # Do NOT federate: individual container metrics, per-request metrics
```

## Authentication and Security

Secure federation endpoints with authentication:

```yaml
# On leaf Prometheus, create BasicAuth for federation endpoint
apiVersion: v1
kind: Secret
metadata:
  name: prometheus-federation-auth
  namespace: monitoring
stringData:
  auth: |
    # Generated with: htpasswd -nB federate-user
    federate-user:$2y$05$encrypted_password_hash

---
# Configure Prometheus to use BasicAuth
prometheus:
  prometheusSpec:
    web:
      httpConfig:
        http2: true
        headers:
          X-Frame-Options: SAMEORIGIN

---
# In central Prometheus, add credentials
additionalScrapeConfigs:
  - job_name: 'federate-cluster-1'
    scrape_interval: 60s
    honor_labels: true
    metrics_path: '/federate'

    # Basic authentication
    basic_auth:
      username: federate-user
      password_file: /etc/prometheus/secrets/federation-password

    params:
      'match[]':
        - '{job="kubernetes-nodes"}'

    static_configs:
      - targets:
          - 'prometheus.cluster-1.example.com:9090'
```

Mount the password secret:

```yaml
prometheus:
  prometheusSpec:
    secrets:
      - federation-password
```

## Service Discovery for Federation

Use Kubernetes service discovery to automatically discover Prometheus instances:

```yaml
# central-prometheus with automatic cluster discovery
additionalScrapeConfigs:
  - job_name: 'federate-auto-discover'
    scrape_interval: 60s
    honor_labels: true
    metrics_path: '/federate'

    params:
      'match[]':
        - '{__name__=~"cluster:.*"}'

    # Kubernetes service discovery
    kubernetes_sd_configs:
      - role: service
        namespaces:
          names:
            - monitoring

    # Filter for Prometheus services
    relabel_configs:
      # Keep only services with specific label
      - source_labels: [__meta_kubernetes_service_label_app_kubernetes_io_name]
        regex: prometheus
        action: keep

      # Extract cluster name from service label
      - source_labels: [__meta_kubernetes_service_label_cluster]
        target_label: cluster
        action: replace

      # Use service name as target
      - source_labels: [__meta_kubernetes_service_name, __meta_kubernetes_namespace, __meta_kubernetes_service_port_name]
        regex: (.*);(.*);(.*)
        target_label: __address__
        replacement: ${1}.${2}.svc.cluster.local:9090
        action: replace
```

## Monitoring Federation Health

Create alerts for federation issues:

```yaml
# federation-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: federation-alerts
  namespace: monitoring
  labels:
    release: prometheus-stack
spec:
  groups:
    - name: federation-health
      interval: 30s
      rules:
        - alert: FederationTargetDown
          expr: |
            up{job=~"federate-.*"} == 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Federation target {{ $labels.instance }} is down"
            description: "Cannot scrape metrics from {{ $labels.instance }} for 5 minutes."

        - alert: FederationScrapeDuration
          expr: |
            scrape_duration_seconds{job=~"federate-.*"} > 30
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Federation scrape is slow"
            description: "Scraping {{ $labels.instance }} takes {{ $value }}s."

        - alert: FederationSampleLimit
          expr: |
            scrape_samples_scraped{job=~"federate-.*"} > 100000
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Federation scraping too many samples"
            description: "Scraping {{ $value }} samples from {{ $labels.instance }}."
```

## Global Dashboards

Create Grafana dashboards querying the central Prometheus:

```json
{
  "dashboard": {
    "title": "Global Cluster Overview",
    "panels": [
      {
        "title": "CPU Usage by Cluster",
        "targets": [
          {
            "expr": "sum(cluster:namespace_cpu:sum) by (cluster)",
            "legendFormat": "{{ cluster }}"
          }
        ]
      },
      {
        "title": "Memory Usage by Cluster",
        "targets": [
          {
            "expr": "sum(cluster:namespace_memory:sum) by (cluster)",
            "legendFormat": "{{ cluster }}"
          }
        ]
      },
      {
        "title": "Request Rate by Cluster",
        "targets": [
          {
            "expr": "sum(cluster:service_http_requests:rate5m) by (cluster)",
            "legendFormat": "{{ cluster }}"
          }
        ]
      }
    ]
  }
}
```

## Troubleshooting Federation

### Check Federation Endpoint

Test the federation endpoint directly:

```bash
# From central Prometheus or locally via port-forward
curl 'http://prometheus.cluster-1.example.com:9090/federate?match[]={job="kubernetes-nodes"}' | head -20
```

### Monitor Scrape Metrics

Query federation scrape health:

```promql
# Check if federation targets are up
up{job=~"federate-.*"}

# Scrape duration
scrape_duration_seconds{job=~"federate-.*"}

# Number of samples scraped
scrape_samples_scraped{job=~"federate-.*"}

# Scrape failures
scrape_samples_post_metric_relabeling{job=~"federate-.*"}
```

### Verify Labels

Ensure `honor_labels: true` is set to preserve source labels:

```yaml
honor_labels: true  # This is critical for federation
```

Without `honor_labels: true`, the central Prometheus may overwrite labels from source instances.

## Federation vs Remote Write

Choose the right approach:

**Use Federation when:**
- You need selective metric aggregation
- Querying stale data (1-2 minutes) is acceptable
- You want pull-based architecture
- Minimizing network traffic is important
- Each cluster needs independent Prometheus

**Use Remote Write when:**
- You need real-time metric forwarding
- Long-term storage is the priority
- Push-based architecture fits your model
- You want to use specialized storage (Mimir, Thanos, Cortex)

**Use Both when:**
- Federation for real-time global dashboards
- Remote write for long-term storage and historical queries

## Best Practices

1. Use recording rules in leaf instances to pre-aggregate metrics
2. Federate only necessary metrics using match parameters
3. Set appropriate scrape intervals (60s or higher for federation)
4. Monitor federation scrape duration and sample counts
5. Use external labels to identify metric sources
6. Implement authentication on federation endpoints
7. Consider hierarchical federation for very large deployments
8. Keep federation scrape intervals longer than local scrapes
9. Test federation match patterns before production deployment
10. Document which metrics are federated and why

## Conclusion

Prometheus federation enables scalable multi-cluster monitoring by creating a hierarchy of Prometheus instances. By federating pre-aggregated metrics and using selective matching, you can build global observability without overwhelming individual clusters. Combined with recording rules and proper authentication, federation provides a robust solution for monitoring distributed Kubernetes environments while keeping each cluster's Prometheus focused on local metrics collection.
