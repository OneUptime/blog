# How to Monitor Circuit Breaker State in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Circuit Breaker, Monitoring, Prometheus, Observability

Description: Learn how to monitor Dapr circuit breaker state changes using logs, Prometheus metrics, and alerting rules to detect and respond to service degradation.

---

## Overview

Circuit breakers are silent protectors - they activate during failures and deactivate during recovery, but without proper monitoring you may not know when they trip or how long they stay open. Monitoring circuit breaker state in Dapr involves structured log analysis, Prometheus metrics, and alerts that notify you when services degrade before users are impacted.

## Circuit Breaker State in Logs

Dapr logs circuit breaker state transitions with structured JSON. Enable JSON logging:

```yaml
annotations:
  dapr.io/log-as-json: "true"
  dapr.io/log-level: "info"
```

Watch for state change events:

```bash
kubectl logs deployment/checkout-service -c daprd -f \
  | jq 'select(.msg | test("circuit breaker"; "i"))'
```

Example log entries:

```json
{"time":"2026-03-31T10:00:05Z","level":"warn","msg":"Circuit breaker tripped","target":"payment-service","state":"open","failures":5}
{"time":"2026-03-31T10:00:35Z","level":"info","msg":"Circuit breaker entering half-open state","target":"payment-service"}
{"time":"2026-03-31T10:00:36Z","level":"info","msg":"Circuit breaker closed","target":"payment-service"}
```

## Prometheus Metrics for Circuit Breakers

Dapr exposes resiliency metrics at the sidecar metrics endpoint (default port 9090). Key circuit breaker metrics:

```bash
# Scrape all resiliency metrics
curl http://localhost:9090/metrics | grep dapr_resiliency
```

Relevant metric labels:

```text
dapr_resiliency_count{
  app_id="checkout-service",
  name="serviceCB",
  policy="circuitbreaker",
  target="payment-service"
}
```

## Setting Up Prometheus Scraping

Ensure Dapr sidecar metrics are scraped:

```yaml
annotations:
  dapr.io/enable-metrics: "true"
  dapr.io/metrics-port: "9090"
  prometheus.io/scrape: "true"
  prometheus.io/path: "/metrics"
  prometheus.io/port: "9090"
```

## Grafana Dashboard Queries

Visualize circuit breaker activity with these PromQL queries:

Total circuit breaker trips per service:

```promql
increase(
  dapr_resiliency_count{policy="circuitbreaker"}[1h]
)
```

Rate of circuit breaker activations in the last 5 minutes:

```promql
rate(
  dapr_resiliency_count{policy="circuitbreaker"}[5m]
)
```

## Alerting on Circuit Breaker Trips

Create a Prometheus alert rule that fires when a circuit breaker trips at least once in 5 minutes:

```yaml
groups:
- name: dapr-circuit-breakers
  rules:
  - alert: DaprCircuitBreakerOpen
    expr: |
      increase(dapr_resiliency_count{policy="circuitbreaker"}[5m]) > 0
    for: 0m
    labels:
      severity: warning
    annotations:
      summary: "Circuit breaker tripped for {{ $labels.target }}"
      description: >
        The circuit breaker for {{ $labels.target }} in
        {{ $labels.app_id }} has opened. Check service health.

  - alert: DaprCircuitBreakerFrequentTrips
    expr: |
      increase(dapr_resiliency_count{policy="circuitbreaker"}[15m]) > 5
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Frequent circuit breaker trips for {{ $labels.target }}"
```

## Correlating Circuit Breaks with Distributed Traces

When a circuit breaker opens, the Dapr trace for that request includes a span attribute indicating the circuit was open:

```bash
# Query Jaeger for circuit breaker events
curl "http://jaeger:16686/api/traces?service=checkout-service&tags={\"dapr.resiliency.policy\":\"circuitbreaker\"}"
```

## Summary

Monitoring Dapr circuit breaker state requires collecting structured logs for state transitions, scraping Prometheus metrics from sidecar endpoints, and setting up alerts that fire when circuit breakers trip. Combining log analysis with Grafana dashboards and Prometheus alerts gives you real-time visibility into service health and degradation events.
