# How to Create Service Health Score with Istio Metrics

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Health Score, Monitoring, SRE, Observability, Prometheus

Description: Build a composite service health score using Istio metrics combining success rate, latency, throughput, and error trends into a single actionable metric.

---

When you are running dozens or hundreds of microservices, you need a quick way to answer "which services need attention right now?" Individual metrics like error rate, latency, and traffic volume are all important, but looking at three separate dashboards for each service does not scale. What you want is a single health score per service that combines these signals into one number, and then you can focus on the services with the lowest scores.

## What Goes Into a Health Score

A good health score is a weighted combination of the key signals that determine whether a service is healthy. The standard signals from Istio are:

1. **Success rate** - What percentage of requests succeed (2xx/3xx vs 5xx)
2. **Latency** - How fast the service responds (P95 or P99)
3. **Error trend** - Is the error rate getting worse or staying stable
4. **Throughput** - Is the service receiving the expected amount of traffic

Each signal gets a score from 0 to 100, then they are combined with weights. You can customize the weights based on what matters most for your specific services.

## Defining the Component Scores

### Success Rate Score (0-100)

Map the success rate to a 0-100 score:

```promql
# Success rate as a percentage
(
  sum(rate(istio_requests_total{reporter="destination", response_code!~"5.."}[5m])) by (destination_service_name)
  /
  sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service_name)
) * 100
```

This naturally gives you a 0-100 number. A service with 99.9% success rate gets 99.9. A service with 95% gets 95.

For the health score, we can use this directly but with a floor at 0:

```promql
clamp_min(
  (
    sum(rate(istio_requests_total{reporter="destination", response_code!~"5.."}[5m])) by (destination_service_name)
    /
    sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service_name)
  ) * 100,
  0
)
```

### Latency Score (0-100)

Convert P95 latency to a score. This requires defining what "good" and "bad" latency means for your services. A simple approach: anything under 100ms is perfect (100 points), anything over 5000ms is terrible (0 points), and scale linearly between:

```promql
clamp(
  (5000 - histogram_quantile(0.95,
    sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination"}[5m])) by (le, destination_service_name)
  )) / 49,
  0, 100
)
```

This maps:
- 0ms latency = 100 points (5000/49 is about 102, clamped to 100)
- 100ms latency = 100 points
- 2500ms = about 51 points
- 5000ms = 0 points

Adjust the 5000ms threshold based on your service expectations.

### Error Trend Score (0-100)

This captures whether errors are increasing, stable, or decreasing. Compare the current 5-minute error rate to the 1-hour average:

```promql
clamp(
  100 - (
    (
      sum(rate(istio_requests_total{reporter="destination", response_code=~"5.."}[5m])) by (destination_service_name)
      /
      clamp_min(sum(rate(istio_requests_total{reporter="destination", response_code=~"5.."}[1h])) by (destination_service_name), 0.001)
    ) - 1
  ) * 50,
  0, 100
)
```

- If current error rate equals the hourly average (ratio = 1): score = 100
- If current is 2x the hourly average (ratio = 2): score = 50
- If current is 3x or more: score = 0

### Throughput Score (0-100)

Check if the service is receiving traffic in its expected range. Compare current throughput to the historical average:

```promql
clamp(
  100 - abs(
    (
      sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service_name)
      /
      clamp_min(sum(rate(istio_requests_total{reporter="destination"}[24h])) by (destination_service_name), 0.001)
    ) - 1
  ) * 100,
  0, 100
)
```

- Traffic at exactly the 24h average: score = 100
- Traffic at 50% or 150% of average: score = 50
- Traffic at 0% or 200%+ of average: score = 0

## Combining Into a Health Score

Now combine the four component scores with weights:

```promql
(
  # Success rate (weight: 40%)
  0.4 * clamp_min(
    (
      sum(rate(istio_requests_total{reporter="destination", response_code!~"5.."}[5m])) by (destination_service_name)
      /
      sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service_name)
    ) * 100,
    0
  )
  +
  # Latency score (weight: 30%)
  0.3 * clamp(
    (5000 - histogram_quantile(0.95,
      sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination"}[5m])) by (le, destination_service_name)
    )) / 49,
    0, 100
  )
  +
  # Error trend (weight: 20%)
  0.2 * clamp(
    100 - (
      (
        sum(rate(istio_requests_total{reporter="destination", response_code=~"5.."}[5m])) by (destination_service_name)
        /
        clamp_min(sum(rate(istio_requests_total{reporter="destination", response_code=~"5.."}[1h])) by (destination_service_name), 0.001)
      ) - 1
    ) * 50,
    0, 100
  )
  +
  # Throughput score (weight: 10%)
  0.1 * clamp(
    100 - abs(
      (
        sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service_name)
        /
        clamp_min(sum(rate(istio_requests_total{reporter="destination"}[24h])) by (destination_service_name), 0.001)
      ) - 1
    ) * 100,
    0, 100
  )
)
```

