# How to Monitor Istio Across Multiple Clusters with OneUptime

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, OneUptime, Multi-Cluster, Monitoring, Kubernetes

Description: Set up centralized monitoring for Istio service mesh deployments spanning multiple Kubernetes clusters using OneUptime.

---

Running Istio across multiple clusters is increasingly common for high availability, geographic distribution, or organizational separation. But monitoring a multi-cluster mesh brings unique challenges. You need a single pane of glass that shows the health of every cluster while still letting you drill down into individual cluster issues. Here's how to set that up with OneUptime.

## Multi-Cluster Istio Topologies

Before getting into monitoring, let's understand the common multi-cluster setups:

**Primary-Remote**: One cluster runs the Istio control plane, and remote clusters connect to it. The primary cluster has istiod, and remote clusters have only data plane components.

**Multi-Primary**: Each cluster runs its own istiod instance, and the meshes are connected so services can communicate across clusters.

**External Control Plane**: The control plane runs outside the mesh clusters entirely.

Each topology has different monitoring requirements, but the general approach is the same: deploy collectors in every cluster and send everything to OneUptime.

## Setting Up Per-Cluster Collectors

Every cluster needs its own OpenTelemetry Collector that labels data with the cluster identity. This is critical for distinguishing metrics from different clusters.

### Cluster 1 (us-east)

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: istio-system
data:
  config.yaml: |
    receivers:
      prometheus:
        config:
          scrape_configs:
            - job_name: 'istio-mesh'
              kubernetes_sd_configs:
                - role: pod
              relabel_configs:
                - source_labels: [__meta_kubernetes_pod_container_name]
                  regex: istio-proxy
                  action: keep
                - source_labels: [__address__]
                  action: replace
                  regex: ([^:]+)(?::\d+)?
                  replacement: $1:15090
                  target_label: __address__
            - job_name: 'istiod'
              kubernetes_sd_configs:
                - role: pod
                  namespaces:
                    names: [istio-system]
              relabel_configs:
                - source_labels: [__meta_kubernetes_pod_label_app]
                  regex: istiod
                  action: keep

    processors:
      batch:
        timeout: 30s
      resource:
        attributes:
          - key: cluster
            value: "us-east-1"
            action: upsert
          - key: region
            value: "us-east"
            action: upsert

    exporters:
      otlp/oneuptime:
        endpoint: "https://otlp.oneuptime.com"
        headers:
          x-oneuptime-token: "${ONEUPTIME_TOKEN}"

    service:
      pipelines:
        metrics:
          receivers: [prometheus]
          processors: [resource, batch]
          exporters: [otlp/oneuptime]
        traces:
          receivers: [otlp]
          processors: [resource, batch]
          exporters: [otlp/oneuptime]
        logs:
          receivers: [filelog]
          processors: [resource, batch]
          exporters: [otlp/oneuptime]
```

### Cluster 2 (us-west)

Same configuration but with different cluster and region labels:

```yaml
processors:
  resource:
    attributes:
      - key: cluster
        value: "us-west-1"
        action: upsert
      - key: region
        value: "us-west"
        action: upsert
```

### Cluster 3 (eu-west)

```yaml
processors:
  resource:
    attributes:
      - key: cluster
        value: "eu-west-1"
        action: upsert
      - key: region
        value: "eu-west"
        action: upsert
```

The key pattern here is that every collector adds `cluster` and `region` attributes to all telemetry data. This lets you filter and aggregate by cluster in OneUptime.

## Building Multi-Cluster Dashboards

### Global Overview Dashboard

Create a dashboard that shows the health of all clusters side by side:

**Row 1: Cluster Status Grid**

```text
# Request rate per cluster
sum(rate(istio_requests_total[5m])) by (cluster)

# Error rate per cluster
sum(rate(istio_requests_total{response_code=~"5.*"}[5m])) by (cluster)
/
sum(rate(istio_requests_total[5m])) by (cluster)
```

Display this as a table with one row per cluster, showing request rate, error rate, and a color-coded status.

**Row 2: Cross-Cluster Traffic**

In a multi-cluster mesh, services communicate across clusters. Monitor this traffic:

```text
# Cross-cluster request rate
sum(rate(istio_requests_total{source_cluster!="", destination_cluster!="", source_cluster!=destination_cluster}[5m])) by (source_cluster, destination_cluster)
```

Display this as a heatmap or table showing traffic flow between clusters.

**Row 3: Per-Cluster Latency Comparison**

```text
# P99 latency per cluster
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket[5m])) by (le, cluster)
)
```

This helps you spot if one cluster is performing worse than others, which could indicate infrastructure issues or capacity problems.

## Multi-Cluster Control Plane Monitoring

Depending on your topology, you need different monitoring:

### Multi-Primary Setup

Each cluster has its own istiod. Monitor each independently:

```text
# istiod health per cluster
# Connected proxies per istiod instance
pilot_xds{cluster="us-east-1"}
pilot_xds{cluster="us-west-1"}
pilot_xds{cluster="eu-west-1"}

