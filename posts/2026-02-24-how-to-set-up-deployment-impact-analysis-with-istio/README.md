# How to Set Up Deployment Impact Analysis with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Deployments, Monitoring, Canary, Observability

Description: Learn how to use Istio metrics and traffic management to analyze the impact of deployments on service health, latency, and error rates in real time.

---

Deploying new code is always a gamble. You run your tests, review the code, and push to production, but the real question is: did this deployment make things better or worse? Without a structured way to measure deployment impact, you are flying blind.

Istio gives you everything you need to build a solid deployment impact analysis workflow. The sidecar proxies already collect detailed metrics on every request, and the traffic management features let you control exactly how much traffic hits your new version.

## The Core Idea

Deployment impact analysis boils down to comparing metrics before and after a deployment. You want to answer questions like:

- Did error rates go up?
- Did latency increase?
- Did throughput change unexpectedly?
- Are specific endpoints affected more than others?

With Istio, you can get these answers from the metrics that Envoy collects automatically, without adding any instrumentation to your application code.

## Capturing the Baseline

Before you deploy anything, capture your baseline metrics. These are the numbers you will compare against after the deployment.

Create a Prometheus recording rule that captures key service health indicators:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: deployment-baseline-rules
  namespace: monitoring
spec:
  groups:
    - name: deployment-baselines
      interval: 1m
      rules:
        - record: service:error_rate:5m
          expr: |
            sum(rate(istio_requests_total{
              response_code=~"5..",
              reporter="destination"
            }[5m])) by (destination_service_name)
            /
            sum(rate(istio_requests_total{
              reporter="destination"
            }[5m])) by (destination_service_name)

        - record: service:p99_latency:5m
          expr: |
            histogram_quantile(0.99,
              sum(rate(istio_request_duration_milliseconds_bucket{
                reporter="destination"
              }[5m])) by (le, destination_service_name)
            )

        - record: service:request_rate:5m
          expr: |
            sum(rate(istio_requests_total{
              reporter="destination"
            }[5m])) by (destination_service_name)
```

These recording rules give you a smooth time series of error rate, p99 latency, and request rate for every service in the mesh.

## Annotating Deployments

When a deployment happens, mark it in your monitoring system. If you use Grafana, you can create annotations automatically from your CI/CD pipeline:

```bash
curl -X POST http://grafana:3000/api/annotations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GRAFANA_TOKEN" \
  -d '{
    "text": "Deployed my-service v2.3.1",
    "tags": ["deployment", "my-service"],
    "time": '$(date +%s000)'
  }'
```

This creates a vertical marker on your dashboards so you can visually correlate metric changes with deployments.

## Using Canary Deployments for Impact Analysis

The most powerful way to analyze deployment impact is to run old and new versions side by side. Istio makes this straightforward with traffic splitting.

First, deploy both versions:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service-v1
  labels:
    app: my-service
    version: v1
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-service
      version: v1
  template:
    metadata:
      labels:
        app: my-service
        version: v1
    spec:
      containers:
        - name: my-service
          image: my-service:1.0.0
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service-v2
  labels:
    app: my-service
    version: v2
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-service
      version: v2
  template:
    metadata:
      labels:
        app: my-service
        version: v2
    spec:
      containers:
        - name: my-service
          image: my-service:2.0.0
```

Then set up the Istio resources to split traffic:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service
spec:
  host: my-service
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service
spec:
  hosts:
    - my-service
  http:
    - route:
        - destination:
            host: my-service
            subset: v1
          weight: 90
        - destination:
            host: my-service
            subset: v2
          weight: 10
