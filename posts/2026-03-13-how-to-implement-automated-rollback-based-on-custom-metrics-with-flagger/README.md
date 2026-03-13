# How to Implement Automated Rollback Based on Custom Metrics with Flagger

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flagger, Custom Metrics, Rollback, Kubernetes, Canary Deployments, Prometheus

Description: Learn how to implement automated rollback based on custom Prometheus metrics with Flagger for safer canary deployments.

---

## Introduction

Flagger provides built-in metrics for request success rate and request duration, but production applications often require evaluation against business-specific or application-specific metrics. Custom metrics let you define rollback criteria based on error rates from specific endpoints, business transaction success rates, resource utilization, or any metric available in your monitoring system.

By implementing automated rollback based on custom metrics, you ensure that canary deployments are evaluated against the criteria that matter most to your application. If a new version causes a spike in database errors, an increase in payment failures, or degradation in any custom metric, Flagger will automatically roll back before the issue affects all users. This guide shows you how to define custom metric templates and integrate them into your canary analysis.

## Prerequisites

Before you begin, ensure you have:

- A Kubernetes cluster with Flagger installed and configured with a mesh provider or ingress controller.
- Prometheus installed and scraping metrics from your applications.
- `kubectl` installed and configured.
- An application deployed and managed by a Flagger Canary resource.

## Understanding MetricTemplate Resources

Flagger uses MetricTemplate custom resources to define custom queries against your metrics provider. Each MetricTemplate specifies a PromQL query (or query for other providers) that Flagger evaluates during canary analysis. The query result is compared against the threshold defined in the Canary resource.

```yaml
# metric-template-basic.yaml
# Basic MetricTemplate structure
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: error-rate
  namespace: test
spec:
  provider:
    type: prometheus
    address: http://prometheus.monitoring:9090
  query: |
    100 - sum(rate(http_requests_total{
      status!~"5.*",
      kubernetes_namespace="{{ namespace }}",
      kubernetes_pod_name=~"{{ target }}-[0-9a-zA-Z]+(-[0-9a-zA-Z]+)"
    }[{{ interval }}]))
    /
    sum(rate(http_requests_total{
      kubernetes_namespace="{{ namespace }}",
      kubernetes_pod_name=~"{{ target }}-[0-9a-zA-Z]+(-[0-9a-zA-Z]+)"
    }[{{ interval }}]))
    * 100
```

The template variables `{{ namespace }}`, `{{ target }}`, and `{{ interval }}` are automatically populated by Flagger during evaluation.

## Creating Custom Metric Templates

Here are several practical custom metric templates for common use cases.

### Application Error Rate

Track the percentage of application-level errors returned by your service.

```yaml
# app-error-rate.yaml
# Metric template for application error rate
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: app-error-rate
  namespace: test
spec:
  provider:
    type: prometheus
    address: http://prometheus.monitoring:9090
  query: |
    sum(rate(http_server_requests_total{
      status=~"5.*",
      namespace="{{ namespace }}",
      pod=~"{{ target }}-[0-9a-zA-Z]+(-[0-9a-zA-Z]+)"
    }[{{ interval }}]))
    /
    sum(rate(http_server_requests_total{
      namespace="{{ namespace }}",
      pod=~"{{ target }}-[0-9a-zA-Z]+(-[0-9a-zA-Z]+)"
    }[{{ interval }}]))
    * 100
```

### P99 Latency

Monitor the 99th percentile latency of your application.

```yaml
# p99-latency.yaml
# Metric template for P99 request latency
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: p99-latency
  namespace: test
spec:
  provider:
    type: prometheus
    address: http://prometheus.monitoring:9090
  query: |
    histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket{
      namespace="{{ namespace }}",
      pod=~"{{ target }}-[0-9a-zA-Z]+(-[0-9a-zA-Z]+)"
    }[{{ interval }}])) by (le))
```

### Database Connection Errors

Track database connection failures that might indicate the new version has a database-related bug.

```yaml
# db-error-rate.yaml
# Metric template for database connection errors
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: db-error-rate
  namespace: test
spec:
  provider:
    type: prometheus
    address: http://prometheus.monitoring:9090
  query: |
    sum(rate(db_connections_errors_total{
      namespace="{{ namespace }}",
      pod=~"{{ target }}-[0-9a-zA-Z]+(-[0-9a-zA-Z]+)"
    }[{{ interval }}]))
```

Apply all metric templates.

```bash
kubectl apply -f app-error-rate.yaml
kubectl apply -f p99-latency.yaml
kubectl apply -f db-error-rate.yaml
```

## Referencing Custom Metrics in the Canary Resource

Add the custom metrics to the analysis section of your Canary resource. Each metric reference specifies the template and the threshold that triggers a rollback.

```yaml
# canary.yaml
# Canary resource using custom metric templates for analysis
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: podinfo
  namespace: test
spec:
  provider: istio
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: podinfo
  progressDeadlineSeconds: 120
  service:
    port: 80
    targetPort: 9898
  analysis:
    interval: 1m
    threshold: 3
    maxWeight: 50
    stepWeight: 10
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
      - name: app-error-rate
        templateRef:
          name: app-error-rate
          namespace: test
        thresholdRange:
          max: 1
        interval: 1m
      - name: p99-latency
        templateRef:
          name: p99-latency
          namespace: test
        thresholdRange:
          max: 0.5
        interval: 1m
      - name: db-error-rate
        templateRef:
          name: db-error-rate
          namespace: test
        thresholdRange:
          max: 0
        interval: 1m
```

The `threshold` field in the analysis section specifies how many failed metric checks are allowed before Flagger triggers a rollback. Setting it to 3 means the canary will be rolled back after three consecutive failed checks.

## Using Cross-Namespace Metric Templates

Metric templates can be shared across namespaces. Create a template in a common namespace and reference it from any Canary resource.

```yaml
# shared-metrics/p99-latency.yaml
# Shared metric template in a common namespace
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: p99-latency
  namespace: flagger-metrics
spec:
  provider:
    type: prometheus
    address: http://prometheus.monitoring:9090
  query: |
    histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket{
      namespace="{{ namespace }}",
      pod=~"{{ target }}-[0-9a-zA-Z]+(-[0-9a-zA-Z]+)"
    }[{{ interval }}])) by (le))
```

Reference it from a Canary in a different namespace.

```yaml
    metrics:
      - name: p99-latency
        templateRef:
          name: p99-latency
          namespace: flagger-metrics
        thresholdRange:
          max: 0.5
        interval: 1m
```

## Testing the Rollback Behavior

To verify that automated rollback works with your custom metrics, you can intentionally deploy a version that produces errors.

```bash
# Deploy a version that generates errors
kubectl set image deployment/podinfo \
  podinfo=stefanprodan/podinfo:6.2.0 -n test

# Watch the canary analysis
kubectl get canary podinfo -n test -w

# Check Flagger logs for metric evaluation details
kubectl logs -l app.kubernetes.io/name=flagger -n flagger-system --tail=50
```

Flagger logs will show which metrics passed and which failed at each analysis interval. When the failure threshold is reached, Flagger will scale down the canary and restore the primary.

## Conclusion

Implementing automated rollback based on custom metrics allows you to tailor canary analysis to your application's specific health indicators. By creating MetricTemplate resources for error rates, latency percentiles, database errors, and business metrics, you ensure that Flagger evaluates new versions against the criteria that truly reflect application health. This approach significantly reduces the risk of deploying problematic changes and provides confidence that rollbacks will happen automatically before issues reach all users.
