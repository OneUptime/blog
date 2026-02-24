# How to Configure Istio for API Composition Pattern

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, API Composition, Microservices, Service Mesh, Traffic Management

Description: Implement the API composition pattern with Istio to aggregate data from multiple microservices into unified API responses with proper timeout and routing configuration.

---

The API composition pattern solves a common microservices problem: a single client request needs data from multiple services. When you split a monolith into microservices, data that used to be in one database query now requires calling three, five, or ten separate services. The API composer (or aggregator) makes those calls, combines the results, and returns a unified response to the client.

Istio supports this pattern by managing the traffic between the composer and the downstream services, providing timeout control, retry policies, and circuit breaking that keep the composition fast and reliable even when individual services have issues.

## The Problem API Composition Solves

Imagine a product detail page. It needs:

- Product info from the product service
- Price from the pricing service
- Reviews from the review service
- Inventory status from the inventory service
- Recommendations from the recommendation service

Without a composer, the client makes 5 separate API calls. On mobile networks, that is 5 round trips, 5 connection setups, and 5 chances for failure. The API composer makes one call from the client and fans out internally.

## Deploying the Composer Service

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: product-composer
  namespace: production
spec:
  replicas: 4
  selector:
    matchLabels:
      app: product-composer
  template:
    metadata:
      labels:
        app: product-composer
    spec:
      containers:
      - name: composer
        image: my-registry/product-composer:latest
        ports:
        - containerPort: 8080
        resources:
          requests:
            cpu: "300m"
            memory: "256Mi"
---
apiVersion: v1
kind: Service
metadata:
  name: product-composer
  namespace: production
spec:
  selector:
    app: product-composer
  ports:
  - port: 80
    targetPort: 8080
```

## Routing External Traffic to the Composer

The composer is the entry point for product detail requests:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: product-api
  namespace: production
spec:
  hosts:
  - api.example.com
  gateways:
  - api-gateway
  http:
  - match:
    - uri:
        prefix: /api/products
      method:
        exact: GET
    route:
    - destination:
        host: product-composer
        port:
          number: 80
    timeout: 8s
```

The 8-second timeout is the total allowed time for the entire composition. The composer needs to call multiple services and combine results within this window.

## Configuring Downstream Service Timeouts

The composer calls five services. Each one needs its own timeout that fits within the overall 8-second budget. Since some calls happen in parallel, you do not need each timeout to be less than 8 seconds, but you do need the critical path to complete within 8 seconds:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: product-service
  namespace: production
spec:
  hosts:
  - product-service
  http:
  - match:
    - sourceLabels:
        app: product-composer
    route:
    - destination:
        host: product-service
    timeout: 3s
    retries:
      attempts: 1
      perTryTimeout: 2s
      retryOn: 5xx,connect-failure
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: pricing-service
  namespace: production
spec:
  hosts:
  - pricing-service
  http:
  - match:
    - sourceLabels:
        app: product-composer
    route:
    - destination:
        host: pricing-service
    timeout: 2s
    retries:
      attempts: 1
      perTryTimeout: 1s
      retryOn: 5xx,connect-failure
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: review-service
  namespace: production
spec:
  hosts:
  - review-service
  http:
  - match:
    - sourceLabels:
        app: product-composer
    route:
    - destination:
        host: review-service
    timeout: 3s
    retries:
      attempts: 1
      perTryTimeout: 2s
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: recommendation-service
  namespace: production
spec:
  hosts:
  - recommendation-service
  http:
  - match:
    - sourceLabels:
        app: product-composer
    route:
    - destination:
        host: recommendation-service
    timeout: 2s
    retries:
      attempts: 0
```

Notice the recommendation service gets zero retries. Recommendations are a nice-to-have - if they fail, the product page still works. The product service and pricing service get retries because they are essential.

## The Composer's Parallel Call Strategy

The composer should call services in parallel to minimize latency. Here is what the code looks like:

```python
import asyncio
import aiohttp
from flask import Flask, jsonify

app = Flask(__name__)

SERVICES = {
    'product': 'http://product-service/api/products/{product_id}',
    'pricing': 'http://pricing-service/api/prices/{product_id}',
    'reviews': 'http://review-service/api/reviews/{product_id}',
    'inventory': 'http://inventory-service/api/inventory/{product_id}',
    'recommendations': 'http://recommendation-service/api/recommendations/{product_id}',
}

