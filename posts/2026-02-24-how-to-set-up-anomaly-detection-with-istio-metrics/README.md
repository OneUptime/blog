# How to Set Up Anomaly Detection with Istio Metrics

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Anomaly Detection, Monitoring, Prometheus, Machine Learning

Description: Set up anomaly detection for your Istio service mesh using Prometheus metrics, statistical methods, and alerting to catch unusual behavior before users notice.

---

Static alert thresholds are a blunt instrument. Setting an alert for "error rate > 5%" works until your service naturally fluctuates between 0.1% and 3% depending on the time of day. When it hits 4%, that is already abnormal for your service, but a static threshold at 5% would miss it entirely.

Anomaly detection takes a smarter approach. Instead of comparing against a fixed number, it compares current metrics against what is normal for that specific time period. Istio generates rich telemetry data that is perfect for this kind of analysis.

## Statistical Anomaly Detection with Prometheus

You do not need a fancy ML platform to do basic anomaly detection. Prometheus itself can handle statistical anomaly detection using standard deviation bands.

The idea is simple: calculate the moving average and standard deviation of a metric, then alert when the current value deviates too far from the average.

**Error rate anomaly detection:**

```promql
(
  sum(rate(istio_requests_total{
    response_code=~"5..",
    reporter="destination",
    destination_service_name="my-service"
  }[5m]))
  /
  sum(rate(istio_requests_total{
    reporter="destination",
    destination_service_name="my-service"
  }[5m]))
)
>
(
  avg_over_time(
    (
      sum(rate(istio_requests_total{
        response_code=~"5..",
        reporter="destination",
        destination_service_name="my-service"
      }[5m]))
      /
      sum(rate(istio_requests_total{
        reporter="destination",
        destination_service_name="my-service"
      }[5m]))
    )[1h:]
  )
  + 3 * stddev_over_time(
    (
      sum(rate(istio_requests_total{
        response_code=~"5..",
        reporter="destination",
        destination_service_name="my-service"
      }[5m]))
      /
      sum(rate(istio_requests_total{
        reporter="destination",
        destination_service_name="my-service"
      }[5m]))
    )[1h:]
  )
)
```

This fires when the current error rate is more than 3 standard deviations above its 1-hour moving average. The beauty of this approach is that it automatically adapts. If your service normally has a 2% error rate, it alerts at a different threshold than a service that normally has 0.01%.

## Setting Up Recording Rules for Efficiency

Those queries are complex and expensive. Create recording rules so Prometheus pre-computes the values:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: anomaly-detection-recording-rules
  namespace: monitoring
spec:
  groups:
    - name: anomaly-detection-baselines
      interval: 1m
      rules:
        - record: service:error_rate:5m
          expr: |
            sum(rate(istio_requests_total{response_code=~"5..",reporter="destination"}[5m]))
              by (destination_service_name)
            /
            sum(rate(istio_requests_total{reporter="destination"}[5m]))
              by (destination_service_name)

        - record: service:p99_latency:5m
          expr: |
            histogram_quantile(0.99,
              sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination"}[5m]))
                by (le, destination_service_name)
            )

        - record: service:request_rate:5m
          expr: |
            sum(rate(istio_requests_total{reporter="destination"}[5m]))
              by (destination_service_name)

        - record: service:error_rate:avg_1h
          expr: avg_over_time(service:error_rate:5m[1h])

        - record: service:error_rate:stddev_1h
          expr: stddev_over_time(service:error_rate:5m[1h])

        - record: service:p99_latency:avg_1h
          expr: avg_over_time(service:p99_latency:5m[1h])

        - record: service:p99_latency:stddev_1h
          expr: stddev_over_time(service:p99_latency:5m[1h])

        - record: service:request_rate:avg_1h
          expr: avg_over_time(service:request_rate:5m[1h])

        - record: service:request_rate:stddev_1h
          expr: stddev_over_time(service:request_rate:5m[1h])
```

Now the anomaly detection alerts become much simpler:

```yaml
groups:
  - name: anomaly-detection-alerts
    rules:
      - alert: ErrorRateAnomaly
        expr: |
          service:error_rate:5m
          > (service:error_rate:avg_1h + 3 * service:error_rate:stddev_1h)
          and service:error_rate:5m > 0.001
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Anomalous error rate on {{ $labels.destination_service_name }}"
          description: "Error rate {{ $value }} is more than 3 stddev above the 1h average"

      - alert: LatencyAnomaly
        expr: |
          service:p99_latency:5m
          > (service:p99_latency:avg_1h + 3 * service:p99_latency:stddev_1h)
          and service:p99_latency:5m > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Anomalous p99 latency on {{ $labels.destination_service_name }}"

      - alert: TrafficAnomaly
        expr: |
          (
            service:request_rate:5m
            < (service:request_rate:avg_1h - 3 * service:request_rate:stddev_1h)
            or
            service:request_rate:5m
            > (service:request_rate:avg_1h + 3 * service:request_rate:stddev_1h)
          )
          and service:request_rate:avg_1h > 1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Anomalous traffic on {{ $labels.destination_service_name }}"