# Push errors per cluster
sum(rate(pilot_xds_push_errors[5m])) by (cluster)

# Config convergence time per cluster
histogram_quantile(0.99,
  sum(rate(pilot_proxy_convergence_time_bucket[5m])) by (le, cluster)
)
```

### Primary-Remote Setup

The primary cluster's istiod is the single point of failure. Monitor it extra carefully:

```text
# Primary istiod connectivity from remote clusters
# If remote clusters can't reach the primary istiod, they'll show stale config

# On each remote cluster, check proxy-status
# Proxies showing STALE indicate connectivity issues with primary
```

```bash
# Check from each cluster context
kubectl config use-context us-east-primary
istioctl proxy-status

kubectl config use-context us-west-remote
istioctl proxy-status

kubectl config use-context eu-west-remote
istioctl proxy-status
```

## Cross-Cluster Service Discovery Monitoring

In a multi-cluster mesh, services are discovered across clusters. Monitor that this discovery is working:

```bash
# Check that services from other clusters are visible
istioctl proxy-config endpoints deploy/my-service | grep -i "cluster"

# You should see endpoints from all clusters
# If endpoints from a specific cluster are missing, there's a connectivity issue
```

Set up a synthetic monitor that periodically checks cross-cluster service resolution:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cross-cluster-check
  namespace: monitoring
spec:
  schedule: "*/5 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: checker
            image: curlimages/curl:latest
            command:
            - /bin/sh
            - -c
            - |
              # Try to reach a service that should be in another cluster
              RESULT=$(curl -s -o /dev/null -w "%{http_code}" http://remote-service.default.svc.cluster.local:8080/health)
              if [ "$RESULT" = "200" ]; then
                echo "Cross-cluster connectivity OK"
              else
                echo "Cross-cluster connectivity FAILED: $RESULT"
              fi
          restartPolicy: OnFailure
```

## Alerting for Multi-Cluster Issues

Set up alerts specific to multi-cluster problems:

### Cluster Divergence Alert

When one cluster starts performing significantly differently from others:

```yaml
# Alert when a cluster's error rate is 3x the average
# This catches cluster-specific issues like node failures or network problems
alert:
  name: "Cluster Divergence - Error Rate"
  condition: |
    cluster_error_rate > 3 * avg_error_rate_across_clusters
  for: 10m
  severity: high
```

### Cross-Cluster Connectivity Lost

```yaml
# Alert when cross-cluster traffic drops to zero
alert:
  name: "Cross-Cluster Connectivity Lost"
  condition: |
    sum(rate(istio_requests_total{source_cluster!=destination_cluster}[5m])) == 0
  for: 5m
  severity: critical
```

### Control Plane Split-Brain

In multi-primary setups, control planes should have consistent configuration:

```yaml
# Alert when clusters have different Istio configurations
# Compare the number of configured routes or listeners
alert:
  name: "Config Divergence Between Clusters"
  condition: |
    abs(
      sum(pilot_xds_pushes{cluster="us-east-1"}) -
      sum(pilot_xds_pushes{cluster="us-west-1"})
    ) > threshold
  severity: medium
```

## Incident Management Across Clusters

When an incident affects multiple clusters, coordinate the response:

1. **Identify scope**: Is the issue in one cluster, multiple clusters, or cross-cluster communication?
2. **Check recent changes**: Was a configuration change applied across all clusters or just one?
3. **Isolate if needed**: In a multi-primary mesh, you can isolate a problematic cluster by removing its connectivity

```bash
# Check recent config changes per cluster
kubectl config use-context us-east-1
kubectl get events -n istio-system --sort-by='.lastTimestamp' | tail -10

kubectl config use-context us-west-1
kubectl get events -n istio-system --sort-by='.lastTimestamp' | tail -10
```

## Capacity Planning Across Clusters

Use OneUptime to track per-cluster capacity trends:

```text
# Request volume growth per cluster (weekly comparison)
sum(rate(istio_requests_total{cluster="us-east-1"}[1h]))

# Proxy count growth per cluster
pilot_xds{cluster="us-east-1"}
```

Track these over time to understand which clusters are growing fastest and need more capacity. Rebalancing traffic across clusters is much easier when you have good data.

The fundamental principle of multi-cluster monitoring is simple: label everything with the cluster identity, centralize it all in OneUptime, and build views that let you see both the forest and the trees. With the right dashboards and alerts, managing multiple Istio clusters becomes no harder than managing one.
