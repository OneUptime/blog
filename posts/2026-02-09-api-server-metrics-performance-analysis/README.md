# How to Query Kubernetes API Server Metrics for Performance Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Metrics, Performance

Description: Learn how to query and analyze Kubernetes API server metrics to diagnose performance bottlenecks, identify slow endpoints, and optimize your cluster for better scalability and reliability.

---

The Kubernetes API server exposes detailed metrics about its performance, request patterns, and resource usage. By analyzing these metrics, you can identify bottlenecks, optimize controller behavior, and ensure your cluster operates efficiently at scale.

## Accessing API Server Metrics

The API server exposes metrics at the `/metrics` endpoint:

```bash
# Access metrics through kubectl
kubectl get --raw /metrics

# The output is in Prometheus format
# Filter for specific metrics
kubectl get --raw /metrics | grep apiserver_request
```

For better readability, pipe through grep or redirect to a file:

```bash
# Save all metrics to a file
kubectl get --raw /metrics > apiserver-metrics.txt

# View specific metric families
kubectl get --raw /metrics | grep -E "^apiserver_request_total"
```

## Key Metrics to Monitor

**Request Count and Rate**:

```bash
# Total requests by resource, verb, and status
kubectl get --raw /metrics | grep apiserver_request_total

# Example output:
# apiserver_request_total{code="200",resource="pods",verb="list"} 1234
# apiserver_request_total{code="404",resource="deployments",verb="get"} 45
```

This metric shows how many requests the API server has processed, broken down by:
- `resource`: pods, deployments, services, etc.
- `verb`: get, list, watch, create, update, delete, patch
- `code`: HTTP status code (200, 404, 500, etc.)

**Request Duration**:

```bash
# Request latency histogram
kubectl get --raw /metrics | grep apiserver_request_duration_seconds

# Example output:
# apiserver_request_duration_seconds_bucket{resource="pods",verb="list",le="0.1"} 500
# apiserver_request_duration_seconds_bucket{resource="pods",verb="list",le="0.5"} 950
# apiserver_request_duration_seconds_sum{resource="pods",verb="list"} 125.5
# apiserver_request_duration_seconds_count{resource="pods",verb="list"} 1000
```

This histogram shows request latency distribution, helping you identify slow operations.

**Inflight Requests**:

```bash
# Current number of inflight requests
kubectl get --raw /metrics | grep apiserver_current_inflight_requests

# Example output:
# apiserver_current_inflight_requests{kind="mutating"} 5
# apiserver_current_inflight_requests{kind="readOnly"} 120
```

This shows how many requests are currently being processed, split between mutating and read-only operations.

## Analyzing Request Patterns

To find the most common requests:

```bash
# Extract and sort request counts
kubectl get --raw /metrics | \
    grep '^apiserver_request_total' | \
    sort -t= -k2 -nr | \
    head -20

# This shows the top 20 most common requests
```

Look for patterns like:
- Excessive list operations on large resource types
- High error rates for specific resources
- Unusual request patterns from specific clients

## Identifying Slow Endpoints

Check which API endpoints have the highest latency:

```bash
# Get p99 latency for different operations
kubectl get --raw /metrics | \
    grep 'apiserver_request_duration_seconds' | \
    grep 'quantile="0.99"'

# Look for operations with high p99 latency
# Values over 1 second indicate performance issues
```

Create a script to parse and analyze latency:

```bash
#!/bin/bash

echo "API Server Latency Analysis (p99)"
echo "=================================="

kubectl get --raw /metrics | \
    grep 'apiserver_request_duration_seconds{.*quantile="0.99"' | \
    awk -F'[{},]' '{
        for (i=2; i<=NF; i++) {
            if ($i ~ /resource=/) resource = $i
            if ($i ~ /verb=/) verb = $i
        }
        print $NF, resource, verb
    }' | \
    sort -rn | \
    head -20

echo ""
echo "Operations taking > 1s at p99:"
kubectl get --raw /metrics | \
    grep 'apiserver_request_duration_seconds{.*quantile="0.99"' | \
    awk '$NF > 1' | \
    wc -l
```

## Monitoring API Priority and Fairness

Check APF metrics to see how requests are being prioritized:

```bash
# Current requests in queue by priority level
kubectl get --raw /metrics | grep apiserver_flowcontrol_current_inqueue_requests

# Rejected requests by priority level
kubectl get --raw /metrics | grep apiserver_flowcontrol_rejected_requests_total

# Request execution by priority level
kubectl get --raw /metrics | grep apiserver_flowcontrol_request_execution_seconds
```

High rejection rates indicate APF throttling, which might require adjusting priority level configurations.

## Watch Connection Metrics

Monitor watch performance:

```bash
# Number of active watch connections
kubectl get --raw /metrics | grep apiserver_registered_watchers

# Watch events sent
kubectl get --raw /metrics | grep apiserver_watch_events_total

# Watch terminations
kubectl get --raw /metrics | grep apiserver_watch_terminated_total
```

Many watch connections can strain the API server. Look for controllers creating excessive watches.

## Etcd Performance Metrics

The API server exposes metrics about its etcd interactions:

```bash
# Etcd request duration
kubectl get --raw /metrics | grep etcd_request_duration_seconds

# Etcd request counts
kubectl get --raw /metrics | grep etcd_requests_total

# Look for slow etcd operations
kubectl get --raw /metrics | \
    grep 'etcd_request_duration_seconds.*quantile="0.99"' | \
    awk '$NF > 0.1'
```

