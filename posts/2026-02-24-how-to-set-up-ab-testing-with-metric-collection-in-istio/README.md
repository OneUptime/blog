# How to Set Up A/B Testing with Metric Collection in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, A/B Testing, Metrics, Traffic Splitting

Description: Implement A/B testing with comprehensive metric collection using Istio to compare the performance and user behavior between different service versions.

---

A/B testing at the infrastructure level lets you compare two versions of a service using real production traffic and measure the difference with hard data. Unlike canary deployments where you're looking for regressions, A/B testing is about comparing alternatives. Version A might use one algorithm, version B another, and you want to know which one produces better results. Istio handles the traffic splitting, and your metrics pipeline collects the data you need to make a decision.

This guide covers the full setup: deploying variants, configuring traffic splitting, collecting version-specific metrics, and analyzing results.

## A/B Testing vs Canary Deployment

These are different strategies with different goals:

- **Canary**: "Is the new version at least as good as the old one?" Goal is safety.
- **A/B test**: "Which version produces better outcomes?" Goal is optimization.

In practice, the Istio configuration is similar, but the metrics you collect and how you analyze them differ. A/B tests need business metrics (conversion rate, engagement, revenue), not just operational metrics (error rate, latency).

## Setting Up the A/B Test

Deploy variant A (control) and variant B (treatment):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: product-page-a
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: product-page
      version: variant-a
  template:
    metadata:
      labels:
        app: product-page
        version: variant-a
    spec:
      containers:
      - name: app
        image: product-page:2.1.0-variant-a
        ports:
        - containerPort: 8080
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: product-page-b
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: product-page
      version: variant-b
  template:
    metadata:
      labels:
        app: product-page
        version: variant-b
    spec:
      containers:
      - name: app
        image: product-page:2.1.0-variant-b
        ports:
        - containerPort: 8080
```

Both variants get equal replicas because they'll receive equal traffic (50/50 split typically).

## Service and DestinationRule

```yaml
apiVersion: v1
kind: Service
metadata:
  name: product-page
  namespace: production
spec:
  ports:
  - port: 80
    name: http
    targetPort: 8080
  selector:
    app: product-page
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: product-page
  namespace: production
spec:
  host: product-page.production.svc.cluster.local
  subsets:
  - name: variant-a
    labels:
      version: variant-a
  - name: variant-b
    labels:
      version: variant-b
```

## Configuring 50/50 Traffic Split

For a proper A/B test, you need a clean 50/50 split:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: product-page
  namespace: production
spec:
  hosts:
  - product-page.production.svc.cluster.local
  http:
  - route:
    - destination:
        host: product-page.production.svc.cluster.local
        subset: variant-a
      weight: 50
    - destination:
        host: product-page.production.svc.cluster.local
        subset: variant-b
      weight: 50
```

## Sticky Session for Consistent Experience

In A/B testing, each user should consistently see the same variant throughout the test. Otherwise, you can't measure the effect of the variant on user behavior. Use consistent hash-based routing:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: product-page
  namespace: production
spec:
  host: product-page.production.svc.cluster.local
  trafficPolicy:
    loadBalancer:
      consistentHash:
        httpCookie:
          name: AB_TEST_GROUP
          ttl: 604800s
  subsets:
  - name: variant-a
    labels:
      version: variant-a
  - name: variant-b
    labels:
      version: variant-b
```

Wait, there's a problem. Consistent hashing with DestinationRule applies after the VirtualService weight-based routing, so it handles load balancing within a subset, not the A/B assignment. For true sticky A/B assignment, use a header or cookie set by your application's API gateway:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: product-page
  namespace: production
spec:
  hosts:
  - product-page
  http:
  # Users assigned to variant A
  - match:
    - headers:
        cookie:
          regex: ".*ab_group=a.*"
    route:
    - destination:
        host: product-page
        subset: variant-a
  # Users assigned to variant B
  - match:
    - headers:
        cookie:
          regex: ".*ab_group=b.*"
    route:
    - destination:
        host: product-page
        subset: variant-b
  # New users get randomly assigned (50/50)
  - route:
    - destination:
        host: product-page
        subset: variant-a
      weight: 50
    - destination:
        host: product-page
        subset: variant-b
      weight: 50
```

Your API gateway or frontend assigns the `ab_group` cookie on first visit. After that, the cookie ensures consistent routing.

## Collecting Operational Metrics

Istio automatically collects request metrics per version. These tell you about operational health:

```promql
# Success rate per variant
sum(rate(istio_requests_total{
  destination_service="product-page.production.svc.cluster.local",
  response_code!~"5.*",
  reporter="destination"
}[5m])) by (destination_version)
/
sum(rate(istio_requests_total{
  destination_service="product-page.production.svc.cluster.local",
  reporter="destination"
}[5m])) by (destination_version)

# Latency per variant
histogram_quantile(0.95,
  sum(rate(istio_request_duration_milliseconds_bucket{
    destination_service="product-page.production.svc.cluster.local",
    reporter="destination"
  }[5m])) by (le, destination_version)
)
```