```

Now 10% of traffic goes to v2, and you can directly compare the metrics.

## Comparing Versions Side by Side

With both versions receiving traffic, use these Prometheus queries to compare them:

**Error rate comparison:**

```promql
sum(rate(istio_requests_total{
  destination_service_name="my-service",
  response_code=~"5..",
  reporter="destination"
}[5m])) by (destination_version)
/
sum(rate(istio_requests_total{
  destination_service_name="my-service",
  reporter="destination"
}[5m])) by (destination_version)
```

**Latency comparison:**

```promql
histogram_quantile(0.95,
  sum(rate(istio_request_duration_milliseconds_bucket{
    destination_service_name="my-service",
    reporter="destination"
  }[5m])) by (le, destination_version)
)
```

**Throughput comparison:**

```promql
sum(rate(istio_requests_total{
  destination_service_name="my-service",
  reporter="destination"
}[5m])) by (destination_version)
```

The `destination_version` label comes from the pod labels you set in the deployment, so the data automatically splits by version.

## Automating the Analysis

You can automate the deployment impact analysis with a script that runs after each deployment and checks whether metrics are within acceptable bounds:

```bash
#!/bin/bash
SERVICE="my-service"
VERSION="v2"
PROMETHEUS="http://prometheus:9090"
THRESHOLD_ERROR_RATE=0.01
THRESHOLD_P99_MS=500

# Wait for enough data to accumulate
sleep 300

# Check error rate for new version
ERROR_RATE=$(curl -s "$PROMETHEUS/api/v1/query" \
  --data-urlencode "query=sum(rate(istio_requests_total{destination_service_name=\"$SERVICE\",destination_version=\"$VERSION\",response_code=~\"5..\",reporter=\"destination\"}[5m])) / sum(rate(istio_requests_total{destination_service_name=\"$SERVICE\",destination_version=\"$VERSION\",reporter=\"destination\"}[5m]))" \
  | jq -r '.data.result[0].value[1]')

# Check p99 latency for new version
P99=$(curl -s "$PROMETHEUS/api/v1/query" \
  --data-urlencode "query=histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{destination_service_name=\"$SERVICE\",destination_version=\"$VERSION\",reporter=\"destination\"}[5m])) by (le))" \
  | jq -r '.data.result[0].value[1]')

echo "Error rate: $ERROR_RATE (threshold: $THRESHOLD_ERROR_RATE)"
echo "P99 latency: ${P99}ms (threshold: ${THRESHOLD_P99_MS}ms)"

if (( $(echo "$ERROR_RATE > $THRESHOLD_ERROR_RATE" | bc -l) )); then
  echo "FAIL: Error rate exceeds threshold"
  exit 1
fi

if (( $(echo "$P99 > $THRESHOLD_P99_MS" | bc -l) )); then
  echo "FAIL: P99 latency exceeds threshold"
  exit 1
fi

echo "PASS: Deployment metrics look healthy"
```

## Progressive Traffic Shifting

If the initial analysis looks good, gradually increase traffic to the new version:

```bash
for weight in 25 50 75 100; do
  kubectl patch virtualservice my-service --type merge -p "{
    \"spec\": {
      \"http\": [{
        \"route\": [
          {\"destination\": {\"host\": \"my-service\", \"subset\": \"v1\"}, \"weight\": $((100 - weight))},
          {\"destination\": {\"host\": \"my-service\", \"subset\": \"v2\"}, \"weight\": $weight}
        ]
      }]
    }
  }"
  echo "Traffic at ${weight}% to v2, waiting 5 minutes..."
  sleep 300
  # Run analysis script at each step
done
```

## Building a Deployment Impact Dashboard

Put together a Grafana dashboard specifically for deployment analysis. Include these panels:

1. **Error Rate by Version** - Stacked area chart comparing v1 and v2 error rates
2. **Latency by Version** - Overlaid line charts for p50, p95, p99 per version
3. **Request Volume by Version** - Shows traffic split is working as expected
4. **Deployment Annotations** - Vertical markers showing when deployments happened
5. **Success Rate Delta** - The difference in success rate between versions

The delta panel is particularly useful. If v2's error rate is consistently higher than v1's, you know the new code introduced a regression, and you can roll back before it affects all your users.

This approach turns deployments from a hope-for-the-best exercise into a data-driven process. You know exactly what changed, how it affected your users, and whether you should keep going or roll back.
