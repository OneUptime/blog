# How to Set Up Metric-Based Canary Promotion in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Canary Promotion, Metrics, Deployment Strategy

Description: Implement metric-based canary promotion using Istio telemetry data to automatically advance or halt canary deployments based on real production performance.

---

Metric-based canary promotion is the process of automatically advancing a canary deployment through traffic weight stages based on real-time performance metrics. Instead of relying on timers or manual approval, the system evaluates whether the canary version meets your defined criteria at each stage and promotes it only when the numbers look good.

This guide covers how to set up the complete pipeline: defining promotion criteria, collecting metrics, evaluating them, and automating the traffic weight progression.

## The Promotion Pipeline

A metric-based promotion pipeline works in stages:

1. Deploy canary version with 0% traffic
2. Shift a small percentage (e.g., 5%) of traffic to canary
3. Wait for metrics to accumulate (1-5 minutes)
4. Evaluate metrics against defined thresholds
5. If metrics pass, increase traffic weight
6. Repeat until full promotion or rollback

Istio handles the traffic splitting through VirtualService weights, and you need something to manage the evaluation loop. Flagger is the most popular choice, but you can also build this with Argo Rollouts or custom controllers.

## Setting Up Istio Traffic Splitting

First, understand how Istio splits traffic between versions. The VirtualService uses weighted routing:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app
  namespace: production
spec:
  hosts:
  - my-app
  http:
  - route:
    - destination:
        host: my-app-primary
      weight: 90
    - destination:
        host: my-app-canary
      weight: 10
```

The DestinationRule defines the subsets:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-app
  namespace: production
spec:
  host: my-app
  subsets:
  - name: primary
    labels:
      app: my-app
      version: v1
  - name: canary
    labels:
      app: my-app
      version: v2
```

Flagger manages these resources automatically, but it's useful to understand what's happening underneath.

## Defining Promotion Metrics

Good promotion metrics cover three dimensions:

**Availability (success rate):**
```yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: success-rate
  namespace: production
spec:
  provider:
    type: prometheus
    address: http://prometheus.istio-system:9090
  query: |
    sum(rate(istio_requests_total{
      reporter="destination",
      destination_workload_namespace="{{ namespace }}",
      destination_workload=~"{{ target }}-canary",
      response_code!~"5.*"
    }[{{ interval }}]))
    /
    sum(rate(istio_requests_total{
      reporter="destination",
      destination_workload_namespace="{{ namespace }}",
      destination_workload=~"{{ target }}-canary"
    }[{{ interval }}]))
    * 100
```

**Performance (latency):**
```yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: latency-p99
  namespace: production
spec:
  provider:
    type: prometheus
    address: http://prometheus.istio-system:9090
  query: |
    histogram_quantile(0.99,
      sum(rate(istio_request_duration_milliseconds_bucket{
        reporter="destination",
        destination_workload_namespace="{{ namespace }}",
        destination_workload=~"{{ target }}-canary"
      }[{{ interval }}])) by (le)
    )
```

**Saturation (error budget):**
```yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: error-budget
  namespace: production
spec:
  provider:
    type: prometheus
    address: http://prometheus.istio-system:9090
  query: |
    1 - (
      sum(increase(istio_requests_total{
        reporter="destination",
        destination_workload_namespace="{{ namespace }}",
        destination_workload=~"{{ target }}-canary",
        response_code=~"5.*"
      }[{{ interval }}]))
      /
      sum(increase(istio_requests_total{
        reporter="destination",
        destination_workload_namespace="{{ namespace }}",
        destination_workload=~"{{ target }}-canary"
      }[{{ interval }}]))
    )
```

## Configuring the Canary with Promotion Criteria

