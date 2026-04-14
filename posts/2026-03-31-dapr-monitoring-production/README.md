# How to Set Up Dapr Monitoring for Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Monitoring, Prometheus, Grafana, Observability, Production

Description: Configure end-to-end Dapr monitoring for production using Prometheus metrics, Grafana dashboards, and distributed tracing with Zipkin or Jaeger.

---

Production Dapr deployments require comprehensive monitoring covering control plane health, sidecar performance, and inter-service communication. Dapr exposes Prometheus metrics out of the box and integrates with popular observability stacks.

## Enabling Metrics in Dapr

Dapr exposes metrics on port 9090 by default. Verify metrics are enabled in the Dapr configuration:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-config
  namespace: default
spec:
  metrics:
    enabled: true
    http:
      increasedCardinality: false
```

## Scraping Dapr Metrics with Prometheus

Add Prometheus scrape configs for Dapr control plane and sidecars:

```yaml
scrape_configs:
  - job_name: 'dapr-control-plane'
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
            - dapr-system
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true

  - job_name: 'dapr-sidecars'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app_kubernetes_io_part_of]
        action: keep
        regex: dapr
      - source_labels: [__address__]
        target_label: __address__
        regex: '(.+):.*'
        replacement: '${1}:9090'
```

## Key Dapr Metrics to Monitor

The most important Dapr metrics for production:

```bash
# Request success rate per app
dapr_runtime_service_invocation_req_sent_total

# gRPC server request latency
dapr_grpc_io_server_server_latency

# Pub/sub message processing
dapr_component_pubsub_ingress_count
dapr_component_pubsub_egress_count

# Actor placement
dapr_placement_runtimes_total
```

## Grafana Dashboard Setup

Import the official Dapr Grafana dashboards from the [dapr/dapr GitHub repository](https://github.com/dapr/dapr/tree/master/grafana):

```bash
# Download official Dapr dashboard JSON files
curl -O https://raw.githubusercontent.com/dapr/dapr/master/grafana/grafana-system-services-dashboard.json
curl -O https://raw.githubusercontent.com/dapr/dapr/master/grafana/grafana-sidecar-dashboard.json
curl -O https://raw.githubusercontent.com/dapr/dapr/master/grafana/grafana-actor-dashboard.json

# Import via Grafana HTTP API
curl -X POST http://localhost:3000/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d @grafana-system-services-dashboard.json
```

Or provision them via ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dapr-grafana-dashboards
  labels:
    grafana_dashboard: "true"
data:
  dapr-dashboard.json: |
    { ... dashboard JSON ... }
```

## Distributed Tracing with Zipkin

Enable tracing in your Dapr Configuration resource:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-tracing
spec:
  tracing:
    samplingRate: "0.1"
    zipkin:
      endpointAddress: http://zipkin.monitoring:9411/api/v2/spans
```

A `samplingRate` of `"0.1"` samples 10% of traces, balancing visibility with storage costs.

## Health Check Endpoints

Monitor control plane health via Kubernetes liveness probes and the Dapr health API:

```bash
# Check overall Dapr health
curl http://localhost:3500/v1.0/healthz

# Check outbound connectivity
curl http://localhost:3500/v1.0/healthz/outbound
```

Use these endpoints in load balancer health checks and uptime monitors.

## Summary

Production Dapr monitoring combines Prometheus metrics scraping, pre-built Grafana dashboards, and distributed tracing to give full visibility into service communication. Prioritize monitoring service invocation latency, pub/sub throughput, and control plane replica health to detect issues before they impact end users.
