# How to Set Up Business Metrics with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Business Metrics, Observability, Prometheus, Custom Metrics

Description: How to derive business metrics from Istio's traffic data by extracting dimensions from headers, paths, and response codes to track orders, API usage, revenue-impacting errors, and more.

---

Technical metrics like request rates and latency are important, but business stakeholders care about different things. How many orders were placed? Which API endpoints are customers using most? How many payments failed? Istio sits in front of every request, which makes it a surprisingly good source for business metrics, and you do not have to change any application code to get them.

## Business Metrics from Traffic Data

The idea is simple: HTTP traffic carries business information in headers, paths, query parameters, and response codes. By extracting these into metric dimensions, you can turn Istio's traffic metrics into business metrics.

For example:
- A POST to `/api/v1/orders` with a 201 response = a successful order
- A POST to `/api/v1/payments` with a 500 response = a failed payment
- Requests with `x-customer-tier: enterprise` = enterprise customer traffic
- Requests to `/api/v1/search` = search usage

## Tracking API Endpoint Usage

Create metric dimensions that map request paths to business operations:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: business-metrics
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  metrics:
  - providers:
    - name: prometheus
    overrides:
    - match:
        metric: REQUEST_COUNT
      tagOverrides:
        business_operation:
          operation: UPSERT
          value: |
            (request.method == 'POST' && request.url_path.startsWith('/api/v1/orders')) ? 'create_order' :
            (request.method == 'POST' && request.url_path.startsWith('/api/v1/payments')) ? 'process_payment' :
            (request.method == 'GET' && request.url_path.startsWith('/api/v1/search')) ? 'search' :
            (request.method == 'POST' && request.url_path.startsWith('/api/v1/users')) ? 'create_user' :
            (request.method == 'POST' && request.url_path.startsWith('/api/v1/auth/login')) ? 'login' :
            'other'
        customer_tier:
          operation: UPSERT
          value: "request.headers['x-customer-tier'] | 'standard'"
```

Now query business metrics:

```promql
# Orders per minute
sum(rate(istio_requests_total{
  destination_service_name="my-api",
  business_operation="create_order",
  response_code="201",
  reporter="destination"
}[5m])) * 60

# Failed payments per minute
sum(rate(istio_requests_total{
  destination_service_name="my-api",
  business_operation="process_payment",
  response_code=~"5..",
  reporter="destination"
}[5m])) * 60

# Search requests per minute
sum(rate(istio_requests_total{
  destination_service_name="my-api",
  business_operation="search",
  reporter="destination"
}[5m])) * 60

# Logins per minute
sum(rate(istio_requests_total{
  destination_service_name="my-api",
  business_operation="login",
  response_code=~"2..",
  reporter="destination"
}[5m])) * 60
```

## Customer Tier Metrics

Track how different customer segments use your API:

```promql
# Request rate by customer tier
sum(rate(istio_requests_total{
  destination_service_name="my-api",
  reporter="destination"
}[5m])) by (customer_tier)

# Error rate by customer tier
sum(rate(istio_requests_total{
  destination_service_name="my-api",
  response_code=~"5..",
  reporter="destination"
}[5m])) by (customer_tier)
/
sum(rate(istio_requests_total{
  destination_service_name="my-api",
  reporter="destination"
}[5m])) by (customer_tier)

# Latency by customer tier (are premium customers getting faster responses?)
histogram_quantile(0.95,
  sum(rate(istio_request_duration_milliseconds_bucket{
    destination_service_name="my-api",
    reporter="destination"
  }[5m])) by (customer_tier, le)
)
```

## API Versioning Metrics

If your API supports multiple versions, track adoption:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: api-version-metrics
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  metrics:
  - providers:
    - name: prometheus
    overrides:
    - match:
        metric: REQUEST_COUNT
      tagOverrides:
        api_version:
          operation: UPSERT
          value: |
            request.url_path.startsWith('/api/v1/') ? 'v1' :
            request.url_path.startsWith('/api/v2/') ? 'v2' :
            request.url_path.startsWith('/api/v3/') ? 'v3' :
            'unknown'
```

```promql
# Traffic distribution across API versions
sum(rate(istio_requests_total{
  destination_service_name="my-api",
  reporter="destination"
}[5m])) by (api_version)
/
sum(rate(istio_requests_total{
  destination_service_name="my-api",
  reporter="destination"
}[5m]))

# Are v1 users seeing more errors?
sum(rate(istio_requests_total{
  destination_service_name="my-api",
  api_version="v1",
  response_code=~"5..",
  reporter="destination"
}[5m]))
```