## Collecting Business Metrics

Operational metrics aren't enough for A/B testing. You need business metrics that measure what you're actually trying to optimize. Your application should expose these as Prometheus metrics:

```python
# In your application code
from prometheus_client import Counter, Histogram

# Business metrics labeled with variant
page_views = Counter('page_views_total', 'Page views', ['variant', 'page_type'])
add_to_cart = Counter('add_to_cart_total', 'Add to cart events', ['variant'])
checkout_started = Counter('checkout_started_total', 'Checkout started', ['variant'])
checkout_completed = Counter('checkout_completed_total', 'Checkout completed', ['variant'])
order_value = Histogram('order_value_dollars', 'Order value in dollars', ['variant'],
                         buckets=[10, 25, 50, 100, 250, 500, 1000])
```

Each variant increments the metric with its own label, making comparison easy:

```promql
# Conversion rate per variant
sum(rate(checkout_completed_total[1h])) by (variant)
/
sum(rate(page_views_total[1h])) by (variant)

# Average order value per variant
sum(rate(order_value_dollars_sum[1h])) by (variant)
/
sum(rate(order_value_dollars_count[1h])) by (variant)
```

## Setting Up a Comparison Dashboard

Create a Grafana dashboard with side-by-side panels for each variant:

```json
{
  "panels": [
    {
      "title": "Conversion Rate by Variant",
      "type": "timeseries",
      "targets": [{
        "expr": "sum(rate(checkout_completed_total[1h])) by (variant) / sum(rate(page_views_total[1h])) by (variant) * 100",
        "legendFormat": "{{variant}}"
      }]
    },
    {
      "title": "Average Order Value by Variant",
      "type": "stat",
      "targets": [{
        "expr": "sum(rate(order_value_dollars_sum[24h])) by (variant) / sum(rate(order_value_dollars_count[24h])) by (variant)",
        "legendFormat": "{{variant}}"
      }]
    },
    {
      "title": "P95 Latency by Variant",
      "type": "timeseries",
      "targets": [{
        "expr": "histogram_quantile(0.95, sum(rate(istio_request_duration_milliseconds_bucket{destination_service=\"product-page.production.svc.cluster.local\"}[5m])) by (le, destination_version))",
        "legendFormat": "{{destination_version}}"
      }]
    }
  ]
}
```

## Statistical Significance

Raw metric comparison isn't enough for a valid A/B test. You need to determine if the difference between variants is statistically significant. This typically requires:

1. Enough sample size (thousands of users per variant, minimum)
2. Running the test long enough (at least 1-2 business cycles)
3. Statistical analysis (chi-squared test for rates, t-test for continuous metrics)

You can export metrics from Prometheus for statistical analysis:

```bash
# Export hourly conversion rates for both variants
curl -s 'http://prometheus:9090/api/v1/query_range?query=sum(rate(checkout_completed_total[1h]))%20by%20(variant)%20/%20sum(rate(page_views_total[1h]))%20by%20(variant)&start=2026-02-20T00:00:00Z&end=2026-02-24T00:00:00Z&step=1h' | jq .
```

## Setting Up Alerts for A/B Tests

Alert if either variant has operational issues:

```yaml
groups:
- name: ab-test-alerts
  rules:
  - alert: ABTestVariantDegraded
    expr: |
      sum(rate(istio_requests_total{
        destination_service="product-page.production.svc.cluster.local",
        response_code=~"5.*",
        reporter="destination"
      }[5m])) by (destination_version)
      /
      sum(rate(istio_requests_total{
        destination_service="product-page.production.svc.cluster.local",
        reporter="destination"
      }[5m])) by (destination_version)
      > 0.05
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "A/B test variant {{ $labels.destination_version }} has >5% error rate"
```

## Concluding the Test

When you have enough data and statistical significance:

**If variant B wins:**
```bash
# Route all traffic to variant B
kubectl patch virtualservice product-page -n production --type='json' -p='[
  {"op": "replace", "path": "/spec/http/0", "value": {"route": [{"destination": {"host": "product-page.production.svc.cluster.local", "subset": "variant-b"}, "weight": 100}]}}
]'

# Eventually, make variant B the new baseline and clean up
kubectl delete deployment product-page-a -n production
```

**If no significant difference:**
```bash
# Keep variant A (the simpler version), remove variant B
kubectl patch virtualservice product-page -n production --type='json' -p='[
  {"op": "replace", "path": "/spec/http/0", "value": {"route": [{"destination": {"host": "product-page.production.svc.cluster.local", "subset": "variant-a"}, "weight": 100}]}}
]'

kubectl delete deployment product-page-b -n production
```

A/B testing with Istio gives you the infrastructure to split traffic cleanly between variants, and the metrics pipeline to measure the impact. The traffic splitting is the easy part. The hard part is defining the right business metrics, collecting enough data, and analyzing results with statistical rigor. Istio handles the first part so you can focus on the second.
