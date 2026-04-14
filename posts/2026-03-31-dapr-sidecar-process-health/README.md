# How to Monitor Dapr Sidecar Process Health

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Sidecar, Monitoring, Kubernetes, Observability

Description: Monitor the health of the Dapr sidecar process using health endpoints, Kubernetes probes, Prometheus metrics, and log-based alerting to detect issues before they impact users.

---

The Dapr sidecar is a critical component of every Dapr-enabled service. If it becomes unhealthy, your application loses access to state stores, pub/sub, and other Dapr APIs. Monitoring sidecar health proactively helps you catch issues before they cascade.

## Health Check Endpoint

Dapr exposes a health endpoint that returns HTTP 204 when the sidecar is healthy:

```bash
curl -v http://localhost:3500/v1.0/healthz
# HTTP/1.1 204 No Content = healthy
```

This endpoint checks:
- daprd process is running
- All components initialized successfully
- App channel is initialized (if configured)

## Kubernetes Liveness and Readiness Probes

The Dapr injector configures liveness and readiness probes automatically. You can inspect them:

```bash
kubectl get pod my-pod -o json | jq '.spec.containers[] | select(.name=="daprd") | {liveness: .livenessProbe, readiness: .readinessProbe}'
```

You can override the default probe settings with annotations:

```yaml
annotations:
  dapr.io/sidecar-liveness-probe-delay-seconds: "3"
  dapr.io/sidecar-liveness-probe-period-seconds: "6"
  dapr.io/sidecar-liveness-probe-threshold: "3"
  dapr.io/sidecar-readiness-probe-delay-seconds: "3"
  dapr.io/sidecar-readiness-probe-period-seconds: "6"
```

## Prometheus Metrics

Dapr exposes Prometheus metrics on port 9090 of the sidecar. Enable metrics collection:

```yaml
annotations:
  dapr.io/enable-metrics: "true"
  dapr.io/metrics-port: "9090"
```

Key health-related metrics to monitor:

```text
# Component initialization status
dapr_runtime_component_init_total
dapr_runtime_component_init_fail_total

# gRPC and HTTP server errors
dapr_grpc_io_server_completed_rpcs{grpc_server_status!="OK"}
dapr_http_server_request_count{status=~"5.."}
```

## AlertManager Rules for Sidecar Health

Create Prometheus alerting rules to notify when a sidecar is unhealthy:

```yaml
groups:
  - name: dapr-sidecar
    rules:
      - alert: DaprSidecarComponentInitFailed
        expr: dapr_runtime_component_init_fail_total > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Dapr component failed to initialize on {{ $labels.app_id }}"

      - alert: DaprSidecarHighErrorRate
        expr: rate(dapr_http_server_request_count{status=~"5.."}[5m]) > 0.1
        for: 2m
        labels:
          severity: warning
```

## Log-Based Health Monitoring

Watch for critical log patterns in sidecar logs:

```bash
kubectl logs my-pod -c daprd | grep -E "error|fatal|failed to init|component error"
```

In Grafana Loki, use a log query to count sidecar errors by app:

```text
count_over_time({container="daprd"} |= "error" [5m])
```

## Checking Sidecar via Metadata API

The metadata API returns detailed sidecar status including loaded components:

```bash
curl http://localhost:3500/v1.0/metadata | jq '{components: .components, actors: .actors}'
```

If a component is missing from the list, it failed to load.

## Summary

Monitoring Dapr sidecar health requires combining Kubernetes probes, Prometheus metrics, and log-based alerting. Probes catch immediate failures, metrics provide trend visibility, and log alerts surface component-level issues that do not always trigger pod restarts but still degrade application functionality.
