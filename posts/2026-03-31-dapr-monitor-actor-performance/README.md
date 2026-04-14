# How to Monitor Actor Performance in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Monitoring, Prometheus, Metric

Description: Monitor Dapr actor performance using Prometheus metrics and Grafana dashboards to track active actor counts, method latency, and state store operation rates.

---

Dapr exposes rich Prometheus metrics for actor runtime performance. Setting up proper monitoring helps you detect activation storms, latency spikes, and state store bottlenecks before they impact production workloads.

## Enabling Metrics

Dapr exposes metrics on port 9090 by default. In Kubernetes, annotate your pod:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "counter-service"
  dapr.io/metrics-port: "9090"
```

Verify metrics are available:

```bash
curl http://localhost:9090/metrics | grep dapr_runtime_actor
```

## Key Actor Metrics

### Pending Actor Calls

```text
dapr_runtime_actor_pending_actor_calls{app_id="counter-service",actor_type="Counter"}
```

High counts indicate actors are contending for locks, suggesting hot actors or slow method execution. Check your idle timeout and concurrency configuration.

### Method Invocation Latency

```text
dapr_http_server_latency_bucket{app_id="counter-service",method="POST",path="/v1.0/actors/Counter/{id}/method/Increment"}
```

Actor method invocations are tracked through Dapr HTTP server metrics. Use this histogram to identify slow actor methods. Configure `http.pathMatching` in the Dapr metrics configuration to control path label cardinality.

### Deactivation Rate and Pending Calls

```text
dapr_runtime_actor_deactivated_total{app_id="counter-service",actor_type="Counter"}
dapr_runtime_actor_pending_actor_calls{app_id="counter-service",actor_type="Counter"}
```

A low deactivation rate paired with rising pending actor calls signals actors are accumulating in memory.

## Prometheus Scrape Configuration

```yaml
# prometheus.yml
scrape_configs:
  - job_name: "dapr-actor-service"
    static_configs:
      - targets: ["counter-service-pod:9090"]
    metrics_path: /metrics
```

## Grafana Dashboard Queries

### Pending Actor Calls Over Time

```promql
sum(dapr_runtime_actor_pending_actor_calls{app_id="counter-service"}) by (actor_type)
```

### P99 Method Latency

```promql
histogram_quantile(0.99,
  sum(rate(dapr_http_server_latency_bucket{app_id="counter-service",path=~"/v1.0/actors/Counter/.*"}[5m])) by (le, path)
)
```

### Deactivation Rate Per Minute

```promql
sum(rate(dapr_runtime_actor_deactivated_total{app_id="counter-service",actor_type="Counter"}[1m])) by (actor_type)
```

## Setting Up Alerts

Alert when pending actor calls grow unboundedly:

```yaml
# prometheus alerting rule
groups:
- name: dapr-actors
  rules:
  - alert: PendingActorCallsTooHigh
    expr: dapr_runtime_actor_pending_actor_calls{actor_type="Counter"} > 100
    for: 5m
    annotations:
      summary: "Pending actor calls exceeds threshold"
      description: "Counter actor pending calls is {{ $value }}, check for hot actors or slow methods"
```

Alert on high method latency:

```yaml
  - alert: ActorMethodLatencyHigh
    expr: |
      histogram_quantile(0.99,
        sum(rate(dapr_http_server_latency_bucket{path=~"/v1.0/actors/.*"}[5m])) by (le, app_id, path)
      ) > 1000
    for: 2m
    annotations:
      summary: "Actor HTTP request P99 latency exceeds 1 second"
```

## Correlating with Application Traces

Cross-reference Prometheus metrics with Zipkin or Jaeger traces by correlating timestamps. When latency spikes, look for corresponding distributed traces with `dapr.actor` span tags to find the slow code path.

## Summary

Dapr's built-in Prometheus metrics provide the foundation for monitoring actor performance at scale. Tracking pending actor calls, HTTP server latency for actor method invocations, and deactivation rates gives you early warning of configuration issues and performance bottlenecks. Combining metrics with distributed tracing provides complete observability for production actor-based systems.
