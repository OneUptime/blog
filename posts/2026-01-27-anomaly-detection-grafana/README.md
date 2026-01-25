# How to Implement Anomaly Detection in Grafana

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, Anomaly Detection, Machine Learning, Alerting, Observability, Prometheus, Time Series

Description: Learn how to detect anomalies in your metrics using Grafana's built-in capabilities, PromQL statistical functions, and external ML integrations.

---

## Why Anomaly Detection?

Static thresholds work until they do not. A 90% CPU alert might be appropriate during peak hours but meaningless at 3 AM when normal baseline is 20%. Anomaly detection identifies unusual patterns relative to historical behavior, catching issues that static thresholds miss.

Anomaly detection helps identify:
- Unexpected traffic spikes or drops
- Gradual performance degradation
- Unusual error patterns
- Resource consumption anomalies
- Security incidents

## Approaches to Anomaly Detection

Grafana supports several approaches from simple to sophisticated:

1. **Statistical methods**: Z-scores, standard deviations
2. **Prediction-based**: Compare actual vs predicted values
3. **Seasonal awareness**: Account for daily/weekly patterns
4. **Machine learning**: External ML platforms

## Statistical Anomaly Detection with PromQL

### Standard Deviation Method

Detect values more than N standard deviations from the mean:

```promql
# Current value
http_requests_total

# Mean over past week
avg_over_time(http_requests_total[7d])

# Standard deviation
stddev_over_time(http_requests_total[7d])

# Z-score: How many standard deviations from mean
(
  http_requests_total
  - avg_over_time(http_requests_total[7d])
)
/
stddev_over_time(http_requests_total[7d])
```

Alert when z-score exceeds threshold:

```yaml
groups:
  - name: anomaly-detection
    rules:
      - alert: RequestRateAnomaly
        expr: |
          abs(
            (
              sum(rate(http_requests_total[5m]))
              - avg_over_time(sum(rate(http_requests_total[5m]))[7d:1h])
            )
            /
            stddev_over_time(sum(rate(http_requests_total[5m]))[7d:1h])
          ) > 3
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Unusual request rate detected"
          description: "Request rate is {{ $value | printf \"%.1f\" }} standard deviations from normal"
```

### Moving Average Comparison

Compare current values to a moving average:

```promql
# Current rate
sum(rate(http_requests_total[5m]))

# Moving average over 1 hour
avg_over_time(sum(rate(http_requests_total[5m]))[1h:])

# Percentage deviation from moving average
(
  sum(rate(http_requests_total[5m]))
  - avg_over_time(sum(rate(http_requests_total[5m]))[1h:])
)
/
avg_over_time(sum(rate(http_requests_total[5m]))[1h:])
* 100
```

### Quantile-Based Detection

Use quantiles to identify outliers:

```promql
# Values above 99th percentile are anomalous
http_request_duration_seconds
> on()
quantile_over_time(0.99, http_request_duration_seconds[7d])
```

## Seasonal Anomaly Detection

Many metrics follow daily or weekly patterns. Account for seasonality by comparing to the same time in previous periods.

### Day-Over-Day Comparison

```promql
# Current value
sum(rate(http_requests_total[5m]))

# Same time yesterday
sum(rate(http_requests_total[5m] offset 1d))

# Percentage change from yesterday
(
  sum(rate(http_requests_total[5m]))
  - sum(rate(http_requests_total[5m] offset 1d))
)
/
sum(rate(http_requests_total[5m] offset 1d))
* 100
```

### Week-Over-Week Comparison

Better for business metrics with weekly patterns:

```promql
# Compare to same day last week
(
  sum(rate(orders_total[1h]))
  - sum(rate(orders_total[1h] offset 7d))
)
/
sum(rate(orders_total[1h] offset 7d))
* 100
```

### Multi-Period Baseline

Average multiple historical periods for a more stable baseline:

```promql
# Average of same hour from past 4 weeks
(
  sum(rate(http_requests_total[1h] offset 7d))
  + sum(rate(http_requests_total[1h] offset 14d))
  + sum(rate(http_requests_total[1h] offset 21d))
  + sum(rate(http_requests_total[1h] offset 28d))
) / 4
```

## Grafana Machine Learning (Enterprise)

Grafana Enterprise includes native ML capabilities for anomaly detection.

### Setting Up ML-Powered Alerts

1. Navigate to Alerting > Alert rules
2. Create a new alert rule
3. In the expression builder, select "Machine Learning" condition
4. Configure the ML model:

```yaml
ML Configuration:
  Algorithm: Outlier detection
  Training window: 14 days
  Sensitivity: Medium

  # Model learns normal patterns from historical data
  # Alerts when current value deviates significantly
```

### ML Expression in Alert Rules

```yaml
# Alert rule using ML predictions
groups:
  - name: ml-anomalies
    rules:
      - alert: MLDetectedAnomaly
        expr: |
          grafana_ml_outlier_score{model="request-rate"} > 0.9
        for: 5m
        labels:
          severity: warning
```

## External ML Integration

For advanced anomaly detection, integrate external ML platforms.

### Prophet Integration

Facebook's Prophet excels at time series forecasting with seasonality.

```python
# anomaly_detector.py
from prophet import Prophet
import pandas as pd
from prometheus_api_client import PrometheusConnect

def detect_anomalies(prom_url: str, query: str, lookback_days: int = 30):
    """Detect anomalies using Prophet."""
    prom = PrometheusConnect(url=prom_url)

    # Fetch historical data
    data = prom.custom_query_range(
        query=query,
        start_time=datetime.now() - timedelta(days=lookback_days),
        end_time=datetime.now(),
        step='1h'
    )

    # Prepare for Prophet
    df = pd.DataFrame(data[0]['values'], columns=['ds', 'y'])
    df['ds'] = pd.to_datetime(df['ds'], unit='s')
    df['y'] = df['y'].astype(float)

    # Train model
    model = Prophet(
        yearly_seasonality=False,
        weekly_seasonality=True,
        daily_seasonality=True,
        changepoint_prior_scale=0.05
    )
    model.fit(df)

    # Generate predictions
    future = model.make_future_dataframe(periods=24, freq='H')
    forecast = model.predict(future)

    # Identify anomalies (outside prediction interval)
    df_merged = df.merge(forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']], on='ds')
    df_merged['anomaly'] = (df_merged['y'] < df_merged['yhat_lower']) | (df_merged['y'] > df_merged['yhat_upper'])

    return df_merged[df_merged['anomaly']]
```

### Exposing Anomalies as Metrics

Push anomaly scores back to Prometheus:

```python
from prometheus_client import Gauge, start_http_server

anomaly_score = Gauge(
    'anomaly_score',
    'Anomaly score from ML model',
    ['metric', 'service']
)

def update_anomaly_scores():
    for service in services:
        score = detect_anomaly_score(service)
        anomaly_score.labels(
            metric='request_rate',
            service=service
        ).set(score)

# Run on schedule
start_http_server(8000)
while True:
    update_anomaly_scores()
    time.sleep(300)  # Every 5 minutes
```

## Visualizing Anomalies in Grafana

### Anomaly Band Panel

Show predictions with confidence intervals:

```promql
# Actual value
sum(rate(http_requests_total[5m]))

# Upper bound (mean + 2*stddev)
avg_over_time(sum(rate(http_requests_total[5m]))[1d:])
+ 2 * stddev_over_time(sum(rate(http_requests_total[5m]))[1d:])

# Lower bound (mean - 2*stddev)
avg_over_time(sum(rate(http_requests_total[5m]))[1d:])
- 2 * stddev_over_time(sum(rate(http_requests_total[5m]))[1d:])
```

Panel configuration:

```yaml
Panel Type: Time series

Series:
  - Alias: Actual
    Line width: 2

  - Alias: Upper Bound
    Line style: dashed
    Fill below to: Lower Bound
    Fill opacity: 10

  - Alias: Lower Bound
    Line style: dashed
```

### Anomaly Score Heatmap

```promql
# Anomaly scores by service over time
anomaly_score{metric="request_rate"}
```

```yaml
Panel Type: Heatmap
Color scheme: Spectral (reversed)
Bucket: Service
```

### Anomaly Event Timeline

Use annotations to mark detected anomalies:

```yaml
Annotation Query:
  Data source: Prometheus
  Query: ALERTS{alertname=~".*Anomaly.*"}
  Enable: true
```

## Alert Tuning

### Reducing False Positives

**Increase detection window:**
```yaml
for: 15m  # Instead of 5m
```

**Require sustained deviation:**
```promql
# Must be anomalous for at least 3 of last 5 data points
count_over_time(
  (
    abs(
      (metric - avg_over_time(metric[1d]))
      / stddev_over_time(metric[1d])
    ) > 3
  )[25m:]
) >= 3
```

**Use hysteresis:**
```yaml
# Different thresholds for firing vs resolving
- alert: AnomalyDetected
  expr: anomaly_score > 0.9  # Fire at 0.9
  for: 5m

# Implicitly resolves when score < 0.9
# Add explicit recovery threshold if needed
```

### Handling Expected Anomalies

**Maintenance windows:**
```yaml
# Silence anomaly alerts during deployments
inhibit_rules:
  - source_match:
      alertname: DeploymentInProgress
    target_match_re:
      alertname: '.*Anomaly.*'
```

**Holiday adjustments:**
Use recording rules with holiday awareness:
```yaml
- record: metric:baseline:adjusted
  expr: |
    metric:baseline
    * on() group_left()
    (holiday_factor or vector(1))
```

## Practical Implementation

### Start Simple

Begin with standard deviation-based detection on your most critical metrics:

```yaml
groups:
  - name: simple-anomalies
    rules:
      - alert: LatencyAnomaly
        expr: |
          histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))
          > 2 * avg_over_time(histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))[1d:])
        for: 10m
        annotations:
          summary: "P99 latency is 2x normal"

      - alert: ErrorRateAnomaly
        expr: |
          (
            sum(rate(http_requests_total{status=~"5.."}[5m]))
            / sum(rate(http_requests_total[5m]))
          )
          > 3 * avg_over_time(
            sum(rate(http_requests_total{status=~"5.."}[5m]))
            / sum(rate(http_requests_total[5m]))
          [7d:1h])
        for: 5m
        annotations:
          summary: "Error rate is 3x normal"
```

### Graduated Alerting

Different severities for different deviation levels:

```yaml
- alert: MetricAnomalyWarning
  expr: anomaly_score > 0.7 and anomaly_score <= 0.9
  labels:
    severity: warning

- alert: MetricAnomalyCritical
  expr: anomaly_score > 0.9
  labels:
    severity: critical
```

### Documentation

For each anomaly alert, document:
- What normal patterns look like
- Common causes of anomalies
- Investigation steps
- False positive indicators

```yaml
annotations:
  summary: "Request rate anomaly detected"
  description: |
    Current rate is {{ $value | printf "%.1f" }} std devs from normal.
    Normal patterns: Higher during business hours, lower on weekends.
    Common causes: Marketing campaigns, bot traffic, outages upstream.
    Investigation: Check traffic sources, verify no deployments in progress.
  runbook_url: "https://wiki/runbooks/request-rate-anomaly"
```

## Conclusion

Anomaly detection moves alerting from rigid thresholds to adaptive intelligence. Start with statistical methods using PromQL for straightforward implementation, add seasonal awareness for metrics with predictable patterns, and consider ML integration for complex scenarios. The goal is catching real problems while minimizing alert fatigue. Tune aggressively, document expected anomalies, and treat every false positive as an opportunity to improve your detection models.
