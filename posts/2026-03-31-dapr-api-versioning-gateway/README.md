# How to Implement API Versioning with Dapr and API Gateway

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, API Versioning, Gateway, Routing, Microservice

Description: Learn how to implement API versioning for Dapr microservices using path-based, header-based, and subdomain versioning strategies at the API gateway.

---

## Overview

API versioning allows you to evolve your Dapr microservices without breaking existing consumers. The API gateway is the ideal place to manage versioning logic, routing requests to different service versions or endpoints based on path, headers, or query parameters.

## Path-Based Versioning with Kong

Route `/v1` and `/v2` traffic to different Dapr service deployments:

```yaml
# v1 route
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: order-service-v1
  annotations:
    konghq.com/strip-path: "true"
spec:
  ingressClassName: kong
  rules:
    - http:
        paths:
          - path: /v1/orders
            pathType: Prefix
            backend:
              service:
                name: order-service-v1
                port:
                  number: 3500

---
# v2 route
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: order-service-v2
  annotations:
    konghq.com/strip-path: "true"
spec:
  ingressClassName: kong
  rules:
    - http:
        paths:
          - path: /v2/orders
            pathType: Prefix
            backend:
              service:
                name: order-service-v2
                port:
                  number: 3500
```

Deploy the two service versions as separate Kubernetes deployments each with their own Dapr app ID:

```yaml
# v2 deployment
metadata:
  annotations:
    dapr.io/enabled: "true"
    dapr.io/app-id: "order-service-v2"
    dapr.io/app-port: "8080"
```

## Header-Based Versioning with NGINX

Route based on the `API-Version` request header using NGINX Ingress snippets:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: order-header-versioning
  annotations:
    nginx.ingress.kubernetes.io/server-snippet: |
      set $target_service "order-service-v1";
      if ($http_api_version = "2") {
        set $target_service "order-service-v2";
      }
    nginx.ingress.kubernetes.io/configuration-snippet: |
      proxy_set_header dapr-app-id $target_service;
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
                name: order-service-v1
                port:
                  number: 3500
```

## Version Routing in Dapr Service Invocation

Within Dapr, route version-specific calls by including the version in the method path:

```bash
# Call v1 endpoint
curl http://localhost:3500/v1.0/invoke/order-service/method/v1/orders

# Call v2 endpoint
curl http://localhost:3500/v1.0/invoke/order-service/method/v2/orders
```

Your application handles the routing internally:

```javascript
app.get('/v1/orders', handleOrdersV1);
app.get('/v2/orders', handleOrdersV2);
```

## Deprecating Old Versions Gracefully

Add a deprecation warning header to v1 responses using Kong's response transformer plugin:

```yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: deprecation-header
plugin: response-transformer
config:
  add:
    headers:
      - "Deprecation: version=v1"
      - "Sunset: Sat, 31 Dec 2026 23:59:59 GMT"
      - "Link: <https://api.example.com/v2/orders>; rel=\"successor-version\""
```

## Testing Version Routing

Verify both versions are routed correctly:

```bash
# v1 request
curl -s http://api.example.com/v1/orders
# or header-based
curl -s -H "API-Version: 1" http://api.example.com/orders

# v2 request
curl -s http://api.example.com/v2/orders
# or header-based
curl -s -H "API-Version: 2" http://api.example.com/orders
```

## Summary

API versioning with Dapr and an API gateway gives you the flexibility to evolve services independently without disrupting clients. Path-based versioning is the most explicit approach, while header-based versioning keeps URLs clean. Deploy multiple Dapr service versions as separate Kubernetes deployments and use gateway routing rules to direct traffic appropriately as you manage the migration lifecycle.
