# How to Configure Rollback Criteria for Canary in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Canary Rollback, Deployment Safety, Progressive Delivery

Description: Define and configure rollback criteria for Istio canary deployments to automatically revert bad releases before they affect your entire user base.

---

The whole point of a canary deployment is catching problems before they hit everyone. But catching problems only works if you've defined what "problem" means for your service. Rollback criteria are the rules that trigger an automatic revert when the canary version isn't performing as expected. Without well-defined rollback criteria, your canary deployment is just a slow rollout with extra steps.

This guide covers how to define, configure, and tune rollback criteria for canary deployments using Istio's metrics and progressive delivery tools.

## How Rollback Works

During a canary deployment, an analysis loop runs at regular intervals:

1. Query metrics for the canary version
2. Compare metrics against defined thresholds
3. If metrics pass, advance the canary (or hold at current weight)
4. If metrics fail, increment the failure counter
5. When the failure counter hits the threshold, trigger rollback

Rollback means:
- Set canary traffic weight to 0%
- Set primary traffic weight to 100%
- Scale down canary deployment
- Update the VirtualService to route all traffic to primary

The entire process happens automatically, typically within the analysis interval (30 seconds to a few minutes).

## Basic Rollback Criteria

The simplest rollback criteria check success rate and latency:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: api-service
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-service
  service:
    port: 80
    targetPort: 8080
  analysis:
    interval: 30s
    threshold: 3
    maxWeight: 50
    stepWeight: 10
    metrics:
    - name: request-success-rate
      thresholdRange:
        min: 99
      interval: 30s
    - name: request-duration
      thresholdRange:
        max: 500
      interval: 30s
```

The `threshold: 3` means three consecutive metric check failures trigger rollback. This prevents rollback on transient blips while still catching sustained degradation.

## Tuning the Failure Threshold

The threshold value controls how sensitive your rollback trigger is:

- `threshold: 1` - Extremely sensitive. A single bad check triggers rollback. Good for critical services where any degradation is unacceptable. Risk of false positives from metric noise.
- `threshold: 3` - Balanced. Allows for transient issues while catching real problems. Good default for most services.
- `threshold: 5` - Lenient. Allows the canary more time to stabilize. Good for services with naturally variable metrics.
- `threshold: 10` - Very lenient. Rarely used. Risk of allowing a bad canary to serve traffic for too long.

Match the threshold to your analysis interval to control the total time before rollback:

```
Time to rollback = threshold * interval
```

With `threshold: 3` and `interval: 30s`, rollback happens within 90 seconds of sustained failure.

## Multi-Metric Rollback Criteria

Real services need multiple metrics. A canary might have great success rates but terrible latency, or vice versa. Define criteria for each dimension:

```yaml
analysis:
  interval: 1m
  threshold: 3
  metrics:
  # Availability
  - name: request-success-rate
    thresholdRange:
      min: 99.5
    interval: 1m
  # Performance
  - name: request-duration
    thresholdRange:
      max: 200
    interval: 1m
  # Error rate for specific error codes
  - name: 4xx-rate
    templateRef:
      name: http-4xx-rate
      namespace: production
    thresholdRange:
      max: 5
    interval: 1m
```

Any single metric failing counts toward the threshold. If success rate is fine but latency spikes, the failure counter still increments.

## Custom Rollback Metric: Error Rate by Status Code

Sometimes you need to distinguish between different error types. A spike in 400 errors might be a client issue, while 500 errors indicate a server problem:

```yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: http-5xx-rate
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
      response_code=~"5.*"
    }[{{ interval }}]))
    /
    sum(rate(istio_requests_total{
      reporter="destination",
      destination_workload_namespace="{{ namespace }}",
      destination_workload=~"{{ target }}-canary"
    }[{{ interval }}]))
    * 100
```

```yaml
metrics:
- name: http-5xx-rate
  templateRef:
    name: http-5xx-rate
    namespace: production
  thresholdRange:
    max: 1
  interval: 1m
```

This rolls back if more than 1% of requests to the canary return 5xx errors.

## Latency Percentile Rollback

Don't just check average latency. Use percentiles to catch tail latency issues:

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
---
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: latency-p50
  namespace: production
spec:
  provider:
    type: prometheus
    address: http://prometheus.istio-system:9090
  query: |
    histogram_quantile(0.50,
      sum(rate(istio_request_duration_milliseconds_bucket{
        reporter="destination",
        destination_workload_namespace="{{ namespace }}",
        destination_workload=~"{{ target }}-canary"
      }[{{ interval }}])) by (le)
    )
```

```yaml
metrics:
- name: latency-p50
  templateRef:
    name: latency-p50
  thresholdRange:
    max: 50
  interval: 1m
- name: latency-p99
  templateRef:
    name: latency-p99
  thresholdRange:
    max: 500
  interval: 1m
```

This catches both general latency increases (P50) and tail latency blowups (P99).

## Webhook-Based Rollback

Metric thresholds aren't the only way to trigger rollback. Webhooks can run custom checks:

```yaml
analysis:
  webhooks:
  - name: integration-test
    type: rollout
    url: http://flagger-loadtester.production/
    timeout: 120s
    metadata:
      type: bash
      cmd: |
        # Run integration tests against canary
        /tests/run-integration-suite.sh http://api-service-canary.production
    retries: 1
```

If the webhook returns a non-200 status code, it counts as a failure toward the threshold.

## Instant Rollback Triggers

For critical issues, you might want instant rollback without waiting for the threshold count. Define a separate metric with a very strict threshold:

```yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: panic-error-rate
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
      response_code=~"5.*"
    }[{{ interval }}]))
    /
    sum(rate(istio_requests_total{
      reporter="destination",
      destination_workload_namespace="{{ namespace }}",
      destination_workload=~"{{ target }}-canary"
    }[{{ interval }}]))
    * 100
```

Set `threshold: 1` in combination with a very strict metric. If the 5xx rate exceeds 10%, roll back immediately:

```yaml
analysis:
  threshold: 1
  metrics:
  - name: panic-error-rate
    templateRef:
      name: panic-error-rate
    thresholdRange:
      max: 10
    interval: 30s
```

But this has the downside of also triggering on any other metric failure. The better approach is to use the standard threshold for gradual degradation and manual intervention for emergencies:

```bash
# Manual rollback
kubectl annotate canary api-service -n production "flagger.app/rollback=true"
```

## Testing Your Rollback Criteria

Before relying on rollback criteria in production, test them:

```bash
# Deploy a version that introduces errors
kubectl set image deployment/api-service app=api-service:broken -n production

# Watch the canary analysis
kubectl describe canary api-service -n production

# Verify rollback happens
kubectl get events -n production --sort-by=.lastTimestamp | grep rollback
```

After rollback, verify the primary is still serving traffic:

```bash
kubectl get virtualservice api-service -n production -o yaml | grep weight
```

You should see `weight: 100` on the primary route and the canary route removed or at 0.

Good rollback criteria are the safety net that makes canary deployments trustworthy. Define them based on your service's actual performance characteristics, test them with intentionally bad releases, and tune the thresholds until they catch real problems without triggering on normal variance.
