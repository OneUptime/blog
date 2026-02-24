# How to Configure Automatic Canary Analysis with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Canary Analysis, Metrics, Progressive Delivery

Description: Set up automatic canary analysis using Istio metrics to make data-driven promotion or rollback decisions during progressive deployments.

---

Manual canary analysis is slow and error-prone. You push a new version, send it some traffic, stare at dashboards for 20 minutes, and decide if things look OK. Automatic canary analysis replaces that gut-feeling approach with metric-based decisions. You define what "healthy" means using success rates, latency percentiles, and custom business metrics, and the system decides whether to promote or roll back.

This guide shows you how to set up automatic canary analysis using Istio's built-in metrics and analysis tools.

## What Metrics Are Available

Istio generates rich telemetry data for every request that passes through the mesh. The key metrics for canary analysis are:

```promql
# Request success rate
istio_requests_total{response_code=~"2.*|3.*"}

# Request error rate
istio_requests_total{response_code=~"5.*"}

# Request latency
istio_request_duration_milliseconds_bucket

# Request throughput
rate(istio_requests_total[5m])
```

These metrics are labeled with source and destination workload information, so you can compare canary and primary versions directly.

## Setting Up the Analysis Framework

The analysis pipeline has three components:
1. Istio sidecars generate metrics
2. Prometheus collects and stores metrics
3. An analysis tool (Flagger, Argo Rollouts, or custom) queries metrics and makes decisions

For Flagger-based analysis, the Canary resource defines the criteria:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: api-server
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  service:
    port: 80
    targetPort: 8080
  analysis:
    interval: 1m
    threshold: 3
    maxWeight: 50
    stepWeight: 5
    metrics:
    - name: request-success-rate
      thresholdRange:
        min: 99.5
      interval: 1m
    - name: request-duration
      thresholdRange:
        max: 200
      interval: 1m
```

## Defining Success Rate Thresholds

The success rate is the most fundamental canary metric. It measures the percentage of requests that return non-5xx responses:

```yaml
metrics:
- name: request-success-rate
  thresholdRange:
    min: 99.5
  interval: 1m
```

This means: at each 1-minute analysis interval, the canary must have at least 99.5% success rate. If it drops below that, the check fails.

How to choose the threshold:
- Start by looking at your current production success rate. If your service normally runs at 99.9%, set the canary threshold at 99.5% to catch degradation while allowing for normal variance.
- Don't set it at exactly your current rate. Normal fluctuations will cause unnecessary rollbacks.

## Configuring Latency Thresholds

Latency analysis catches performance regressions that don't cause errors but degrade user experience:

```yaml
metrics:
- name: request-duration
  thresholdRange:
    max: 200
  interval: 1m
```

This uses the P99 latency by default. The canary's P99 latency must be under 200ms.

For more granular control, use custom metric templates:

```yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: latency-p95
  namespace: production
spec:
  provider:
    type: prometheus
    address: http://prometheus.istio-system:9090
  query: |
    histogram_quantile(0.95,
      sum(rate(istio_request_duration_milliseconds_bucket{
        reporter="destination",
        destination_workload_namespace="{{ namespace }}",
        destination_workload=~"{{ target }}-canary"
      }[{{ interval }}])) by (le)
    )
```

Then reference it in the canary:

```yaml
metrics:
- name: latency-p95
  templateRef:
    name: latency-p95
    namespace: production
  thresholdRange:
    max: 150
  interval: 1m
```

## Custom Business Metrics

Success rate and latency are necessary but not sufficient. A new version might return 200 OK responses with wrong data. Custom business metrics catch these issues:

```yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: order-processing-rate
  namespace: production
spec:
  provider:
    type: prometheus
    address: http://prometheus.istio-system:9090
  query: |
    sum(rate(orders_processed_total{
      namespace="{{ namespace }}",
      deployment=~"{{ target }}-canary"
    }[{{ interval }}]))
    /
    sum(rate(orders_received_total{
      namespace="{{ namespace }}",
      deployment=~"{{ target }}-canary"
    }[{{ interval }}]))
    * 100
