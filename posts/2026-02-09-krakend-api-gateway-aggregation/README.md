# How to Deploy KrakenD API Gateway for High-Performance API Aggregation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: API Gateway, KrakenD, Microservices

Description: Learn how to deploy KrakenD API gateway for high-performance API aggregation with configuration examples for endpoint composition, rate limiting, and response manipulation.

---

KrakenD is a stateless, distributed, high-performance API gateway designed for microservices architectures. Unlike traditional API gateways that rely on databases or distributed storage, KrakenD reads its entire configuration from a single file at startup, making it exceptionally fast and easy to scale horizontally.

## Why KrakenD for API Aggregation

KrakenD excels at aggregating multiple backend responses into a single endpoint. When your frontend needs data from five different microservices, KrakenD can make those five calls in parallel, merge the responses, and return a unified result. This reduces client-side complexity and network round trips.

The gateway processes requests without maintaining any state, which means you can scale it effortlessly by adding more instances. There's no session management, no cache coordination, and no database to bottleneck your throughput.

## Installing KrakenD

You can run KrakenD as a Docker container, which is the simplest approach for both development and production deployments.

```bash
# Pull the official KrakenD image
docker pull devopsfaith/krakend:2.5

# Create a basic configuration directory
mkdir -p krakend-config
```

For production Kubernetes deployments, you'll deploy KrakenD as a Deployment with multiple replicas behind a Service.

```yaml
# krakend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: krakend
  namespace: api-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: krakend
  template:
    metadata:
      labels:
        app: krakend
    spec:
      containers:
      - name: krakend
        image: devopsfaith/krakend:2.5
        ports:
        - containerPort: 8080
        volumeMounts:
        - name: config
          mountPath: /etc/krakend
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
      volumes:
      - name: config
        configMap:
          name: krakend-config
---
apiVersion: v1
kind: Service
metadata:
  name: krakend
  namespace: api-gateway
spec:
  selector:
    app: krakend
  ports:
  - port: 8080
    targetPort: 8080
  type: ClusterIP
```

## Configuring API Aggregation

KrakenD's configuration is JSON-based. The key concept is that you define endpoints exposed to clients, and for each endpoint, you specify one or more backend services that KrakenD calls.

```json
{
  "version": 3,
  "port": 8080,
  "endpoints": [
    {
      "endpoint": "/users/{id}/dashboard",
      "method": "GET",
      "backend": [
        {
          "url_pattern": "/users/{id}",
          "host": ["http://user-service:8000"],
          "group": "user"
        },
        {
          "url_pattern": "/users/{id}/orders",
          "host": ["http://order-service:8000"],
          "group": "orders"
        },
        {
          "url_pattern": "/users/{id}/preferences",
          "host": ["http://preference-service:8000"],
          "group": "preferences"
        }
      ]
    }
  ]
}
```

This configuration creates a single endpoint that aggregates data from three backend services. KrakenD makes all three requests in parallel and combines the responses into a single JSON object with three top-level keys: `user`, `orders`, and `preferences`.

## Response Manipulation and Filtering

Often you don't want to return everything from your backend services. KrakenD lets you cherry-pick fields and flatten nested structures.

```json
{
  "endpoint": "/products/{id}/summary",
  "method": "GET",
  "backend": [
    {
      "url_pattern": "/products/{id}",
      "host": ["http://product-service:8000"],
      "allow": ["id", "name", "price", "in_stock"],
      "group": "product"
    },
    {
      "url_pattern": "/products/{id}/reviews/stats",
      "host": ["http://review-service:8000"],
      "allow": ["average_rating", "total_reviews"],
      "mapping": {
        "average_rating": "rating",
        "total_reviews": "review_count"
      },
      "group": "reviews"
    }
  ]
}
```

The `allow` array specifies which fields to include from the backend response. Everything else is filtered out. The `mapping` object renames fields in the final response, which is useful for creating consistent naming conventions across services.

## Implementing Rate Limiting

KrakenD supports rate limiting at both the endpoint and backend levels. You can protect your services from abuse while still allowing legitimate high-volume traffic.

