# How to Implement API Rate Limiting with Dapr and API Gateway

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Rate Limiting, API, Gateway, Security

Description: Learn how to implement API rate limiting for Dapr microservices using API gateway plugins and middleware to protect services from traffic overload.

---

## Overview

Rate limiting protects your Dapr microservices from being overwhelmed by excessive client requests. Rather than implementing rate limiting inside each service, it is more effective to enforce it at the API gateway layer, keeping your application code focused on business logic.

This guide covers rate limiting with Kong, NGINX Ingress, and a standalone rate limiter using Redis.

## Rate Limiting with Kong Gateway

Kong's built-in rate limiting plugin supports multiple strategies:

```yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: order-rate-limit
plugin: rate-limiting
config:
  second: 10
  minute: 200
  hour: 5000
  policy: redis
  redis:
    host: redis.default.svc.cluster.local
    port: 6379
  fault_tolerant: true
  hide_client_headers: false
```

Attach the plugin to a specific route:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: order-ingress
  annotations:
    konghq.com/plugins: "order-rate-limit"
spec:
  ingressClassName: kong
  rules:
    - http:
        paths:
          - path: /orders
            pathType: Prefix
            backend:
              service:
                name: order-service
                port:
                  number: 3500
```

## Rate Limiting with NGINX Ingress

Apply per-IP rate limiting using NGINX annotations:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  annotations:
    nginx.ingress.kubernetes.io/limit-rps: "20"
    nginx.ingress.kubernetes.io/limit-burst-multiplier: "5"
    nginx.ingress.kubernetes.io/limit-connections: "10"
    nginx.ingress.kubernetes.io/limit-whitelist: "10.0.0.0/8"
spec:
  ingressClassName: nginx
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /orders
            pathType: Prefix
            backend:
              service:
                name: order-service
                port:
                  number: 3500
```

By default, NGINX returns a 503 status code when the rate limit is exceeded. To return a 429 status code instead, configure it globally in the NGINX Ingress Controller ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ingress-nginx-controller
  namespace: ingress-nginx
data:
  limit-req-status-code: "429"
```

## Implementing Rate Limiting in a Dapr Middleware Component

Dapr supports middleware pipelines that can apply rate limiting directly at the sidecar level. Create a rate limit middleware using a custom HTTP middleware component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: ratelimit
spec:
  type: middleware.http.ratelimit
  version: v1
  metadata:
    - name: maxRequestsPerSecond
      value: "10"
```

Apply it through the Dapr configuration:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: pipeline
spec:
  httpPipeline:
    handlers:
      - name: ratelimit
        type: middleware.http.ratelimit
```

## Returning Correct 429 Headers

Ensure rate limit responses include standard Retry-After headers. Test using curl:

```bash
# Rapid fire requests to trigger rate limiting
for i in $(seq 1 25); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    http://api.example.com/orders/list)
  echo "Request $i: HTTP $STATUS"
done
```

When the limit is exceeded you should see:

```text
Request 21: HTTP 429
Request 22: HTTP 429
Request 23: HTTP 429
```

## Applying Rate Limits per API Key

Use Kong's consumer-based rate limiting to apply different limits per client:

```bash
# Create a consumer
kubectl apply -f - <<EOF
apiVersion: configuration.konghq.com/v1
kind: KongConsumer
metadata:
  name: premium-client
  annotations:
    kubernetes.io/ingress.class: kong
username: premium-client
EOF

# Apply a higher rate limit to this consumer
kubectl annotate kongconsumer premium-client \
  konghq.com/plugins=premium-rate-limit
```

## Summary

Implementing rate limiting at the API gateway layer keeps your Dapr microservices protected without adding complexity to application code. Kong's plugin system and NGINX annotations both provide flexible per-route and per-consumer rate limiting, while Dapr's built-in middleware pipeline offers an application-level fallback. Use Redis-backed distributed rate limiting for multi-replica gateway deployments.
