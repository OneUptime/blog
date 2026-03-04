# How to Monitor Webhook Performance in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Webhooks, Monitoring, Prometheus

Description: How to monitor Istio sidecar injection webhook performance including latency, error rates, and throughput using Prometheus metrics and Kubernetes tooling.

---

The Istio sidecar injection webhook runs on every pod creation in namespaces where injection is enabled. If the webhook is slow or failing, it directly affects how fast your pods start. In a busy cluster with hundreds of pod creations per minute, webhook performance becomes a real concern.

Monitoring the webhook gives you visibility into injection latency, error rates, and capacity so you can spot problems before they affect your teams.

## Webhook Metrics from istiod

Istiod exposes Prometheus metrics about the sidecar injection webhook. These are available on istiod's metrics port (15014 by default).

To see all injection-related metrics:

```bash
kubectl exec -n istio-system deploy/istiod -- curl -s localhost:15014/metrics | grep sidecar_injection
```

Key metrics include:

**sidecar_injection_requests_total**: Total number of injection requests received, labeled by success or failure.

```text
sidecar_injection_requests_total{success="true"} 15234
sidecar_injection_requests_total{success="false"} 3
```

**sidecar_injection_time_seconds**: Histogram of injection processing time.

```text
sidecar_injection_time_seconds_bucket{le="0.001"} 120
sidecar_injection_time_seconds_bucket{le="0.005"} 14500
sidecar_injection_time_seconds_bucket{le="0.01"} 15200
sidecar_injection_time_seconds_bucket{le="0.025"} 15230
sidecar_injection_time_seconds_bucket{le="+Inf"} 15234
```

**sidecar_injection_skip_total**: Number of pods that were skipped (not injected) because of annotations or policy.

## Prometheus Queries for Webhook Monitoring

Once these metrics are being scraped by Prometheus, you can create useful queries.

### Injection Success Rate

```promql
sum(rate(sidecar_injection_requests_total{success="true"}[5m])) /
sum(rate(sidecar_injection_requests_total[5m]))
```

This gives you the percentage of successful injections. Anything below 100% warrants investigation.

### Injection Latency (p99)

```promql
histogram_quantile(0.99, sum(rate(sidecar_injection_time_seconds_bucket[5m])) by (le))
```

Healthy injection latency should be under 10ms. If you see p99 latency above 50ms, istiod might be under resource pressure.

### Injection Error Rate

```promql
sum(rate(sidecar_injection_requests_total{success="false"}[5m]))
```

This shows the per-second rate of injection failures. Even a small number here is worth investigating.

### Injection Throughput

```promql
sum(rate(sidecar_injection_requests_total[5m]))
```

Shows how many injection requests per second istiod is processing. Useful for capacity planning.

## Kubernetes API Server Webhook Metrics

The Kubernetes API server also exposes metrics about webhook execution. These give you the "external" view of webhook latency, including network time between the API server and istiod.

Key API server metrics:

**apiserver_admission_webhook_admission_duration_seconds**: Latency of webhook calls from the API server perspective.

```promql
histogram_quantile(0.99,
  sum(rate(apiserver_admission_webhook_admission_duration_seconds_bucket{
    name="rev.namespace.sidecar-injector.istio.io",
    type="admit"
  }[5m])) by (le)
)
```

**apiserver_admission_webhook_rejection_count**: Number of times the webhook rejected requests.

```promql
sum(rate(apiserver_admission_webhook_rejection_count{
  name="rev.namespace.sidecar-injector.istio.io"
}[5m]))
```

These API server metrics include network latency, so they will always be higher than istiod's internal metrics. The difference between the two tells you how much time is spent on network communication.

## Setting Up Grafana Dashboards

Create a Grafana dashboard to visualize webhook performance. Here is a JSON model for a basic panel showing injection latency:

```json
{
  "targets": [
    {
      "expr": "histogram_quantile(0.50, sum(rate(sidecar_injection_time_seconds_bucket[5m])) by (le))",
      "legendFormat": "p50"
    },
    {
      "expr": "histogram_quantile(0.95, sum(rate(sidecar_injection_time_seconds_bucket[5m])) by (le))",
      "legendFormat": "p95"
    },
    {
      "expr": "histogram_quantile(0.99, sum(rate(sidecar_injection_time_seconds_bucket[5m])) by (le))",
      "legendFormat": "p99"
    }
  ],
  "title": "Sidecar Injection Latency",
  "type": "timeseries"
}
```

Panels worth including in your dashboard:

1. Injection request rate (success vs failure)
2. Injection latency percentiles (p50, p95, p99)
3. Injection skip rate
4. API server webhook latency
5. istiod CPU and memory usage

## Alerting on Webhook Issues

Set up Prometheus alerting rules to catch problems early.

### Alert on High Error Rate

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-webhook-alerts
  namespace: istio-system
spec:
  groups:
  - name: istio-webhook
    rules:
    - alert: IstioWebhookHighErrorRate
      expr: |
        sum(rate(sidecar_injection_requests_total{success="false"}[5m]))
        / sum(rate(sidecar_injection_requests_total[5m])) > 0.01
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Istio sidecar injection error rate above 1%"
        description: "{{ $value | humanizePercentage }} of injection requests are failing"
```

### Alert on High Latency

```yaml
    - alert: IstioWebhookHighLatency
      expr: |
        histogram_quantile(0.99,
          sum(rate(sidecar_injection_time_seconds_bucket[5m])) by (le)
        ) > 0.1
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Istio sidecar injection p99 latency above 100ms"
```

### Alert on Webhook Unreachable

```yaml
    - alert: IstioWebhookUnreachable
      expr: |
        sum(rate(apiserver_admission_webhook_rejection_count{
          name=~".*sidecar-injector.*",
          error_type="calling_webhook_error"
        }[5m])) > 0
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "Kubernetes API server cannot reach Istio sidecar injector"
```

## Checking Webhook Performance Manually

For quick checks without Prometheus, you can time pod creation directly:

```bash
time kubectl run test-timing --image=nginx -n my-namespace --restart=Never
```

Compare this with pod creation in a namespace without injection:

```bash
time kubectl run test-timing --image=nginx -n default --restart=Never
```

The difference gives you a rough estimate of webhook overhead. Clean up afterward:

```bash
kubectl delete pod test-timing -n my-namespace
kubectl delete pod test-timing -n default
```

You can also check the webhook timeout setting:

```bash
kubectl get mutatingwebhookconfiguration istio-sidecar-injector \
  -o jsonpath='{.webhooks[0].timeoutSeconds}'
```

The default is 10 seconds. If injection is consistently slow, pods will fail with timeout errors, which shows up as creation failures in the API server.

## Correlating Webhook Performance with istiod Health

Webhook latency often correlates with istiod resource usage. Monitor these together:

```bash
kubectl top pod -n istio-system -l app=istiod
```

If istiod CPU usage is high, injection latency will increase because the injection handler shares resources with other istiod functions like xDS serving, certificate management, and configuration processing.

Increasing istiod resource limits can help:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        resources:
          requests:
            cpu: 500m
            memory: 2Gi
          limits:
            cpu: "2"
            memory: 4Gi
```

Monitoring webhook performance is not something most teams think about until they hit a problem. But with a few Prometheus queries and a Grafana dashboard, you get early warning when things start degrading, long before it turns into a production incident.