```

```yaml
metrics:
- name: order-processing-rate
  templateRef:
    name: order-processing-rate
    namespace: production
  thresholdRange:
    min: 95
  interval: 2m
```

## Comparing Canary vs Primary

Instead of absolute thresholds, you can compare canary performance to the primary. This catches relative regressions even if absolute values are within bounds:

```yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: success-rate-comparison
  namespace: production
spec:
  provider:
    type: prometheus
    address: http://prometheus.istio-system:9090
  query: |
    (
      sum(rate(istio_requests_total{
        reporter="destination",
        destination_workload_namespace="{{ namespace }}",
        destination_workload="{{ target }}-canary",
        response_code!~"5.*"
      }[{{ interval }}]))
      /
      sum(rate(istio_requests_total{
        reporter="destination",
        destination_workload_namespace="{{ namespace }}",
        destination_workload="{{ target }}-canary"
      }[{{ interval }}]))
    )
    -
    (
      sum(rate(istio_requests_total{
        reporter="destination",
        destination_workload_namespace="{{ namespace }}",
        destination_workload="{{ target }}-primary",
        response_code!~"5.*"
      }[{{ interval }}]))
      /
      sum(rate(istio_requests_total{
        reporter="destination",
        destination_workload_namespace="{{ namespace }}",
        destination_workload="{{ target }}-primary"
      }[{{ interval }}]))
    )
```

```yaml
metrics:
- name: success-rate-comparison
  templateRef:
    name: success-rate-comparison
    namespace: production
  thresholdRange:
    min: -0.01
  interval: 1m
```

The threshold `min: -0.01` means the canary's success rate can be at most 1 percentage point lower than the primary's. If the canary is worse by more than that, the check fails.

## Setting Analysis Timing

The analysis interval and threshold work together to control the analysis window:

```yaml
analysis:
  interval: 1m
  threshold: 5
  maxWeight: 50
  stepWeight: 10
```

- Each step takes `interval` (1 minute) to evaluate
- From 0% to 50% at 10% steps = 5 steps
- Total promotion time if all checks pass: 5 minutes
- Up to 5 failed checks allowed before rollback
- Total maximum analysis time: ~10 minutes

For high-traffic services, shorter intervals work because metrics are statistically significant. For low-traffic services, use longer intervals (2-5 minutes) to accumulate enough data points.

## Handling Low-Traffic Services

Low-traffic services don't generate enough metrics for meaningful analysis in short intervals. Configure longer analysis windows:

```yaml
analysis:
  interval: 5m
  threshold: 3
  maxWeight: 50
  stepWeight: 25
  metrics:
  - name: request-success-rate
    thresholdRange:
      min: 95
    interval: 5m
```

You can also generate synthetic traffic to ensure the canary gets enough requests:

```yaml
analysis:
  webhooks:
  - name: load-test
    type: rollout
    url: http://flagger-loadtester.production/
    metadata:
      cmd: "hey -z 4m -q 5 -c 2 http://api-server-canary.production/"
```

## Monitoring the Analysis

Watch the analysis in real time:

```bash
# Flagger logs show detailed analysis results
kubectl logs -n istio-system -l app.kubernetes.io/name=flagger -f | grep api-server
```

You'll see output like:

```
Starting canary analysis for api-server.production
Advance api-server.production canary weight 10
Checking request-success-rate: 99.8% >= 99.5% (pass)
Checking request-duration: 145ms <= 200ms (pass)
Advance api-server.production canary weight 20
```

Or for a failing canary:

```
Checking request-success-rate: 97.2% < 99.5% (fail) 1/3
Checking request-success-rate: 96.5% < 99.5% (fail) 2/3
Checking request-success-rate: 95.1% < 99.5% (fail) 3/3
Rolling back api-server.production
```

Automatic canary analysis turns your deployment process from a manual, risky activity into a systematic, data-driven pipeline. Define your health criteria once, and every deployment is validated against real production traffic before full promotion.
