# How to Track Error Rate Trends with Istio Metrics

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Error Rate, Monitoring, Prometheus, Observability

Description: Track and analyze error rate trends across your services using Istio metrics in Prometheus and Grafana for proactive incident detection.

---

Errors happen. The question is whether they are getting better or worse. A steady 0.1% error rate might be normal. But if that rate has been climbing from 0.01% to 0.05% to 0.1% over the past week, you have a trend that needs attention before it becomes an outage. Istio's automatic metrics collection combined with Prometheus gives you everything you need to track error rate trends over time.

## The Error Rate Metric

Istio tracks every request through `istio_requests_total`. Errors are identified by their HTTP response code:

- **4xx** - Client errors (bad requests, unauthorized, not found)
- **5xx** - Server errors (internal error, bad gateway, service unavailable)

For error rate trending, you usually care most about 5xx errors because they indicate problems with your service rather than with the client.

## Basic Error Rate Query

Error rate (5xx) for all services over the last 5 minutes:

```promql
sum(rate(istio_requests_total{reporter="destination", response_code=~"5.."}[5m])) by (destination_service_name)
/
sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service_name)
* 100
```

This gives you the percentage of requests returning 5xx for each service.

## Error Rate by Response Code

Different error codes mean different things. Track them separately:

```promql
sum(rate(istio_requests_total{reporter="destination", response_code=~"5.."}[5m])) by (destination_service_name, response_code)
```

This shows the raw error request rate broken down by status code:
- **500** - Application bugs or unhandled exceptions
- **502** - Bad gateway, often upstream connection issues
- **503** - Service unavailable, often circuit breaker triggered or pod not ready
- **504** - Gateway timeout, upstream took too long

## Trending Over Time

To see how the error rate has changed over a longer period, use a wider window and time-series graph in Grafana:

```promql
sum(rate(istio_requests_total{reporter="destination", destination_service_name="payment-service", response_code=~"5.."}[1h]))
/
sum(rate(istio_requests_total{reporter="destination", destination_service_name="payment-service"}[1h]))
* 100
```

Using a 1-hour rate window smooths out short spikes and shows the underlying trend more clearly. In Grafana, set the time range to 7 days to see the weekly trend.

## Detecting Error Rate Increases

Prometheus can compare current error rates against historical baselines. This query checks if the current error rate is more than double the average over the past day:

```promql
(
  sum(rate(istio_requests_total{reporter="destination", response_code=~"5.."}[5m])) by (destination_service_name)
  /
  sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service_name)
)
>
2 * (
  sum(rate(istio_requests_total{reporter="destination", response_code=~"5.."}[24h])) by (destination_service_name)
  /
  sum(rate(istio_requests_total{reporter="destination"}[24h])) by (destination_service_name)
)
```

If the current 5-minute error rate is more than 2x the 24-hour average, something has likely changed.

## Rate of Change (Derivative)

Track whether the error rate is increasing or decreasing:

```promql
deriv(
  (
    sum(rate(istio_requests_total{reporter="destination", destination_service_name="payment-service", response_code=~"5.."}[5m]))
    /
    sum(rate(istio_requests_total{reporter="destination", destination_service_name="payment-service"}[5m]))
  )[1h:5m]
)
```

A positive value means the error rate is increasing. A negative value means it is decreasing. A value near zero means it is stable.

## Error Rate by Source Service

See which callers are experiencing the most errors:

```promql
sum(rate(istio_requests_total{reporter="destination", destination_service_name="payment-service", response_code=~"5.."}[5m])) by (source_workload)
/
sum(rate(istio_requests_total{reporter="destination", destination_service_name="payment-service"}[5m])) by (source_workload)
* 100
```

If one source has a much higher error rate than others, the problem might be in how that specific caller is using the service.

## Error Rate by Version (Canary Detection)

During canary deployments, compare error rates between versions:

```promql
sum(rate(istio_requests_total{reporter="destination", destination_service_name="payment-service", response_code=~"5..", destination_workload="payment-service-v2"}[5m]))
/
sum(rate(istio_requests_total{reporter="destination", destination_service_name="payment-service", destination_workload="payment-service-v2"}[5m]))
* 100
```

Compare this against the v1 error rate:

```promql
sum(rate(istio_requests_total{reporter="destination", destination_service_name="payment-service", response_code=~"5..", destination_workload="payment-service-v1"}[5m]))
/
sum(rate(istio_requests_total{reporter="destination", destination_service_name="payment-service", destination_workload="payment-service-v1"}[5m]))
* 100
```

If v2 has a significantly higher error rate than v1, the canary might need to be rolled back.

## Grafana Dashboard for Error Trends

Create a comprehensive error trend dashboard in Grafana.

### Panel 1: Error Rate Heatmap

```promql
sum(rate(istio_requests_total{reporter="destination", response_code=~"5.."}[5m])) by (destination_service_name)
/
sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service_name)
* 100
```

Display as a heatmap over time. Services with higher error rates show up as hotter colors.

### Panel 2: Error Count by Code

```promql
sum(increase(istio_requests_total{reporter="destination", response_code=~"[45].."}[1h])) by (response_code, destination_service_name)
```

Shows the total number of errors in the past hour, grouped by code and service. Using `increase` instead of `rate` gives you absolute counts, which are easier to reason about.

### Panel 3: Error Rate Trend Line

```promql
sum(rate(istio_requests_total{reporter="destination", destination_service_name="$service", response_code=~"5.."}[30m]))
/
sum(rate(istio_requests_total{reporter="destination", destination_service_name="$service"}[30m]))
* 100
```

Use a Grafana variable `$service` to let users select which service to view. A 30-minute rate window gives a smooth trend line.

### Panel 4: Client Error vs. Server Error

```promql
# Client errors (4xx)
sum(rate(istio_requests_total{reporter="destination", destination_service_name="$service", response_code=~"4.."}[5m]))

# Server errors (5xx)
sum(rate(istio_requests_total{reporter="destination", destination_service_name="$service", response_code=~"5.."}[5m]))
```

Display both on the same graph to see if they correlate.

## Alerting on Error Rate Trends

Alert when the error rate exceeds a threshold:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: error-rate-alerts
  namespace: monitoring
spec:
  groups:
    - name: istio-error-rates
      rules:
        - alert: ErrorRateHigh
          expr: |
            (
              sum(rate(istio_requests_total{reporter="destination", response_code=~"5.."}[5m])) by (destination_service_name)
              /
              sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service_name)
            ) * 100 > 1
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Error rate above 1% for {{ $labels.destination_service_name }}"
        - alert: ErrorRateIncreasing
          expr: |
            (
              sum(rate(istio_requests_total{reporter="destination", response_code=~"5.."}[5m])) by (destination_service_name)
              /
              sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service_name)
            )
            >
            3 * (
              sum(rate(istio_requests_total{reporter="destination", response_code=~"5.."}[1h])) by (destination_service_name)
              /
              sum(rate(istio_requests_total{reporter="destination"}[1h])) by (destination_service_name)
            )
          for: 3m
          labels:
            severity: critical
          annotations:
            summary: "Error rate increasing rapidly for {{ $labels.destination_service_name }}"
            description: "Current error rate is 3x the hourly average"
```

The second alert fires when the current error rate is 3x the hourly average. This catches rapid increases that might not yet exceed the absolute threshold.

## Correlating Errors with Deployments

When investigating error rate increases, check if a deployment happened:

```bash
# Check recent deployments
kubectl get events -n default --sort-by='.lastTimestamp' | grep -i "rolling\|scaled\|created"

# Check rollout history
kubectl rollout history deployment/payment-service -n default
```

You can also annotate your Grafana dashboards with deployment events using the Kubernetes API or a webhook.

## Investigating Specific Errors

When you spot an error rate increase, dig deeper:

```bash
# Check the proxy access logs for errors
kubectl logs deploy/payment-service -c istio-proxy | grep "response_code\":5"

# Check the application logs
kubectl logs deploy/payment-service -c payment-service | grep -i "error\|exception\|panic"

# Check if pods are restarting
kubectl get pods -l app=payment-service -n default
```

## Summary

Tracking error rate trends in Istio is about looking at the direction of the error rate, not just the current value. Use Prometheus to calculate error rates over different time windows, compare current rates against historical baselines, and set up alerts for both absolute thresholds and rate-of-change increases. The combination of per-service, per-source, per-version, and per-response-code breakdowns gives you the diagnostic information needed to quickly identify and resolve issues. Always correlate error rate changes with deployment events and other system changes.
