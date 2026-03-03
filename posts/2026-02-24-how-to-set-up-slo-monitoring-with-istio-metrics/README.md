# How to Set Up SLO Monitoring with Istio Metrics

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, SLO, Monitoring, Prometheus, Reliability, SRE

Description: A hands-on guide to defining and monitoring Service Level Objectives using Istio metrics with Prometheus recording rules and alerting.

---

Service Level Objectives (SLOs) are the backbone of reliability engineering. They give you a measurable target for how well your services should perform, and they help you make decisions about when to invest in reliability versus shipping features. Istio is actually a great foundation for SLO monitoring because its sidecar proxies capture request-level metrics for every service in your mesh, without requiring any instrumentation in your application code.

This guide walks through setting up SLO monitoring using Istio metrics, Prometheus, and alerting rules.

## SLO Basics

An SLO has three components:

1. **Service Level Indicator (SLI)** - The metric you are measuring (e.g., "percentage of successful requests" or "percentage of requests faster than 500ms")
2. **Target** - The goal (e.g., "99.9%")
3. **Window** - The time period (e.g., "rolling 30 days")

From these, you derive an **error budget** - the amount of unreliability you can tolerate. If your SLO is 99.9% availability over 30 days, your error budget is 0.1% of total requests, which works out to about 43 minutes of downtime.

## Defining SLIs with Istio Metrics

Istio gives you two primary SLIs out of the box:

**Availability SLI** - The ratio of successful (non-5xx) requests to total requests:

```text
sum(rate(istio_requests_total{response_code!~"5.."}[5m]))
/
sum(rate(istio_requests_total[5m]))
```

**Latency SLI** - The ratio of requests faster than a threshold to total requests:

```text
sum(rate(istio_request_duration_milliseconds_bucket{le="500"}[5m]))
/
sum(rate(istio_request_duration_milliseconds_count[5m]))
```

## Setting Up Prometheus Recording Rules

Raw PromQL queries for SLOs can be expensive to compute, especially over long windows like 30 days. Recording rules pre-compute the values you need.

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-slo-rules
  namespace: monitoring
  labels:
    prometheus: k8s
spec:
  groups:
    - name: istio-slo-availability
      interval: 30s
      rules:
        # Total requests per service (counter)
        - record: istio_slo:requests_total
          expr: |
            sum(increase(istio_requests_total[1m])) by (destination_service)

        # Failed requests per service (counter)
        - record: istio_slo:errors_total
          expr: |
            sum(increase(istio_requests_total{response_code=~"5.."}[1m])) by (destination_service)

        # Availability SLI over various windows
        - record: istio_slo:availability_ratio_1h
          expr: |
            1 - (
              sum(increase(istio_requests_total{response_code=~"5.."}[1h])) by (destination_service)
              /
              sum(increase(istio_requests_total[1h])) by (destination_service)
            )

        - record: istio_slo:availability_ratio_1d
          expr: |
            1 - (
              sum(increase(istio_requests_total{response_code=~"5.."}[1d])) by (destination_service)
              /
              sum(increase(istio_requests_total[1d])) by (destination_service)
            )

        - record: istio_slo:availability_ratio_30d
          expr: |
            1 - (
              sum(increase(istio_requests_total{response_code=~"5.."}[30d])) by (destination_service)
              /
              sum(increase(istio_requests_total[30d])) by (destination_service)
            )

    - name: istio-slo-latency
      interval: 30s
      rules:
        # Latency SLI: percentage of requests under 500ms
        - record: istio_slo:latency_good_ratio_1h
          expr: |
            sum(increase(istio_request_duration_milliseconds_bucket{le="500"}[1h])) by (destination_service)
            /
            sum(increase(istio_request_duration_milliseconds_count[1h])) by (destination_service)

        - record: istio_slo:latency_good_ratio_30d
          expr: |
            sum(increase(istio_request_duration_milliseconds_bucket{le="500"}[30d])) by (destination_service)
            /
            sum(increase(istio_request_duration_milliseconds_count[30d])) by (destination_service)

    - name: istio-slo-error-budget
      interval: 1m
      rules:
        # Error budget remaining (as a percentage)
        # For a 99.9% SLO, the error budget is 0.1%
        - record: istio_slo:error_budget_remaining
          expr: |
            1 - (
              (1 - istio_slo:availability_ratio_30d)
              / (1 - 0.999)
            )