# Essential services - composition fails if these fail
ESSENTIAL = {'product', 'pricing', 'inventory'}

async def fetch_service(session, name, url):
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=5)) as resp:
            if resp.status == 200:
                return name, await resp.json()
            return name, None
    except Exception:
        return name, None

async def compose_product(product_id):
    async with aiohttp.ClientSession() as session:
        tasks = [
            fetch_service(session, name, url.format(product_id=product_id))
            for name, url in SERVICES.items()
        ]
        results = dict(await asyncio.gather(*tasks))

    # Check essential services
    for svc in ESSENTIAL:
        if results[svc] is None:
            return None  # Cannot compose without essential data

    return {
        'product': results['product'],
        'price': results['pricing'],
        'reviews': results.get('reviews', []),
        'inventory': results.get('inventory', {'status': 'unknown'}),
        'recommendations': results.get('recommendations', []),
    }
```

The composer calls all five services in parallel. If an essential service fails, the whole composition fails. If a non-essential service (reviews, recommendations) fails, the response includes empty defaults.

## Circuit Breaking for Downstream Services

Protect each downstream service with circuit breaking:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: product-service
  namespace: production
spec:
  host: product-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 100
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 15s
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: recommendation-service
  namespace: production
spec:
  host: recommendation-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 30
      http:
        http1MaxPendingRequests: 15
        http2MaxRequests: 30
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
```

Essential services get tight circuit breaking (3 errors before ejection) with fast recovery (15 seconds). Non-essential services get more lenient settings (5 errors, 30-second ejection) because their failure is tolerable.

## Handling Partial Failures

The composer should gracefully handle partial failures. Istio's timeouts and circuit breaking cause fast failures, and the composer fills in defaults:

```python
@app.route('/api/products/<product_id>')
def get_product(product_id):
    result = asyncio.run(compose_product(product_id))

    if result is None:
        return jsonify({'error': 'Product not available'}), 503

    response = {
        'id': result['product']['id'],
        'name': result['product']['name'],
        'description': result['product']['description'],
        'price': result['price']['amount'] if result['price'] else None,
        'currency': result['price']['currency'] if result['price'] else 'USD',
        'reviews': result['reviews'] if result['reviews'] else [],
        'review_count': len(result['reviews']) if result['reviews'] else 0,
        'in_stock': result['inventory'].get('available', False),
        'recommendations': result['recommendations'] if result['recommendations'] else [],
    }

    return jsonify(response)
```

## Caching at the Composition Level

For read-heavy compositions, add caching in the composer. But Istio can also help by setting response cache headers:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: product-api
  namespace: production
spec:
  hosts:
  - api.example.com
  gateways:
  - api-gateway
  http:
  - match:
    - uri:
        prefix: /api/products
      method:
        exact: GET
    route:
    - destination:
        host: product-composer
    headers:
      response:
        set:
          cache-control: "public, max-age=60"
```

This tells CDNs and browser caches to cache product compositions for 60 seconds. Reduces load on both the composer and downstream services.

## Monitoring Composition Performance

Track the overall composition latency and per-service contribution:

```
# Overall composition latency
histogram_quantile(0.95, sum(rate(istio_request_duration_milliseconds_bucket{destination_service="product-composer.production.svc.cluster.local"}[5m])) by (le))

# Per-service latency from the composer
histogram_quantile(0.95, sum(rate(istio_request_duration_milliseconds_bucket{source_workload="product-composer"}[5m])) by (le, destination_service))

# Per-service error rate from the composer
sum(rate(istio_requests_total{source_workload="product-composer",response_code=~"5.*"}[5m])) by (destination_service)
```

This shows you which downstream service is the bottleneck. If the recommendation service is consistently the slowest, either optimize it or reduce its timeout further.

## Scaling the Composer

The composer is CPU-bound (making many concurrent HTTP calls) and memory-bound (holding multiple response payloads). Scale it based on request rate:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: product-composer-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: product-composer
  minReplicas: 4
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
```

## Summary

The API composition pattern with Istio involves routing client requests to a composer service that fans out to multiple downstream services. Configure per-service timeouts within the overall composition budget. Use `sourceLabels` matching to apply specific policies for composer-to-service traffic. Apply circuit breaking with different thresholds based on whether the service is essential or optional. The composer handles partial failures by providing defaults for non-essential data. Monitor per-service latency from the composer to identify bottlenecks. Cache compositions at the gateway level for read-heavy endpoints.
