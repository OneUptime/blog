# How to Debug Flagger Canary with Missing Metrics

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flagger, Debugging, Metrics, Prometheus, Kubernetes

Description: Learn how to diagnose and resolve missing metrics issues that prevent Flagger canary analysis from proceeding.

---

## Introduction

Flagger relies on metrics from a monitoring system like Prometheus to make promotion or rollback decisions during canary analysis. When metrics are missing, Flagger cannot evaluate the health of the canary version, causing the deployment to either stall or fail. Missing metrics is one of the most common issues encountered when setting up Flagger for the first time or when modifying the metrics pipeline.

This guide provides a systematic approach to diagnosing and resolving missing metrics in Flagger canary deployments. You will learn how to verify your metrics pipeline from the application level through Prometheus to Flagger's metric evaluation.

## Prerequisites

Before debugging, ensure you have:

- `kubectl` access to the cluster.
- Access to Prometheus (or your configured metrics provider).
- Familiarity with the metrics configured in your Canary resource.

## Step 1: Identify the Missing Metrics

Start by checking Flagger logs for metric-related errors.

```bash
# Check Flagger logs for metric errors
kubectl logs -l app.kubernetes.io/name=flagger \
  -n <flagger-namespace> --tail=100 | grep -i "metric\|no values"
```

Flagger typically logs messages like "no values found for metric" or "metric query failed" when it cannot retrieve data. Note which specific metrics are failing.

## Step 2: Verify the Metrics Server Configuration

Ensure Flagger is configured to reach your metrics server.

```bash
# Check Flagger deployment for metrics server configuration
kubectl get deployment flagger -n <flagger-namespace> -o yaml | grep -A 2 metricsServer
```

The metrics server URL must be accessible from within the cluster. Test connectivity.

```bash
# Test Prometheus connectivity
kubectl run curl-test --image=curlimages/curl --rm -it --restart=Never -- \
  curl -s "http://prometheus.monitoring:9090/api/v1/query?query=up"
```

If the connection fails, verify the Prometheus service name, namespace, and port.

## Step 3: Verify the Application Is Exposing Metrics

Check that your application pods are exposing Prometheus metrics on the expected port and path.

```bash
# Port-forward to a canary pod and check the metrics endpoint
kubectl port-forward <canary-pod> -n <namespace> 9898:9898

# In another terminal, fetch the metrics
curl http://localhost:9898/metrics
```

Verify that the metrics your Canary resource references actually exist in the output. For built-in Flagger metrics, the required metrics depend on the mesh or ingress provider being used.

## Step 4: Verify Prometheus Scrape Configuration

Prometheus needs to be scraping metrics from your application pods. Check for proper annotations or ServiceMonitor configuration.

```yaml
# Ensure pods have Prometheus scrape annotations
apiVersion: apps/v1
kind: Deployment
metadata:
  name: podinfo
  namespace: test
spec:
  template:
    metadata:
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9898"
        prometheus.io/path: "/metrics"
```

If you use ServiceMonitor resources with the Prometheus Operator, verify the ServiceMonitor exists and matches your service.

```bash
# Check for ServiceMonitor resources
kubectl get servicemonitor -n <namespace>

# Verify the ServiceMonitor selector matches your service
kubectl get servicemonitor <name> -n <namespace> -o yaml
```

## Step 5: Query Prometheus Directly

Test the exact PromQL queries that Flagger is running. For built-in metrics, the queries depend on the mesh provider.

For Istio:

```bash
# Test Istio request success rate query
curl -s 'http://localhost:9090/api/v1/query' \
  --data-urlencode 'query=sum(rate(istio_requests_total{reporter="destination",destination_workload_namespace="test",destination_workload="podinfo-canary",response_code!~"5.*"}[1m]))/sum(rate(istio_requests_total{reporter="destination",destination_workload_namespace="test",destination_workload="podinfo-canary"}[1m]))*100'
```

For NGINX:

```bash
# Test NGINX request success rate query
curl -s 'http://localhost:9090/api/v1/query' \
  --data-urlencode 'query=sum(rate(nginx_ingress_controller_requests{namespace="test",ingress="podinfo-canary",status!~"5.*"}[1m]))/sum(rate(nginx_ingress_controller_requests{namespace="test",ingress="podinfo-canary"}[1m]))*100'
```

If the query returns empty results, the metric data is not being collected. Check that traffic is reaching the canary and that the metric labels match.

## Step 6: Check for Label Mismatches

A frequent cause of missing metrics is a mismatch between the labels in your PromQL query and the actual labels on the metrics.

```bash
# List available label values for a metric
curl -s 'http://localhost:9090/api/v1/label/namespace/values'

# Check the actual labels on a metric
curl -s 'http://localhost:9090/api/v1/query' \
  --data-urlencode 'query=http_requests_total{namespace="test"}'
```

Pay attention to label names like `namespace` versus `kubernetes_namespace`, `pod` versus `pod_name`, and other variations that differ between metric exporters.

## Step 7: Verify Custom MetricTemplate Queries

If you are using custom MetricTemplate resources, verify the query syntax and template variable substitution.

```yaml
# Example MetricTemplate
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: custom-error-rate
  namespace: test
spec:
  provider:
    type: prometheus
    address: http://prometheus.monitoring:9090
  query: |
    sum(rate(http_requests_total{
      status=~"5.*",
      namespace="{{ namespace }}",
      pod=~"{{ target }}-[0-9a-zA-Z]+(-[0-9a-zA-Z]+)"
    }[{{ interval }}]))
```

Test the query by substituting the template variables manually and running it against Prometheus.

```bash
# Substitute variables and test
curl -s 'http://localhost:9090/api/v1/query' \
  --data-urlencode 'query=sum(rate(http_requests_total{status=~"5.*",namespace="test",pod=~"podinfo-canary-[0-9a-zA-Z]+(-[0-9a-zA-Z]+)"}[1m]))'
```

## Step 8: Ensure Traffic Is Reaching the Canary

Metrics are only generated when traffic flows through the canary. If no traffic reaches the canary pods, all metric queries will return empty results.

```bash
# Check if the canary service has endpoints
kubectl get endpoints <app-name>-canary -n <namespace>

# Send test traffic to the canary
kubectl run curl-test --image=curlimages/curl --rm -it --restart=Never -- \
  curl -s http://<app-name>-canary.<namespace>/
```

If the canary service has no endpoints or is unreachable, check the service selector labels and pod readiness.

## Step 9: Check for Time Range Issues

Prometheus metrics have a retention period and a scrape interval. If you are querying with a range that is shorter than the scrape interval, results may be empty.

```yaml
# Ensure the analysis interval is longer than the Prometheus scrape interval
  analysis:
    interval: 1m  # Should be >= Prometheus scrape interval
    metrics:
      - name: request-success-rate
        interval: 1m  # Range for the rate() function
```

If your Prometheus scrape interval is 30 seconds, using a 1-minute range in the rate function should be sufficient. If the scrape interval is 1 minute, consider using a 2-minute range.

## Conclusion

Missing metrics in Flagger canary analysis can be traced to issues at multiple levels: the application not exposing metrics, Prometheus not scraping the right targets, label mismatches in queries, insufficient traffic to the canary, or connectivity issues between Flagger and Prometheus. By systematically checking each level of the metrics pipeline, you can identify where the data flow is breaking and resolve the issue. Once metrics are flowing correctly, Flagger can perform its analysis and make informed promotion or rollback decisions.
