# How to Monitor Canary Deployment Health in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Canary Monitoring, Observability, Prometheus

Description: Set up comprehensive monitoring for canary deployments in Istio using Prometheus, Grafana, and Kiali to track version-specific health metrics in real time.

---

A canary deployment without monitoring is just a slow rollout with extra complexity. The entire value of canary deployments comes from observing the canary's health and comparing it to the stable version. Istio gives you rich telemetry out of the box, and with the right dashboards and alerts, you can spot problems in the canary version within seconds.

This guide covers how to set up monitoring specifically for canary deployments, including the key metrics to track, how to build comparison dashboards, and what alerts to configure.

## Key Metrics for Canary Monitoring

Istio generates four categories of metrics that matter for canary health:

**Request metrics (L7):**
- `istio_requests_total` - Total request count with response code labels
- `istio_request_duration_milliseconds` - Request latency histogram
- `istio_request_bytes` - Request body size
- `istio_response_bytes` - Response body size

**TCP metrics (L4):**
- `istio_tcp_sent_bytes_total` - Bytes sent
- `istio_tcp_received_bytes_total` - Bytes received
- `istio_tcp_connections_opened_total` - New connections
- `istio_tcp_connections_closed_total` - Closed connections

All of these are labeled with `destination_version`, which is how you split metrics between canary and stable versions.

## Prometheus Queries for Canary Comparison

**Success rate comparison:**

```promql
# Success rate for each version
sum(rate(istio_requests_total{
  destination_service="my-app.production.svc.cluster.local",
  response_code!~"5.*",
  reporter="destination"
}[5m])) by (destination_version)
/
sum(rate(istio_requests_total{
  destination_service="my-app.production.svc.cluster.local",
  reporter="destination"
}[5m])) by (destination_version)
```

**Latency comparison (P50, P95, P99):**

```promql
# P99 latency per version
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{
    destination_service="my-app.production.svc.cluster.local",
    reporter="destination"
  }[5m])) by (le, destination_version)
)
```

**Error rate comparison:**

```promql
# 5xx error rate per version
sum(rate(istio_requests_total{
  destination_service="my-app.production.svc.cluster.local",
  response_code=~"5.*",
  reporter="destination"
}[5m])) by (destination_version)
```

**Throughput comparison:**

```promql
# Requests per second per version
sum(rate(istio_requests_total{
  destination_service="my-app.production.svc.cluster.local",
  reporter="destination"
}[5m])) by (destination_version)
```

## Building a Grafana Dashboard

Create a Grafana dashboard specifically for canary monitoring. Here's the JSON model for a basic canary comparison panel:

```json
{
  "title": "Canary vs Stable Success Rate",
  "type": "timeseries",
  "targets": [
    {
      "expr": "sum(rate(istio_requests_total{destination_service=\"my-app.production.svc.cluster.local\",response_code!~\"5.*\",reporter=\"destination\"}[5m])) by (destination_version) / sum(rate(istio_requests_total{destination_service=\"my-app.production.svc.cluster.local\",reporter=\"destination\"}[5m])) by (destination_version)",
      "legendFormat": "{{destination_version}}"
    }
  ]
}
```

Key panels to include:
1. Success rate by version (line chart)
2. P99 latency by version (line chart)
3. Request throughput by version (line chart)
4. Error breakdown by status code and version (stacked bar)
5. Traffic weight distribution (gauge or single stat)

## Setting Up Alerts

Configure Prometheus alerting rules to catch canary issues:

```yaml
groups:
- name: canary-alerts
  rules:
  - alert: CanaryHighErrorRate
    expr: |
      (
        sum(rate(istio_requests_total{
          destination_service="my-app.production.svc.cluster.local",
          destination_version="v2",
          response_code=~"5.*",
          reporter="destination"
        }[5m]))
        /
        sum(rate(istio_requests_total{
          destination_service="my-app.production.svc.cluster.local",
          destination_version="v2",
          reporter="destination"
        }[5m]))
      ) > 0.05
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "Canary version has >5% error rate"
      description: "The canary version of my-app has an error rate of {{ $value | humanizePercentage }}"

  - alert: CanaryHighLatency
    expr: |
      histogram_quantile(0.99,
        sum(rate(istio_request_duration_milliseconds_bucket{
          destination_service="my-app.production.svc.cluster.local",
          destination_version="v2",
          reporter="destination"
        }[5m])) by (le)
      ) > 1000
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "Canary P99 latency exceeds 1 second"

  - alert: CanaryWorseThanStable
    expr: |
      (
        sum(rate(istio_requests_total{
          destination_service="my-app.production.svc.cluster.local",
          destination_version="v2",
          response_code=~"5.*",
          reporter="destination"
        }[5m]))
        /
        sum(rate(istio_requests_total{
          destination_service="my-app.production.svc.cluster.local",
          destination_version="v2",
          reporter="destination"
        }[5m]))
      )
      >
      (
        sum(rate(istio_requests_total{
          destination_service="my-app.production.svc.cluster.local",
          destination_version="v1",
          response_code=~"5.*",
          reporter="destination"
        }[5m]))
        /
        sum(rate(istio_requests_total{
          destination_service="my-app.production.svc.cluster.local",
          destination_version="v1",
          reporter="destination"
        }[5m]))
      ) * 2
    for: 3m
    labels:
      severity: critical
    annotations:
      summary: "Canary error rate is 2x worse than stable"
```

The last alert is especially useful. It triggers when the canary's error rate is more than double the stable version's error rate, which accounts for variable baseline error rates.

## Using Kiali for Canary Visualization

Kiali provides a visual service mesh topology that shows traffic flow between versions:

```bash
istioctl dashboard kiali
```

In Kiali:
1. Navigate to the Graph view
2. Select the `production` namespace
3. Choose "Versioned app graph" display
4. Enable "Traffic animation" and "Response time" edge labels

You'll see traffic flowing to both v1 and v2 with color-coded health status. Red edges indicate high error rates, which makes spotting canary issues visual and immediate.

## Monitoring Canary Resource Usage

Beyond request metrics, monitor the canary pods' resource consumption:

```promql
# CPU usage by version
sum(rate(container_cpu_usage_seconds_total{
  namespace="production",
  pod=~"my-app.*",
  container="app"
}[5m])) by (pod)

# Memory usage by version
sum(container_memory_working_set_bytes{
  namespace="production",
  pod=~"my-app.*",
  container="app"
}) by (pod)
```

A new version might have a memory leak that doesn't show up in request metrics until the pod runs out of memory and gets OOM-killed.

## Real-Time Monitoring During Deployment

During an active canary deployment, use a live monitoring approach:

```bash
# Watch canary events
kubectl get events -n production -w --field-selector involvedObject.name=my-app

# Stream sidecar access logs for the canary
kubectl logs -f -l app=my-app,version=v2 -c istio-proxy -n production | grep -v "200"

# Quick success rate check
while true; do
  echo "$(date): $(kubectl exec -n production deploy/web-app-v1 -c istio-proxy -- curl -s localhost:15000/stats | grep 'upstream_rq_5xx')"
  sleep 10
done
```

## Distributed Tracing for Canary Requests

If you have Jaeger or Zipkin set up with Istio, trace requests through the canary to identify where latency is introduced:

```bash
istioctl dashboard jaeger
```

Filter traces by the `node_id` tag or destination version to see only canary traffic. This is invaluable for debugging latency regressions in the new version because you can see exactly which service call is slower.

## Flagger Monitoring Metrics

If you're using Flagger for canary automation, it exposes its own metrics:

```promql
# Current canary weight
flagger_canary_weight{name="my-app", namespace="production"}

# Canary status (0=init, 1=progressing, 2=promoted, 3=failed)
flagger_canary_status{name="my-app", namespace="production"}

# Duration of current canary analysis
flagger_canary_duration_seconds{name="my-app", namespace="production"}
```

Create a Grafana dashboard that combines Flagger metrics with Istio metrics. The Flagger metrics show the automation state, and the Istio metrics show the actual canary performance.

## Post-Deployment Monitoring

After promotion, keep monitoring for a soak period. Some issues only appear under sustained load or after certain time intervals (like a slow memory leak or a cache that fills up):

```promql
# Watch for gradual degradation over hours
avg_over_time(
  (sum(rate(istio_requests_total{
    destination_service="my-app.production.svc.cluster.local",
    response_code=~"5.*"
  }[5m]))
  /
  sum(rate(istio_requests_total{
    destination_service="my-app.production.svc.cluster.local"
  }[5m])))[24h:1h]
)
```

Good canary monitoring is what makes progressive delivery trustworthy. Invest in dashboards, alerts, and tracing so that every canary deployment gives you clear, actionable data about whether the new version is ready for production.