```

## Multi-Window Multi-Burn-Rate Alerting

The Google SRE book recommends multi-window, multi-burn-rate alerts for SLO monitoring. The idea is to alert when the error rate is burning through your error budget faster than expected, checked across multiple time windows to catch both sudden spikes and slow burns.

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-slo-alerts
  namespace: monitoring
spec:
  groups:
    - name: istio-slo-burn-rate-alerts
      rules:
        # Fast burn: 14.4x burn rate over 1h, confirmed by 5m window
        # This catches severe outages quickly
        - alert: IstioSLOHighBurnRate
          expr: |
            (
              1 - (
                sum(increase(istio_requests_total{response_code!~"5.."}[1h])) by (destination_service)
                /
                sum(increase(istio_requests_total[1h])) by (destination_service)
              )
            ) > (14.4 * 0.001)
            and
            (
              1 - (
                sum(increase(istio_requests_total{response_code!~"5.."}[5m])) by (destination_service)
                /
                sum(increase(istio_requests_total[5m])) by (destination_service)
              )
            ) > (14.4 * 0.001)
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "High error burn rate for {{ $labels.destination_service }}"
            description: "Service {{ $labels.destination_service }} is burning through error budget at 14.4x the allowed rate. Current error rate over 1h is {{ $value | humanizePercentage }}."

        # Medium burn: 6x burn rate over 6h, confirmed by 30m window
        - alert: IstioSLOMediumBurnRate
          expr: |
            (
              1 - (
                sum(increase(istio_requests_total{response_code!~"5.."}[6h])) by (destination_service)
                /
                sum(increase(istio_requests_total[6h])) by (destination_service)
              )
            ) > (6 * 0.001)
            and
            (
              1 - (
                sum(increase(istio_requests_total{response_code!~"5.."}[30m])) by (destination_service)
                /
                sum(increase(istio_requests_total[30m])) by (destination_service)
              )
            ) > (6 * 0.001)
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Medium error burn rate for {{ $labels.destination_service }}"
            description: "Service {{ $labels.destination_service }} is burning through error budget at 6x the allowed rate."

        # Slow burn: 1x burn rate over 3d, confirmed by 6h window
        - alert: IstioSLOSlowBurnRate
          expr: |
            (
              1 - (
                sum(increase(istio_requests_total{response_code!~"5.."}[3d])) by (destination_service)
                /
                sum(increase(istio_requests_total[3d])) by (destination_service)
              )
            ) > (1 * 0.001)
            and
            (
              1 - (
                sum(increase(istio_requests_total{response_code!~"5.."}[6h])) by (destination_service)
                /
                sum(increase(istio_requests_total[6h])) by (destination_service)
              )
            ) > (1 * 0.001)
          for: 30m
          labels:
            severity: warning
          annotations:
            summary: "Slow error burn rate for {{ $labels.destination_service }}"
            description: "Service {{ $labels.destination_service }} has been slowly burning through error budget."
```

The burn rate multipliers (14.4x, 6x, 1x) come from the Google SRE book's recommended configuration for a 30-day window with a 99.9% SLO.

## Grafana Dashboard for SLO Monitoring

Create a Grafana dashboard that shows your SLO status at a glance:

```json
{
  "panels": [
    {
      "title": "Error Budget Remaining (30d)",
      "type": "gauge",
      "targets": [
        {
          "expr": "istio_slo:error_budget_remaining{destination_service=\"my-service.default.svc.cluster.local\"}"
        }
      ]
    },
    {
      "title": "Availability SLI (30d)",
      "type": "stat",
      "targets": [
        {
          "expr": "istio_slo:availability_ratio_30d{destination_service=\"my-service.default.svc.cluster.local\"}"
        }
      ]
    }
  ]
}
```

A more practical Grafana panel query for a burn-down chart:

```promql
# Error budget burn-down over the past 30 days
1 - (
  (1 - istio_slo:availability_ratio_30d{destination_service="my-service.default.svc.cluster.local"})
  / (1 - 0.999)
)
```

## Per-Service SLO Configuration

Not every service has the same SLO. You can use Prometheus labels or external configuration to define different targets per service. One practical approach is to use a ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: slo-targets
  namespace: monitoring
data:
  slo-config.yaml: |
    services:
      - name: api-gateway.default.svc.cluster.local
        availability_target: 0.999
        latency_target_ms: 200
        latency_percentile: 0.99
      - name: payment-service.default.svc.cluster.local
        availability_target: 0.9999
        latency_target_ms: 500
        latency_percentile: 0.99
      - name: recommendation-service.default.svc.cluster.local
        availability_target: 0.99
        latency_target_ms: 1000
        latency_percentile: 0.95
```

Then write recording rules and alerts parameterized for each service's target.

## Practical Tips

**Start with fewer SLOs.** It is tempting to put SLOs on every service. Do not do that. Start with your most critical user-facing services and expand once the team is comfortable with the process.

**Use error budgets to make decisions.** The whole point of SLOs is to make reliability a data-driven discussion. When error budget is healthy, ship features. When it is running low, focus on stability work.

**Account for expected errors.** Some 5xx responses are expected (like rate limiting returning 503). You may want to exclude certain response codes from your error budget calculation.

**Review SLOs quarterly.** Your SLO targets should not be permanent. Review them regularly and adjust based on actual user expectations and business requirements.

Istio makes SLO monitoring significantly easier because you get consistent metrics across all services without any application code changes. Combined with Prometheus recording rules and multi-burn-rate alerting, you have a production-grade SLO monitoring setup that follows industry best practices.
