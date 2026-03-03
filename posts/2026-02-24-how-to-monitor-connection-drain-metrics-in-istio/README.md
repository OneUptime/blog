# How to Monitor Connection Drain Metrics in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Monitoring, Connection Drain, Prometheus, Metrics

Description: Track and analyze connection drain metrics in Istio to verify graceful shutdown behavior and catch deployment-related connection issues early.

---

You've configured drain durations, preStop hooks, and retry policies. But how do you know if they're actually working? Without monitoring, you're just hoping your drain configuration is correct. Connection drain metrics tell you exactly what happens during pod shutdown: how many connections were active, how long the drain took, whether any connections were forcibly closed, and if clients experienced errors.

## Key Metrics for Connection Drain

Istio's Envoy sidecar exposes several metrics that are relevant to connection draining. These are available through the Envoy stats interface and can be scraped by Prometheus.

The most important ones:

- `istio_tcp_connections_opened_total` - New TCP connections being established
- `istio_tcp_connections_closed_total` - TCP connections being closed
- `istio_requests_total` - HTTP request count (watch for 5xx during drain)
- `envoy_server_drain_count` - Number of times the drain sequence was initiated
- `envoy_server_total_connections` - Current active connections

## Setting Up Prometheus Queries

Check the error rate during deployments by correlating with pod termination events:

```bash
# 5xx error rate for a specific service over the last 10 minutes
kubectl exec -n istio-system deploy/prometheus -- \
  promtool query instant http://localhost:9090 \
  'sum(rate(istio_requests_total{destination_service="api.default.svc.cluster.local",response_code=~"5.."}[10m])) / sum(rate(istio_requests_total{destination_service="api.default.svc.cluster.local"}[10m]))'
```

For a time-series view that shows error rate over time (useful for seeing deployment-correlated spikes):

```yaml
# Prometheus recording rule for drain health
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-drain-metrics
  namespace: istio-system
spec:
  groups:
  - name: istio-drain
    interval: 15s
    rules:
    - record: istio:service:error_rate_5m
      expr: |
        sum(rate(istio_requests_total{response_code=~"5.."}[5m])) by (destination_service)
        /
        sum(rate(istio_requests_total[5m])) by (destination_service)
    - record: istio:service:connection_close_rate_5m
      expr: |
        sum(rate(istio_tcp_connections_closed_total[5m])) by (destination_service)
```

## Envoy Admin Stats During Drain

The most detailed drain metrics come from Envoy's admin interface. You can access these on a running (or draining) pod:

```bash
# Get the current server state (LIVE, DRAINING, etc.)
kubectl exec deploy/api -c istio-proxy -- \
  pilot-agent request GET /server_info | python3 -m json.tool

# Get drain-related stats
kubectl exec deploy/api -c istio-proxy -- \
  pilot-agent request GET /stats | grep -E "drain|server\."
```

The output includes stats like:

```text
server.total_connections: 45
server.days_until_first_cert_expiring: 364
listener_manager.listener_stopped: 2
```

`listener_manager.listener_stopped` tells you that listeners were stopped (part of the drain process). `server.total_connections` shows how many connections are still active.

## Creating a Drain Monitoring Dashboard

Build a Grafana dashboard that tracks drain health. Here are the panels you need:

**Panel 1: Connection Open/Close Rate**

```text
# Connections opened (should drop to zero during drain)
sum(rate(istio_tcp_connections_opened_total{destination_workload="api"}[1m])) by (destination_workload_namespace)

# Connections closed (spikes during drain)
sum(rate(istio_tcp_connections_closed_total{destination_workload="api"}[1m])) by (destination_workload_namespace)
```

**Panel 2: Error Rate Correlated with Deployments**

```text
# Error rate
sum(rate(istio_requests_total{destination_workload="api",response_code=~"5.."}[1m])) by (response_code)

# Annotate with deployment events using kube-state-metrics
kube_deployment_status_observed_generation{deployment="api"}
```

**Panel 3: Active Connection Count**

```text
# Active connections (should drain to zero during shutdown)
sum(istio_tcp_connections_opened_total{destination_workload="api"}) by (destination_workload_namespace)
-
sum(istio_tcp_connections_closed_total{destination_workload="api"}) by (destination_workload_namespace)
```

**Panel 4: Request Duration During Drain**

```text
# p99 request duration (spikes indicate requests waiting on draining connections)
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{destination_workload="api"}[1m])) by (le)
)
```