```

Notice the `and` clauses in the alerts. The `service:error_rate:5m > 0.001` condition prevents alerting on services with negligibly small error rates. The `service:request_rate:avg_1h > 1` condition avoids false positives on services with very low traffic where statistical measures are unreliable.

## Seasonal Anomaly Detection

The 1-hour baseline works for catching sudden changes, but what about services that have predictable daily or weekly patterns? For these, you need a longer baseline that captures the seasonal pattern.

Use a 7-day average to account for weekly patterns:

```yaml
- record: service:request_rate:avg_7d
  expr: avg_over_time(service:request_rate:5m[7d])

- record: service:request_rate:stddev_7d
  expr: stddev_over_time(service:request_rate:5m[7d])
```

Then create an alert that uses the weekly baseline:

```yaml
- alert: WeeklyTrafficAnomaly
  expr: |
    service:request_rate:5m
    < (service:request_rate:avg_7d - 2 * service:request_rate:stddev_7d)
    and service:request_rate:avg_7d > 1
  for: 30m
  labels:
    severity: info
  annotations:
    summary: "Traffic significantly below weekly average for {{ $labels.destination_service_name }}"
```

A 2-sigma threshold with a 7-day window is more appropriate here since weekly patterns have more natural variance.

## Rate of Change Detection

Sometimes the absolute value is not what matters. What matters is how fast things are changing. A service going from 0.5% to 2% error rate in 5 minutes is alarming even if 2% is technically within normal bounds.

```yaml
- alert: RapidErrorRateIncrease
  expr: |
    deriv(service:error_rate:5m[15m]) > 0.01
    and service:error_rate:5m > 0.005
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Rapidly increasing error rate on {{ $labels.destination_service_name }}"
    description: "Error rate is increasing at {{ $value }} per second"
```

The `deriv()` function calculates the per-second derivative, so `> 0.01` means the error rate is increasing by 1 percentage point per second.

## Multi-Signal Anomaly Detection

The most reliable anomalies are the ones that show up in multiple metrics at once. If latency goes up AND error rate goes up AND throughput drops, something is definitely wrong.

```yaml
- alert: MultiSignalAnomaly
  expr: |
    (service:error_rate:5m > (service:error_rate:avg_1h + 2 * service:error_rate:stddev_1h))
    and
    (service:p99_latency:5m > (service:p99_latency:avg_1h + 2 * service:p99_latency:stddev_1h))
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Multi-signal anomaly on {{ $labels.destination_service_name }}"
    description: "Both error rate and latency are abnormally elevated"
```

Using a lower threshold (2 sigma instead of 3) is safe here because you are requiring multiple signals to fire simultaneously, which dramatically reduces false positives.

## Visualizing Anomalies in Grafana

Build a Grafana dashboard that shows the anomaly bands alongside actual values:

```json
{
  "targets": [
    {
      "expr": "service:error_rate:5m{destination_service_name=\"$service\"}",
      "legendFormat": "Current Error Rate"
    },
    {
      "expr": "service:error_rate:avg_1h{destination_service_name=\"$service\"} + 3 * service:error_rate:stddev_1h{destination_service_name=\"$service\"}",
      "legendFormat": "Upper Bound (3σ)"
    },
    {
      "expr": "service:error_rate:avg_1h{destination_service_name=\"$service\"} - 3 * service:error_rate:stddev_1h{destination_service_name=\"$service\"}",
      "legendFormat": "Lower Bound (3σ)"
    },
    {
      "expr": "service:error_rate:avg_1h{destination_service_name=\"$service\"}",
      "legendFormat": "1h Average"
    }
  ]
}
```

Use a "fill between" option to shade the area between upper and lower bounds. When the current value leaves the shaded area, you have an anomaly.

## Tuning and False Positive Reduction

Every environment is different, so expect to spend some time tuning. Start with 3 sigma thresholds and a 5-minute `for` duration. If you get too many false positives, try 4 sigma or increase the `for` duration. If you miss real incidents, lower to 2.5 sigma.

Also consider adding minimum traffic thresholds to all your alerts. Anomaly detection on a service that gets 1 request per minute will produce garbage results because the statistical measures need a meaningful sample size.

The combination of Istio metrics and statistical anomaly detection gives you a monitoring system that adapts to your services automatically. No more manually updating threshold values every time traffic patterns change.
