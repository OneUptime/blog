# How to Use Dapr with Traefik Ingress

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Traefik, Ingress, Kubernetes, Routing

Description: Set up Traefik as the ingress controller for Dapr microservices with middleware for authentication, rate limiting, and distributed tracing header propagation.

---

## Overview

Traefik is a modern, cloud-native edge router that integrates natively with Kubernetes. When deployed with Dapr, Traefik handles external traffic routing and middleware processing, while Dapr manages service mesh capabilities. Traefik's dynamic configuration makes it particularly well-suited for environments where Dapr services are frequently added or updated.

## Prerequisites

- Traefik v2 or v3 installed on Kubernetes
- Dapr installed on the cluster
- kubectl configured

## Installing Traefik

```bash
helm repo add traefik https://traefik.github.io/charts
helm repo update

helm upgrade --install traefik traefik/traefik \
  --namespace traefik \
  --create-namespace \
  --set ports.web.redirections.entryPoint.to=websecure \
  --set ports.web.redirections.entryPoint.scheme=https \
  --set ports.websecure.tls.enabled=true
```

## Deploying a Dapr Service

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
  namespace: default
spec:
  selector:
    matchLabels:
      app: api-service
  template:
    metadata:
      labels:
        app: api-service
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "api-service"
        dapr.io/app-port: "8080"
    spec:
      containers:
      - name: api-service
        image: myorg/api-service:latest
---
apiVersion: v1
kind: Service
metadata:
  name: api-service
spec:
  selector:
    app: api-service
  ports:
  - port: 80
    targetPort: 8080
```

## Traefik IngressRoute

Traefik uses its own `IngressRoute` CRD for advanced routing:

```yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: dapr-services-route
  namespace: default
spec:
  entryPoints:
  - websecure
  routes:
  - match: Host(`api.example.com`) && PathPrefix(`/orders`)
    kind: Rule
    services:
    - name: order-service
      port: 80
    middlewares:
    - name: strip-orders-prefix
    - name: rate-limit
    - name: jwt-auth
  - match: Host(`api.example.com`) && PathPrefix(`/inventory`)
    kind: Rule
    services:
    - name: inventory-service
      port: 80
  tls:
    certResolver: letsencrypt
```

## Traefik Middlewares

Strip path prefix middleware:

```yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: strip-orders-prefix
  namespace: default
spec:
  stripPrefix:
    prefixes:
    - /orders
```

Rate limiting middleware:

```yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: rate-limit
  namespace: default
spec:
  rateLimit:
    average: 100
    burst: 50
    period: 1m
    sourceCriterion:
      ipStrategy:
        depth: 1
```

JWT authentication middleware:

```yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: jwt-auth
  namespace: default
spec:
  forwardAuth:
    address: http://auth-service/verify
    authResponseHeaders:
    - X-User-Id
    - X-User-Roles
```

## Forwarding Trace Headers

Configure Traefik to enable Zipkin distributed tracing (Traefik v2):

```yaml
# In Traefik v2 values.yaml
additionalArguments:
- "--tracing.zipkin=true"
- "--tracing.zipkin.httpEndpoint=http://zipkin:9411/api/v2/spans"
- "--tracing.serviceName=traefik"
```

## Summary

Traefik integrates naturally with Dapr microservices through its IngressRoute CRD and middleware system. By handling authentication, rate limiting, and path routing at the ingress layer, Traefik complements Dapr's internal service communication capabilities. Traefik's automatic Let's Encrypt TLS support also simplifies secure external access to Dapr services.