Slow etcd operations directly impact API server latency.

## Admission Control Metrics

Check admission webhook performance:

```bash
# Webhook duration
kubectl get --raw /metrics | grep apiserver_admission_webhook_admission_duration_seconds

# Webhook rejections
kubectl get --raw /metrics | grep apiserver_admission_webhook_rejection_count
```

Slow webhooks add latency to every create/update request they intercept.

## Client-Side Metrics

Identify which clients are generating the most load:

```bash
# Requests by client (user agent)
kubectl get --raw /metrics | grep 'apiserver_request_total.*client='

# This shows which controllers or tools are making the most requests
```

Look for:
- Controllers with excessive list/watch operations
- CI/CD systems hammering the API
- Misconfigured clients polling too frequently

## Creating a Monitoring Dashboard

For ongoing monitoring, export metrics to Prometheus:

```yaml
# ServiceMonitor for API server (if using Prometheus Operator)
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: kube-apiserver
  namespace: kube-system
spec:
  endpoints:
  - port: https
    scheme: https
    tlsConfig:
      caFile: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
      serverName: kubernetes
    bearerTokenFile: /var/run/secrets/kubernetes.io/serviceaccount/token
    interval: 30s
  selector:
    matchLabels:
      component: apiserver
      provider: kubernetes
```

Then create Grafana dashboards tracking:
- Request rate by resource and verb
- p50, p95, p99 latency
- Error rate by status code
- Inflight requests
- APF rejection rate
- Watch connection count

## Diagnosing Common Issues

**High list latency**:

```bash
# Check list operation latency
kubectl get --raw /metrics | \
    grep 'apiserver_request_duration_seconds.*verb="list".*quantile="0.99"' | \
    sort -t= -k2 -rn | head -10

# Slow lists might indicate:
# - Large resource counts
# - Missing indexes
# - Slow etcd
```

**High watch churn**:

```bash
# Check watch termination rate
kubectl get --raw /metrics | grep apiserver_watch_terminated_total

# Frequent terminations might indicate:
# - Network issues
# - Client bugs
# - Resource version expiration
```

**APF throttling**:

```bash
# Check rejection counts
kubectl get --raw /metrics | grep apiserver_flowcontrol_rejected_requests_total

# High rejections might require:
# - Adjusting priority level concurrency
# - Optimizing client request patterns
# - Investigating specific flow schemas
```

## Performance Tuning Based on Metrics

**Reduce list operations**:

If you see excessive list calls:

```bash
# Identify clients doing frequent lists
kubectl get --raw /metrics | \
    grep 'apiserver_request_total.*verb="list"' | \
    grep -o 'client="[^"]*"' | \
    sort | uniq -c | sort -rn
```

Solution: Use watches with informers instead of polling with lists.

**Optimize watch usage**:

If watch count is high:

```bash
kubectl get --raw /metrics | grep apiserver_registered_watchers
```

Solution: Use shared informers to reduce watch connections.

**Address slow webhooks**:

```bash
# Find slow webhooks
kubectl get --raw /metrics | \
    grep 'apiserver_admission_webhook_admission_duration_seconds.*quantile="0.99"' | \
    awk '$NF > 0.5'
```

Solution: Optimize webhook performance or increase timeout.

## Automating Metrics Collection

Create a monitoring script:

```bash
#!/bin/bash

INTERVAL=60

while true; do
    TIMESTAMP=$(date +%s)

    # Collect key metrics
    TOTAL_REQUESTS=$(kubectl get --raw /metrics | \
        grep '^apiserver_request_total' | \
        awk '{sum+=$NF} END {print sum}')

    INFLIGHT_MUTATING=$(kubectl get --raw /metrics | \
        grep 'apiserver_current_inflight_requests{kind="mutating"}' | \
        awk '{print $NF}')

    INFLIGHT_READONLY=$(kubectl get --raw /metrics | \
        grep 'apiserver_current_inflight_requests{kind="readOnly"}' | \
        awk '{print $NF}')

    P99_LATENCY=$(kubectl get --raw /metrics | \
        grep 'apiserver_request_duration_seconds.*quantile="0.99"' | \
        awk '{sum+=$NF; count++} END {print sum/count}')

    # Log metrics
    echo "$TIMESTAMP,$TOTAL_REQUESTS,$INFLIGHT_MUTATING,$INFLIGHT_READONLY,$P99_LATENCY" >> api-metrics.csv

    sleep $INTERVAL
done
```

## Best Practices

1. **Monitor continuously**: Set up automated collection and alerting

2. **Establish baselines**: Know what normal looks like for your cluster

3. **Alert on anomalies**: p99 latency spikes, high error rates, APF rejections

4. **Correlate with events**: Match metric changes to cluster events

5. **Track over time**: Monitor trends, not just point-in-time values

6. **Analyze by client**: Identify which clients cause the most load

7. **Review regularly**: Schedule periodic performance reviews

## Conclusion

Kubernetes API server metrics provide deep visibility into cluster performance and health. By regularly analyzing request patterns, latencies, and resource usage, you can identify bottlenecks, optimize controller behavior, and ensure your cluster scales efficiently. Set up continuous monitoring, establish baselines, and use these metrics to guide performance tuning decisions. Whether you are debugging a specific issue or proactively optimizing, API server metrics are your most valuable tool for understanding cluster behavior at scale.