Combine all metrics in the Canary resource:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-app
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  service:
    port: 80
    targetPort: 8080
  analysis:
    interval: 1m
    threshold: 3
    maxWeight: 50
    stepWeight: 10
    stepWeightPromotion: 100
    metrics:
    - name: success-rate
      templateRef:
        name: success-rate
        namespace: production
      thresholdRange:
        min: 99.5
      interval: 1m
    - name: latency-p99
      templateRef:
        name: latency-p99
        namespace: production
      thresholdRange:
        max: 300
      interval: 1m
    - name: error-budget
      templateRef:
        name: error-budget
        namespace: production
      thresholdRange:
        min: 0.99
      interval: 1m
```

The `stepWeightPromotion: 100` means that once the canary reaches `maxWeight` and all metrics pass, it's promoted to 100% instantly rather than stepping through to 100%.

## Progressive Weight Steps

You can define non-linear weight progression for more cautious promotion:

```yaml
analysis:
  interval: 2m
  threshold: 3
  stepWeights: [1, 5, 10, 25, 50]
  metrics:
  - name: request-success-rate
    thresholdRange:
      min: 99
    interval: 2m
```

Using `stepWeights` instead of `stepWeight`, you control exactly how much traffic the canary gets at each stage. This is useful when you want to be very cautious at first (1%, 5%) and then increase more aggressively.

The total promotion time with this config: 5 steps * 2 minutes = 10 minutes minimum.

## Promotion Webhooks

Run tests at specific points during the promotion:

```yaml
analysis:
  webhooks:
  - name: smoke-test
    type: pre-rollout
    url: http://flagger-loadtester.production/
    timeout: 60s
    metadata:
      type: bash
      cmd: |
        curl -sf http://my-app-canary.production/health && \
        curl -sf http://my-app-canary.production/api/v1/status
  - name: load-test
    type: rollout
    url: http://flagger-loadtester.production/
    metadata:
      cmd: "hey -z 1m -q 20 -c 5 http://my-app-canary.production/api/v1/data"
  - name: confirm-promotion
    type: confirm-promotion
    url: http://my-approval-system/approve
```

The `pre-rollout` webhook runs before any traffic is sent to the canary. If the smoke test fails, the canary is never exposed to real traffic.

The `confirm-promotion` webhook is called when the canary has passed all checks at max weight. It allows manual approval before final promotion. If you want fully automated promotion, omit this webhook.

## Handling Metric Collection Delays

Prometheus scrapes metrics every 15-30 seconds typically. If your analysis interval is too short, you might not have fresh metrics when the analysis runs. Account for this:

```yaml
analysis:
  interval: 2m
  metrics:
  - name: success-rate
    templateRef:
      name: success-rate
    thresholdRange:
      min: 99.5
    interval: 2m
```

The metric `interval` (the range in the PromQL query) should be at least 2x the Prometheus scrape interval to ensure you have at least two data points.

## Promotion Notification

Set up notifications when canary promotions succeed or fail:

```yaml
apiVersion: flagger.app/v1beta1
kind: AlertProvider
metadata:
  name: slack
  namespace: production
spec:
  type: slack
  channel: deployments
  address: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

Reference it in the Canary:

```yaml
spec:
  analysis:
    alerts:
    - name: slack-notification
      severity: info
      providerRef:
        name: slack
        namespace: production
```

You'll get messages like: "my-app.production canary promotion completed, version 2.0.0" or "my-app.production canary rollback triggered, version 2.0.0 failed metric checks."

## Verifying Promotion

After a successful promotion, verify the state:

```bash
# Check canary status
kubectl get canary my-app -n production

# Verify the primary is running the new version
kubectl get deployment my-app-primary -n production -o jsonpath='{.spec.template.spec.containers[0].image}'

# Check the VirtualService weights (should be 100/0 after promotion)
kubectl get virtualservice my-app -n production -o jsonpath='{.spec.http[0].route}'
```

The promotion is complete when the primary deployment runs the new image and all traffic is routed to the primary with 100% weight.

Metric-based canary promotion takes the guesswork out of deployments. You define what "healthy" looks like once, and every release is validated against those criteria with real production traffic. Failures are caught early, and good releases are promoted automatically.
