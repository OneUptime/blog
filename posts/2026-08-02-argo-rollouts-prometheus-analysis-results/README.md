# Argo Rollouts Prometheus Analysis: Arrays, NaN, and Empty Results

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Rollouts, Prometheus, AnalysisTemplate, PromQL, Progressive Delivery, Kubernetes, Observability

Description: Make Prometheus-backed Argo Rollouts analysis conditions explicit for vectors, range queries, NaN, infinity, and no-data results.

---

Many Argo Rollouts Prometheus analyses fail for reasons unrelated to the canary: the condition treats a vector as a scalar, indexes an empty result, checks only the first value of a range query, or leaves `NaN` without an intentional outcome.

PromQL and the AnalysisTemplate expression answer two different questions:

1. PromQL decides which time series and values Prometheus returns.
2. `successCondition` and `failureCondition` decide how Argo Rollouts classifies that returned value.

Design and test both layers.

## Instant Queries Return an Array

The Argo Rollouts Prometheus provider exposes an instant-query vector as `result`. Even when aggregation normally yields one series, the condition commonly selects its first element:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: payments-success-rate
spec:
  args:
    - name: service
  metrics:
    - name: success-rate
      interval: 1m
      count: 5
      successCondition: len(result) == 1 && result[0] >= 0.99
      failureCondition: len(result) > 1 || (len(result) == 1 && result[0] < 0.97)
      failureLimit: 2
      provider:
        prometheus:
          address: http://prometheus.monitoring.svc:9090
          query: |
            sum(rate(http_requests_total{service="{{args.service}}",status!~"5.."}[5m]))
            /
            sum(rate(http_requests_total{service="{{args.service}}"}[5m]))
```

The cardinality check is deliberate. If the query unexpectedly returns multiple series, using `result[0]` alone makes the decision depend on one element while silently ignoring the others. Prefer PromQL that reduces to the intended cardinality, then assert that assumption in the condition.

## Range Queries Must Check Every Value

A range query produces multiple samples. The official provider documentation warns that `result[0] < 1000` checks only the first returned value. Use expression collection functions:

```yaml
successCondition: "len(result) > 0 && all(result, # < 1000)"
failureCondition: "len(result) > 0 && any(result, # >= 1500)"
provider:
  prometheus:
    address: http://prometheus.monitoring.svc:9090
    rangeQuery:
      start: 'now() - duration("5m")'
      end: 'now()'
      step: 30s
    query: http_request_duration_milliseconds{service="payments-canary"}
```

Leave a reviewable gap between the success and failure bands only if `Inconclusive` is a desired human-decision state. Otherwise define complete, non-overlapping behavior.

## Choose a No-Data Policy

Prometheus can legitimately return an empty vector: the canary has not been scraped, the label selector is wrong, traffic has not arrived, or the lookback window is too short.

Never index before checking length. To fail closed:

```yaml
successCondition: len(result) > 0 && result[0] >= 0.99
```

With only a success condition, a false evaluation is treated as a failed measurement. This makes missing telemetry prevent promotion.

To treat no data as success, the official analysis documentation gives this pattern:

```yaml
successCondition: len(result) == 0 || result[0] >= 0.99
```

That policy is rarely appropriate for a release safety signal because a broken scrape becomes a pass. A better low-traffic design is often to add an explicit request-volume metric, delay analysis with `initialDelay`, generate controlled test traffic, or return `Inconclusive` for manual review.

For example:

```yaml
interval: 1m
count: 5
successCondition: len(result) == 1 && result[0] >= 0.99
failureCondition: len(result) > 1
inconclusiveLimit: 2
```

Here an empty result satisfies neither condition and counts as an inconclusive measurement. Up to two such measurements are tolerated; the third makes the metric Inconclusive. Test the exact behavior with your Rollouts release and limits rather than relying on an implicit default.

## Handle NaN and Infinity Intentionally

A division such as successful requests divided by total requests may produce `NaN` when both values are zero, or infinity when the denominator is zero and the numerator is nonzero. Other floating-point arithmetic can also produce these values.

Argo Rollouts expressions provide `isNaN()` and `isInf()`. A fail-closed condition can be explicit:

```yaml
successCondition: >-
  len(result) == 1 &&
  !isNaN(result[0]) &&
  !isInf(result[0]) &&
  result[0] >= 0.99
```

Or make anomalous values an immediate failure:

```yaml
failureCondition: >-
  len(result) != 1 ||
  isNaN(result[0]) ||
  isInf(result[0]) ||
  result[0] < 0.97
```

Do not automatically turn `NaN` into zero or one without deciding what “no denominator” means for this release. The official analysis guide demonstrates that the same `NaN` can be classified Successful, Inconclusive, or Failed depending on the expressions.

## Validate the Query Before the Rollout

Run the PromQL in the Prometheus UI at deployment-like traffic levels and confirm:

- exact result cardinality;
- label filters select only the canary;
- behavior before the first scrape;
- behavior at zero requests;
- sufficient lookback to survive scrape gaps;
- all range-query samples use the intended unit;
- tenant headers or authentication work from the Rollouts controller.

Inspect the generated AnalysisRun when something differs:

```bash
kubectl get analysisrun -n payments
kubectl describe analysisrun <name> -n payments
kubectl get analysisrun <name> -n payments -o yaml
```

The metric result metadata can include the resolved Prometheus query, which is useful for catching incorrect argument substitution.

## Prefer Boring Release Signals

Release gates should have known cardinality, explicit no-data behavior, and thresholds with operational meaning. Recording rules can precompute complex ratios and standardize labels, leaving the AnalysisTemplate to evaluate a simple, stable result.

Arrays, `NaN`, and empty vectors are not edge cases to ignore. They are possible measurement states, and the template should say exactly what each state means for promotion.

## Official Documentation

- [Argo Rollouts: Prometheus Metrics](https://argo-rollouts.readthedocs.io/en/stable/analysis/prometheus/)
- [Argo Rollouts: Analysis and Progressive Delivery](https://argo-rollouts.readthedocs.io/en/stable/features/analysis/)
- [Prometheus: Querying Basics and Result Types](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Prometheus: Query Functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)