This produces a single number from 0-100 per service:
- **90-100**: Healthy, no action needed
- **70-89**: Degraded, worth investigating
- **50-69**: Unhealthy, needs attention
- **0-49**: Critical, immediate action required

## Using Recording Rules

That query is massive. Use Prometheus recording rules to pre-compute the components and the final score:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: service-health-score
  namespace: monitoring
spec:
  groups:
    - name: service-health
      interval: 30s
      rules:
        # Success rate component
        - record: service:success_rate:score
          expr: |
            clamp_min(
              (
                sum(rate(istio_requests_total{reporter="destination", response_code!~"5.."}[5m])) by (destination_service_name)
                /
                sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service_name)
              ) * 100,
              0
            )
        # Latency component
        - record: service:latency:score
          expr: |
            clamp(
              (5000 - histogram_quantile(0.95,
                sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination"}[5m])) by (le, destination_service_name)
              )) / 49,
              0, 100
            )
        # Error trend component
        - record: service:error_trend:score
          expr: |
            clamp(
              100 - (
                (
                  sum(rate(istio_requests_total{reporter="destination", response_code=~"5.."}[5m])) by (destination_service_name)
                  /
                  clamp_min(sum(rate(istio_requests_total{reporter="destination", response_code=~"5.."}[1h])) by (destination_service_name), 0.001)
                ) - 1
              ) * 50,
              0, 100
            )
        # Throughput component
        - record: service:throughput:score
          expr: |
            clamp(
              100 - abs(
                (
                  sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service_name)
                  /
                  clamp_min(sum(rate(istio_requests_total{reporter="destination"}[24h])) by (destination_service_name), 0.001)
                ) - 1
              ) * 100,
              0, 100
            )
        # Combined health score
        - record: service:health_score:total
          expr: |
            0.4 * service:success_rate:score
            + 0.3 * service:latency:score
            + 0.2 * service:error_trend:score
            + 0.1 * service:throughput:score
```

Now you can query the health score with a simple:

```promql
service:health_score:total
```

## Grafana Dashboard

### Panel 1: Service Health Summary Table

Query: `sort_asc(service:health_score:total)`

Display as a table showing service name and health score, sorted from worst to best. Color-code the score column: green for 90+, yellow for 70-89, orange for 50-69, red for 0-49.

### Panel 2: Health Score Over Time

Query: `service:health_score:total{destination_service_name="$service"}`

A time series showing how the health score changes throughout the day. Drops correspond to incidents.

### Panel 3: Component Breakdown

Display all four components for a selected service:

```promql
service:success_rate:score{destination_service_name="$service"}
service:latency:score{destination_service_name="$service"}
service:error_trend:score{destination_service_name="$service"}
service:throughput:score{destination_service_name="$service"}
```

Show as a bar chart so you can see which component is dragging down the overall score.

### Panel 4: Lowest Health Scores

```promql
bottomk(10, service:health_score:total)
```

Shows the 10 unhealthiest services. This is your "where to look" list.

## Alerting on Health Score

```yaml
- alert: ServiceHealthLow
  expr: service:health_score:total < 70
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "{{ $labels.destination_service_name }} health score is {{ $value | humanize }}"
- alert: ServiceHealthCritical
  expr: service:health_score:total < 50
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "{{ $labels.destination_service_name }} health score critical at {{ $value | humanize }}"
```

## Tuning the Weights

The default weights (40% success, 30% latency, 20% error trend, 10% throughput) are a starting point. Tune them based on your priorities:

- For user-facing services: increase success rate and latency weights
- For background processing: increase throughput weight, decrease latency weight
- For services under active development: increase error trend weight to catch regressions faster

You can even have different weight profiles per service by creating separate recording rules with different coefficients.

## Handling Low-Traffic Services

Services with very low traffic produce noisy metrics. A single error on a service that handles 1 RPS creates a 100% error rate spike. Filter out low-traffic services:

```promql
service:health_score:total
and
sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service_name) > 0.1
```

This only shows health scores for services handling more than 0.1 RPS (about 6 requests per minute).

## Summary

A service health score combines success rate, latency, error trends, and throughput into a single number that tells you which services need attention. Istio provides all the raw metrics needed for this calculation. Use Prometheus recording rules to pre-compute the score, Grafana dashboards to visualize it, and alerting rules to get notified when scores drop. The weights and thresholds are customizable to match your specific SLOs and priorities. The result is a single-pane-of-glass view of your entire service mesh health.
