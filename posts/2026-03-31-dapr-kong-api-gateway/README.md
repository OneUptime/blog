# How to Use Dapr with Kong API Gateway

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kong, API Gateway, Kubernetes, Microservice

Description: Integrate Kong API Gateway with Dapr to provide external API access, authentication, rate limiting, and routing to Dapr microservices on Kubernetes.

---

## Overview

Kong is a popular API gateway that handles external traffic routing, authentication, rate limiting, and observability. When deployed alongside Dapr, Kong routes external requests to Dapr microservices, while Dapr handles internal service-to-service communication. This combination provides a complete API management layer.

## Prerequisites

- Kong installed on Kubernetes (via Helm)
- Dapr installed on the cluster
- kubectl configured

## Installing Kong

```bash
helm repo add kong https://charts.konghq.com
helm repo update

helm upgrade --install kong kong/kong \
  --namespace kong \
  --create-namespace \
  --set ingressController.installCRDs=false
```

## Architecture

External clients call Kong Gateway, which routes to Dapr-annotated services. Dapr sidecars handle internal service invocation:

```text
Client -> Kong Gateway -> Service (with Dapr sidecar) -> Other Dapr services
```

## Deploying a Dapr Service

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-service"
        dapr.io/app-port: "8080"
    spec:
      containers:
      - name: order-service
        image: myorg/order-service:latest
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: order-service
  namespace: default
spec:
  selector:
    app: order-service
  ports:
  - port: 80
    targetPort: 8080
```

## Configuring Kong Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: order-service-ingress
  namespace: default
  annotations:
    konghq.com/strip-path: "true"
    konghq.com/plugins: "order-service-rate-limit,jwt-auth"
spec:
  ingressClassName: kong
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
              number: 80
```

## Configuring Rate Limiting Plugin

```yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: order-service-rate-limit
  namespace: default
plugin: rate-limiting
config:
  minute: 100
  hour: 1000
  policy: redis
  redis_host: redis
  redis_port: 6379
```

## JWT Authentication Plugin

```yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: jwt-auth
  namespace: default
plugin: jwt
config:
  claims_to_verify:
  - exp
  key_claim_name: iss
```

## Kong to Dapr Service Invocation

Instead of routing directly to the app port, route through the Dapr HTTP port for tracing:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: order-service-dapr
  namespace: default
spec:
  selector:
    app: order-service
  ports:
  - name: dapr-http
    port: 3500
    targetPort: 3500
```

```yaml
spec:
  rules:
  - http:
      paths:
      - path: /v1.0/invoke/order-service
        pathType: Prefix
        backend:
          service:
            name: order-service-dapr
            port:
              number: 3500
```

## Summary

Kong API Gateway complements Dapr by handling external-facing concerns like authentication, rate limiting, and request routing, while Dapr manages internal microservice communication. This separation of concerns provides a clean architecture where Kong owns the API perimeter and Dapr owns service mesh capabilities.