```json
{
  "endpoint": "/api/search",
  "method": "GET",
  "extra_config": {
    "qos/ratelimit/router": {
      "max_rate": 100,
      "client_max_rate": 10,
      "strategy": "ip"
    }
  },
  "backend": [
    {
      "url_pattern": "/search",
      "host": ["http://search-service:8000"]
    }
  ]
}
```

This configuration allows a maximum of 100 requests per second across all clients, with each individual IP address limited to 10 requests per second. The rate limiter uses an in-memory token bucket algorithm, which is both fast and memory-efficient.

## Backend Timeout and Retry Configuration

Network failures happen. KrakenD provides fine-grained control over timeouts and retries to help your API remain responsive even when backend services experience issues.

```json
{
  "endpoint": "/api/checkout",
  "method": "POST",
  "timeout": "3000ms",
  "backend": [
    {
      "url_pattern": "/payment/process",
      "host": ["http://payment-service:8000"],
      "timeout": "2000ms",
      "extra_config": {
        "github.com/devopsfaith/krakend-httpcache": {
          "shared": false
        }
      }
    },
    {
      "url_pattern": "/inventory/reserve",
      "host": ["http://inventory-service:8000"],
      "timeout": "1500ms"
    }
  ]
}
```

Each backend can have its own timeout value. If any backend exceeds its timeout, KrakenD can either return a partial response (with data from successful backends) or fail the entire request, depending on your configuration.

## Circuit Breaker Pattern

Protect your services from cascading failures by implementing circuit breakers. When a backend starts failing consistently, KrakenD stops sending traffic to it temporarily.

```json
{
  "backend": [
    {
      "url_pattern": "/recommendations",
      "host": ["http://recommendation-service:8000"],
      "extra_config": {
        "qos/circuit-breaker": {
          "interval": 60,
          "timeout": 10,
          "maxErrors": 5,
          "logStatusChange": true
        }
      }
    }
  ]
}
```

This circuit breaker opens after 5 errors within a 60-second window. Once open, it blocks requests to the backend for 10 seconds before entering a half-open state to test if the service has recovered.

## Deploying with ConfigMap

Store your KrakenD configuration in a Kubernetes ConfigMap for easy updates without rebuilding images.

```bash
# Create ConfigMap from configuration file
kubectl create configmap krakend-config \
  --from-file=krakend.json=./krakend-config/krakend.json \
  -n api-gateway

# Apply the deployment
kubectl apply -f krakend-deployment.yaml
```

When you need to update the configuration, update the ConfigMap and restart the KrakenD pods:

```bash
kubectl rollout restart deployment/krakend -n api-gateway
```

## Monitoring and Observability

KrakenD exposes Prometheus metrics at the `/__stats` endpoint by default. You can also enable detailed telemetry with OpenTelemetry integration.

```json
{
  "extra_config": {
    "telemetry/metrics": {
      "collection_time": "60s",
      "listen_address": ":8090"
    },
    "telemetry/opencensus": {
      "exporters": {
        "prometheus": {
          "port": 9091,
          "namespace": "krakend"
        }
      }
    }
  }
}
```

This configuration exposes metrics on port 9091 that Prometheus can scrape. You'll get detailed metrics about request rates, response times, error rates, and backend health.

## Performance Considerations

KrakenD is built in Go and designed for high throughput. In benchmarks, a single instance can handle tens of thousands of requests per second on modern hardware. For production workloads, start with these resource allocations and adjust based on your traffic patterns:

- CPU: 200-500m per replica for moderate load
- Memory: 256-512Mi per replica
- Replicas: Start with 3 for high availability

KrakenD's stateless design means adding more replicas scales linearly. If you're handling 10,000 requests per second with 3 replicas, adding 3 more will roughly double your capacity.

The gateway's real strength is parallel backend aggregation. When you configure an endpoint that calls five backends, those five calls happen concurrently. Total response time is limited by the slowest backend, not the sum of all backend response times.

## Conclusion

KrakenD simplifies API aggregation for microservices architectures. Its stateless design, parallel request processing, and comprehensive configuration options make it an excellent choice for high-performance API gateways. By consolidating multiple backend calls into single endpoints, you reduce client complexity and improve overall application performance.

The JSON configuration approach means your entire gateway setup is version-controlled and easily reproducible across environments. As your microservices architecture grows, KrakenD scales effortlessly to handle increased traffic without requiring complex clustering or state management.
