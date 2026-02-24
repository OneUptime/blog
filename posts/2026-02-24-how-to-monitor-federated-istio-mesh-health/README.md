# How to Monitor Federated Istio Mesh Health

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Federation, Monitoring, Prometheus, Grafana, Kubernetes

Description: How to set up comprehensive monitoring for federated Istio meshes including cross-mesh metrics, health checks, and alerting strategies.

---

Monitoring a single Istio mesh is one thing. Monitoring federated meshes is a different challenge altogether. You need visibility into each individual mesh, the health of the federation links between them, and the end-to-end performance of requests that cross mesh boundaries.

Without proper monitoring, you'll be flying blind when something goes wrong between meshes. And trust me, things will go wrong. Network partitions, certificate expiry, gateway overload, configuration drift between meshes. You need to catch these before your users do.

## What to Monitor in a Federated Setup

There are several layers you need to watch:

1. Individual mesh health (each mesh's control plane and data plane)
2. East-west gateway health (the bridges between meshes)
3. Cross-mesh request metrics (latency, error rates, throughput)
4. Service discovery health (are remote endpoints being discovered?)
5. Certificate and trust status (are certs valid and trusted?)

## Setting Up Prometheus for Each Mesh

Each mesh should have its own Prometheus instance scraping local metrics. Install Prometheus using the Istio-provided configuration:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/prometheus.yaml \
  --context=cluster-west

kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/prometheus.yaml \
  --context=cluster-east
```

Configure Prometheus to scrape the east-west gateway metrics specifically. Add this job to your Prometheus config:

```yaml
scrape_configs:
  - job_name: 'eastwest-gateway'
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
            - istio-system
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_istio]
        action: keep
        regex: eastwestgateway
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        target_label: __address__
        regex: (.+)
        replacement: ${1}:15020
```

## Key Metrics for Federation Health

The most important metrics to track for federation are:

**East-west gateway metrics:**

```promql
# Request rate through the east-west gateway
sum(rate(istio_requests_total{
  reporter="destination",
  destination_service_name="istio-eastwestgateway"
}[5m])) by (response_code)

# Latency of cross-mesh requests
histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{
  reporter="destination",
  destination_service_name="istio-eastwestgateway"
}[5m])) by (le))
```

**Control plane metrics:**

```promql
# Remote cluster endpoint sync status
pilot_xds_pushes{type="eds"}

# Number of endpoints from remote clusters
pilot_k8s_endpoints_total

# Time to push configuration updates
histogram_quantile(0.99, sum(rate(pilot_xds_push_time_bucket[5m])) by (le))
```

**Cross-mesh request metrics:**

```promql
# Error rate for cross-mesh requests
sum(rate(istio_requests_total{
  response_code=~"5.*",
  source_cluster="cluster-west",
  destination_cluster="cluster-east"
}[5m]))
/
sum(rate(istio_requests_total{
  source_cluster="cluster-west",
  destination_cluster="cluster-east"
}[5m]))
```

## Federated Prometheus with Thanos

For a unified view across meshes, set up Thanos to aggregate metrics from all Prometheus instances.

Install the Thanos sidecar alongside each Prometheus:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus
  namespace: monitoring
spec:
  template:
    spec:
      containers:
        - name: prometheus
          image: prom/prometheus:v2.48.0
          args:
            - '--storage.tsdb.min-block-duration=2h'
            - '--storage.tsdb.max-block-duration=2h'
        - name: thanos-sidecar
          image: quay.io/thanos/thanos:v0.34.0
          args:
            - sidecar
            - '--tsdb.path=/prometheus'
            - '--prometheus.url=http://localhost:9090'
            - '--grpc-address=0.0.0.0:10901'
```

Then deploy a Thanos Query component that connects to all sidecars:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: thanos-query
  namespace: monitoring
spec:
  template:
    spec:
      containers:
        - name: thanos-query
          image: quay.io/thanos/thanos:v0.34.0
          args:
            - query
            - '--store=prometheus-west.monitoring.svc:10901'
            - '--store=prometheus-east.monitoring.svc:10901'
            - '--query.replica-label=cluster'
```

Now you can query metrics from all meshes through a single endpoint.

## Grafana Dashboards for Federation

Create a dedicated Grafana dashboard for federation health. Here are the essential panels:

```json
{
  "panels": [
    {
      "title": "Cross-Mesh Request Rate",
      "targets": [
        {
          "expr": "sum(rate(istio_requests_total{source_cluster!=destination_cluster}[5m])) by (source_cluster, destination_cluster)"
        }
      ]
    },
    {
      "title": "Cross-Mesh P99 Latency",
      "targets": [
        {
          "expr": "histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{source_cluster!=destination_cluster}[5m])) by (le, source_cluster, destination_cluster))"
        }
      ]
    },
    {
      "title": "East-West Gateway Active Connections",
      "targets": [
        {
          "expr": "envoy_cluster_upstream_cx_active{cluster_name=~\"outbound.*eastwestgateway.*\"}"
        }
      ]
    }
  ]
}
```

## Health Check Probes for Federation Links

Set up synthetic health checks that continuously test cross-mesh connectivity:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: federation-health-check
  namespace: monitoring
spec:
  schedule: "*/1 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: health-check
              image: curlimages/curl:latest
              command:
                - /bin/sh
                - -c
                - |
                  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
                    http://health-check.monitoring.svc.cluster.local:8080/health)
                  if [ "$STATUS" != "200" ]; then
                    echo "Federation health check failed: $STATUS"
                    exit 1
                  fi
          restartPolicy: OnFailure
```

This CronJob runs every minute and calls a health endpoint on the remote mesh. You can extend this to push results to your metrics system.

## Alerting Rules

Set up alerts for the critical federation failure modes:

```yaml
groups:
  - name: istio-federation
    rules:
      - alert: CrossMeshHighErrorRate
        expr: |
          sum(rate(istio_requests_total{
            response_code=~"5.*",
            source_cluster!=destination_cluster
          }[5m]))
          /
          sum(rate(istio_requests_total{
            source_cluster!=destination_cluster
          }[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Cross-mesh error rate above 5%"

      - alert: EastWestGatewayDown
        expr: |
          up{job="eastwest-gateway"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "East-west gateway is down"

      - alert: RemoteEndpointsSyncLag
        expr: |
          pilot_xds_push_time{type="eds"} > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Remote endpoint sync taking too long"
```

## Practical Tips

Tag all your metrics with cluster labels. Without cluster labels, you can't distinguish between local and remote traffic, which makes debugging nearly impossible.

Set up separate SLOs for cross-mesh traffic. Cross-mesh requests have different performance characteristics than local requests, so your SLOs should reflect that. A P99 latency of 50ms might be reasonable for in-cluster calls, but 200ms is more realistic for cross-mesh calls.

Keep your monitoring configurations in sync across meshes. Use GitOps to deploy the same dashboards and alert rules to every cluster. Configuration drift in monitoring is just as bad as configuration drift in your application.

Test your alerts regularly. Kill an east-west gateway on purpose and make sure the alerts fire. Check that the dashboards show the failure clearly. You don't want to discover that your monitoring is broken during an actual outage.
