# How to Debug Flagger Canary That Keeps Rolling Back

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flagger, Debugging, Rollback, Kubernetes, Canary Deployments

Description: Learn how to diagnose and fix a Flagger canary deployment that repeatedly rolls back instead of being promoted.

---

## Introduction

When a Flagger canary keeps rolling back, it means the canary analysis is detecting metric threshold violations during the progressive delivery process. While automated rollback is exactly what Flagger is designed to do when issues are detected, repeated rollbacks on deployments you expect to succeed indicate a configuration problem, a metrics issue, or a genuine application problem that needs investigation.

This guide walks through the debugging process for canary deployments that consistently fail analysis and roll back. You will learn how to identify whether the problem lies in the application, the metrics configuration, the threshold settings, or the testing methodology.

## Prerequisites

Before debugging, ensure you have:

- `kubectl` access to the cluster.
- Access to Flagger logs and Prometheus.
- Understanding of the metrics configured in your Canary resource.

## Step 1: Identify Which Metrics Are Failing

The first step is to determine exactly which metrics are causing the rollback. Flagger logs contain this information.

```bash
# Check Flagger logs for metric evaluation results
kubectl logs -l app.kubernetes.io/name=flagger \
  -n <flagger-namespace> --tail=200 | grep -i "failed\|halt\|rollback"
```

Look for messages indicating which metric check failed. Flagger will log messages such as "Halt advancement, threshold reached" along with the specific metric name that failed.

```bash
# Get detailed canary events
kubectl describe canary <name> -n <namespace>
```

The Events section will show a timeline of the canary analysis, including which checks passed and which failed.

## Step 2: Validate Metric Queries Against Prometheus

Once you know which metric is failing, validate the query directly against Prometheus to understand what values are being returned.

```bash
# Port-forward to Prometheus
kubectl port-forward svc/prometheus -n monitoring 9090:9090
```

Then query the metric in the Prometheus UI or via the API. For the built-in request-success-rate metric, check that your application is actually returning successful responses.

```bash
# Query request success rate from Prometheus API
curl -s 'http://localhost:9090/api/v1/query' \
  --data-urlencode 'query=sum(rate(http_requests_total{namespace="test",status!~"5.*"}[1m]))/sum(rate(http_requests_total{namespace="test"}[1m]))*100'
```

If the query returns values below your configured threshold, the rollback is legitimate and you need to investigate why the canary version is producing errors or high latency.

## Step 3: Check for Insufficient Traffic

A common cause of rollback is insufficient traffic to the canary. When traffic volume is too low, a single failed request can cause the success rate to drop below the threshold.

```bash
# Check the total request rate to the canary
curl -s 'http://localhost:9090/api/v1/query' \
  --data-urlencode 'query=sum(rate(http_requests_total{namespace="test",pod=~"podinfo-canary.*"}[1m]))'
```

If the request rate is very low (below 1 request per second), the metrics become unreliable. A single 5xx response out of 10 total requests gives a 90 percent success rate, which would fail a 99 percent threshold.

Solutions include deploying a load tester or adjusting thresholds for low-traffic services.

```yaml
# Add a load tester webhook to generate traffic
  analysis:
    webhooks:
      - name: load-test
        type: rollout
        url: http://flagger-loadtester.test/
        metadata:
          cmd: "hey -z 1m -q 10 -c 2 http://podinfo-canary.test/"
```

## Step 4: Review Threshold Settings

Thresholds that are too strict can cause unnecessary rollbacks, especially in non-production environments or during initial setup.

```yaml
# Example of potentially too-strict thresholds
  analysis:
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99.9  # Very strict - consider 99 for non-critical services
        interval: 1m
      - name: request-duration
        thresholdRange:
          max: 100  # 100ms might be too strict
        interval: 1m
```

Consider relaxing thresholds temporarily to determine if the issue is with the application or the thresholds themselves.

```yaml
# More forgiving thresholds for debugging
  analysis:
    threshold: 5  # Allow more failed checks before rollback
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 95
        interval: 1m
      - name: request-duration
        thresholdRange:
          max: 1000
        interval: 1m
```

## Step 5: Examine the Canary Application Logs

If metrics show genuine errors, investigate the application logs for the canary pods.

```bash
# Get canary pod logs
kubectl logs -l app=<app-name>,pod-template-hash -n <namespace> --tail=100

# Check for error patterns
kubectl logs -l app=<app-name> -n <namespace> --tail=200 | grep -i "error\|exception\|panic"
```

Common application issues that cause rollbacks include misconfigured environment variables, missing secrets or configmaps, database migration failures, and incompatible API changes.

## Step 6: Compare Primary and Canary Configurations

Ensure the canary has the same configuration as the primary, except for the intended changes.

```bash
# Compare environment variables
kubectl get deployment <name>-primary -n <namespace> -o jsonpath='{.spec.template.spec.containers[0].env}' | jq .
kubectl get deployment <name> -n <namespace> -o jsonpath='{.spec.template.spec.containers[0].env}' | jq .

# Compare resource limits
kubectl get deployment <name>-primary -n <namespace> -o jsonpath='{.spec.template.spec.containers[0].resources}'
kubectl get deployment <name> -n <namespace> -o jsonpath='{.spec.template.spec.containers[0].resources}'
```

## Step 7: Check the Analysis Interval

If the analysis interval is too short, Flagger might evaluate metrics before the canary has had time to stabilize.

```yaml
# Consider increasing the analysis interval
  analysis:
    interval: 1m  # Give more time between checks
    threshold: 5  # Allow more checks before rollback
```

## Step 8: Inspect Custom Metric Templates

If you are using custom MetricTemplate resources, verify that the queries are correct and return the expected data type.

```bash
# List metric templates
kubectl get metrictemplates -n <namespace>

# Inspect a specific template
kubectl get metrictemplate <name> -n <namespace> -o yaml
```

Ensure that the query returns a single scalar value. Queries that return vectors or no data will cause metric evaluation to fail.

## Conclusion

Debugging a Flagger canary that keeps rolling back requires understanding whether the rollback is legitimate (the new version has real issues) or a false positive (metrics or configuration problems). Start by identifying the failing metrics, validate the queries against Prometheus, ensure sufficient traffic volume, and review threshold settings. In many cases, the fix involves adjusting thresholds, adding load testing, or fixing genuine application issues in the canary version. Systematic investigation of each component will lead you to the root cause.
