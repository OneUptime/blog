# How to Implement USE Metrics for Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Metric, Observability, Monitoring, Kubernetes

Description: Learn how to implement the USE method (Utilization, Saturation, Errors) for Dapr sidecars to gain actionable insights into your microservice health.

---

## What Are USE Metrics?

The USE method - Utilization, Saturation, Errors - was popularized by Brendan Gregg as a practical framework for identifying performance bottlenecks. Applied to Dapr, USE metrics give you a structured way to monitor each sidecar and surface issues before they affect end users.

- **Utilization**: How busy is the Dapr sidecar? (CPU, memory, active connections)
- **Saturation**: Is work queuing up? (pending requests, backpressure)
- **Errors**: Are operations failing? (gRPC errors, state store failures)

## Enabling Dapr Metrics

Dapr exposes a Prometheus-compatible metrics endpoint on port 9090 by default. Enable it in your deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "my-service"
        dapr.io/metrics-port: "9090"
        dapr.io/enable-metrics: "true"
    spec:
      containers:
      - name: my-service
        image: my-service:latest
```

## Utilization Metrics

Track CPU and memory usage of the Dapr sidecar container:

```bash
# Query Dapr sidecar CPU utilization via Prometheus
curl -s http://localhost:9090/metrics | grep dapr_grpc_io_server_completed_rpcs
```

Key Prometheus queries for utilization:

```bash
# Active gRPC connections (utilization proxy)
dapr_grpc_io_server_started_rpcs{app_id="my-service"}

# HTTP middleware request rate
rate(dapr_http_server_request_count{app_id="my-service"}[5m])
```

## Saturation Metrics

Saturation measures how overloaded the system is. In Dapr, look for queue depth and retry accumulation:

```bash
# Pending actor reminders (saturation signal)
dapr_runtime_actor_reminders{app_id="my-service"}

# Message backlog on pub/sub component
dapr_component_pubsub_ingress_count{app_id="my-service", topic="orders"}
```

Set up a Prometheus alerting rule for saturation:

```yaml
groups:
- name: dapr-saturation
  rules:
  - alert: DaprHighRequestQueue
    expr: rate(dapr_http_server_request_count{app_id="my-service"}[1m]) > 500
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "Dapr sidecar saturated on {{ $labels.app_id }}"
```

## Error Metrics

Errors are the most actionable signal. Dapr exposes error counts per component and per RPC method:

```bash
# State store errors
dapr_component_state_count{operation="get",success="false",app_id="my-service"}

# Service invocation errors by status code
dapr_http_server_request_count{app_id="my-service",status="500"}

# gRPC errors
dapr_grpc_io_server_completed_rpcs{grpc_server_status="UNAVAILABLE"}
```

## Building a USE Dashboard in Grafana

Create a Grafana dashboard with three panels - one for each USE dimension:

```bash
# Install Grafana with Helm
helm install grafana grafana/grafana \
  --set datasources."datasources\.yaml".apiVersion=1 \
  --set datasources."datasources\.yaml".datasources[0].name=Prometheus \
  --set datasources."datasources\.yaml".datasources[0].url=http://prometheus-server
```

Import a Dapr Grafana dashboard from the [official Dapr Grafana templates](https://github.com/dapr/dapr/tree/master/grafana) and extend it with USE-specific panels for each of your Dapr-enabled services.

## Summary

The USE method applied to Dapr gives you a repeatable, three-dimensional view of sidecar health across your microservices fleet. By scraping Dapr's built-in Prometheus metrics and structuring them around Utilization, Saturation, and Errors, teams can quickly isolate performance bottlenecks and set meaningful alerting thresholds for production environments.