## Alerting on Drain Issues

Set up alerts that fire when connection draining is causing problems:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: drain-alerts
  namespace: istio-system
spec:
  groups:
  - name: drain-health
    rules:
    - alert: HighErrorRateDuringDeploy
      expr: |
        (
          sum(rate(istio_requests_total{response_code=~"5.."}[2m])) by (destination_service)
          /
          sum(rate(istio_requests_total[2m])) by (destination_service)
        ) > 0.01
      for: 1m
      labels:
        severity: warning
      annotations:
        summary: "Error rate above 1% for {{ $labels.destination_service }}"
        description: "This often indicates connection drain issues during deployment"

    - alert: ConnectionResetSpike
      expr: |
        sum(rate(istio_tcp_connections_closed_total[1m])) by (destination_service)
        >
        3 * sum(rate(istio_tcp_connections_closed_total[1h])) by (destination_service)
      for: 2m
      labels:
        severity: warning
      annotations:
        summary: "Connection close rate 3x above normal for {{ $labels.destination_service }}"
```

## Collecting Drain Metrics with a Sidecar Script

For more detailed drain telemetry, you can add a script that runs during shutdown and records metrics:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  template:
    spec:
      containers:
      - name: api
        lifecycle:
          preStop:
            exec:
              command:
              - "/bin/sh"
              - "-c"
              - |
                # Log drain start
                echo "$(date -u +%FT%TZ) drain_start connections=$(curl -s http://localhost:15020/stats | grep 'server.total_connections' | awk '{print $2}')" >> /dev/stderr
                sleep 5
                # Log drain midpoint
                echo "$(date -u +%FT%TZ) drain_mid connections=$(curl -s http://localhost:15020/stats | grep 'server.total_connections' | awk '{print $2}')" >> /dev/stderr
```

This writes drain telemetry to stderr, which gets picked up by the container log collector. You can search for `drain_start` and `drain_mid` entries to see connection counts during the drain process.

## Analyzing Historical Drain Performance

Look at drain patterns over time to find services with problematic shutdown behavior:

```bash
# Services with the highest error rates (potential drain issues)
kubectl exec -n istio-system deploy/prometheus -- \
  promtool query instant http://localhost:9090 \
  'topk(10, sum(rate(istio_requests_total{response_code=~"5.."}[24h])) by (destination_service) / sum(rate(istio_requests_total[24h])) by (destination_service))'

# Services with the most connection resets
kubectl exec -n istio-system deploy/prometheus -- \
  promtool query instant http://localhost:9090 \
  'topk(10, sum(rate(istio_tcp_connections_closed_total[24h])) by (destination_service))'
```

If a service consistently shows up in the top 10 for error rates correlated with deployment times, it needs better drain configuration.

## End-to-End Drain Verification Test

Run a systematic test to verify drain behavior is correct:

```bash
#!/bin/bash
# drain-test.sh

SERVICE="api.default.svc.cluster.local"
NAMESPACE="default"
DEPLOY="api"

echo "Starting load test..."
kubectl run drain-test --image=fortio/fortio --rm -it -- \
  load -c 10 -qps 50 -t 120s -json /dev/stdout \
  http://${SERVICE}:8080/health > /tmp/fortio-before.json &

LOADTEST_PID=$!
sleep 10

echo "Triggering rolling restart..."
kubectl rollout restart deploy/${DEPLOY} -n ${NAMESPACE}

# Wait for rollout to complete
kubectl rollout status deploy/${DEPLOY} -n ${NAMESPACE} --timeout=120s

wait $LOADTEST_PID

echo "Analyzing results..."
python3 -c "
import json, sys
with open('/tmp/fortio-before.json') as f:
    data = json.load(f)
codes = data.get('RetCodes', {})
total = sum(codes.values())
errors = sum(v for k, v in codes.items() if int(k) >= 500)
print(f'Total requests: {total}')
print(f'Errors: {errors}')
print(f'Error rate: {errors/total*100:.2f}%')
if errors > 0:
    print('DRAIN CONFIGURATION NEEDS IMPROVEMENT')
else:
    print('DRAIN IS WORKING CORRECTLY')
"
```

Run this script regularly, especially after changing drain-related configuration. Automating it as part of your CI/CD pipeline ensures that configuration changes don't regress your drain behavior.

Monitoring connection drain metrics turns graceful shutdown from a hope into a measurable, testable property of your deployment pipeline. If you can't measure it, you can't improve it.