## Revenue-Impact Metrics

Track errors that directly impact revenue:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: business-alerts
  namespace: monitoring
spec:
  groups:
  - name: business-metrics
    rules:
    # Recording rule for orders per hour
    - record: business:orders_per_hour:rate
      expr: |
        sum(rate(istio_requests_total{
          business_operation="create_order",
          response_code="201",
          reporter="destination"
        }[5m])) * 3600

    # Recording rule for payment failures
    - record: business:payment_failures_per_hour:rate
      expr: |
        sum(rate(istio_requests_total{
          business_operation="process_payment",
          response_code=~"5..",
          reporter="destination"
        }[5m])) * 3600

    # Alert: Order rate dropped significantly
    - alert: OrderRateDrop
      expr: |
        business:orders_per_hour:rate
        < 0.5 * (business:orders_per_hour:rate offset 1d)
      for: 15m
      labels:
        severity: critical
        team: business
      annotations:
        summary: "Order rate dropped more than 50% compared to yesterday"
        description: "Current: {{ $value }} orders/hour"

    # Alert: Payment failures spiking
    - alert: PaymentFailures
      expr: |
        business:payment_failures_per_hour:rate > 10
      for: 5m
      labels:
        severity: critical
        team: payments
      annotations:
        summary: "More than 10 payment failures per hour"
```

## Business Dashboard

Build a Grafana dashboard that non-technical stakeholders can understand:

```json
{
  "dashboard": {
    "title": "Business Metrics",
    "panels": [
      {
        "title": "Orders Per Hour",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(rate(istio_requests_total{business_operation=\"create_order\", response_code=\"201\", reporter=\"destination\"}[5m])) * 3600",
            "legendFormat": "Orders/hr"
          }
        ]
      },
      {
        "title": "Payment Success Rate",
        "type": "gauge",
        "targets": [
          {
            "expr": "sum(rate(istio_requests_total{business_operation=\"process_payment\", response_code=~\"2..\", reporter=\"destination\"}[5m])) / sum(rate(istio_requests_total{business_operation=\"process_payment\", reporter=\"destination\"}[5m])) * 100",
            "legendFormat": "Success %"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "steps": [
                {"color": "red", "value": 95},
                {"color": "yellow", "value": 98},
                {"color": "green", "value": 99.5}
              ]
            },
            "min": 90,
            "max": 100
          }
        }
      },
      {
        "title": "Traffic by Customer Tier",
        "type": "piechart",
        "targets": [
          {
            "expr": "sum(rate(istio_requests_total{destination_service_name=\"my-api\", reporter=\"destination\"}[5m])) by (customer_tier)",
            "legendFormat": "{{customer_tier}}"
          }
        ]
      },
      {
        "title": "API Version Adoption",
        "type": "timeseries",
        "targets": [
          {
            "expr": "sum(rate(istio_requests_total{destination_service_name=\"my-api\", reporter=\"destination\"}[1h])) by (api_version)",
            "legendFormat": "{{api_version}}"
          }
        ]
      }
    ]
  }
}
```

## Combining with Application Metrics

Istio business metrics are approximations. They work well for counting requests by type but cannot capture the dollar value of an order or the number of items in a cart. For richer business metrics, combine Istio metrics with application-level metrics:

```promql
# Istio tracks order count
# Application tracks order value
# Combined: average order value trend

# From application metrics
avg(order_total_amount{service="my-api"})

# From Istio: order success rate
sum(rate(istio_requests_total{business_operation="create_order", response_code="201"}[5m]))
/
sum(rate(istio_requests_total{business_operation="create_order"}[5m]))
```

## Limitations

Business metrics from Istio have some constraints:

1. You can only extract information from HTTP headers, paths, and response codes. Request body content is not available in metric dimensions.
2. Each new dimension increases metric cardinality. Keep the number of distinct values per dimension low.
3. Path-based business operation mapping is fragile. If your API paths change, your metric dimensions break.
4. Istio metrics are eventually consistent. There is a small lag between a request and when the metric appears in Prometheus.

Despite these limitations, deriving business metrics from Istio gives you useful visibility at zero application code cost. Start with a few high-value operations like orders and payments, validate the numbers against your application database, and expand from there.
