# How to Use Dapr with NGINX Ingress

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Nginx, Ingress, Kubernetes, Routing

Description: Configure NGINX Ingress Controller to route external HTTP traffic to Dapr microservices, with TLS termination, path-based routing, and header forwarding.

---

## Overview

NGINX Ingress Controller is one of the most widely deployed Kubernetes ingress solutions. When used with Dapr, NGINX handles external traffic routing, TLS termination, and load balancing, while Dapr manages internal service communication and building blocks. This guide covers configuring NGINX Ingress for Dapr-based microservices.

## Prerequisites

- NGINX Ingress Controller installed
- Dapr installed on the cluster
- cert-manager installed (for TLS)
- kubectl configured

## Installing NGINX Ingress Controller

```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.replicaCount=2 \
  --set controller.nodeSelector."kubernetes.io/os"=linux
```

## Deploying a Dapr Service

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
  namespace: default
spec:
  replicas: 2
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
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: api-service
  namespace: default
spec:
  selector:
    app: api-service
  ports:
  - port: 80
    targetPort: 8080
```

## Basic NGINX Ingress Configuration

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: dapr-ingress
  namespace: default
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /$2
    nginx.ingress.kubernetes.io/use-regex: "true"
spec:
  ingressClassName: nginx
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /orders(/|$)(.*)
        pathType: ImplementationSpecific
        backend:
          service:
            name: order-service
            port:
              number: 80
      - path: /inventory(/|$)(.*)
        pathType: ImplementationSpecific
        backend:
          service:
            name: inventory-service
            port:
              number: 80
```

## TLS with cert-manager

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: dapr-ingress-tls
  namespace: default
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - api.example.com
    secretName: api-tls-secret
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 80
```

## Forwarding Headers for Dapr Tracing

```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/configuration-snippet: |
      proxy_set_header traceparent $http_traceparent;
      proxy_set_header tracestate $http_tracestate;
      proxy_set_header X-Request-ID $request_id;
```

## Rate Limiting

```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/limit-rps: "50"
    nginx.ingress.kubernetes.io/limit-connections: "10"
```

## Summary

NGINX Ingress Controller provides reliable external traffic routing for Dapr microservices with support for TLS termination, path-based routing, and rate limiting. By forwarding distributed tracing headers through NGINX, you maintain full observability from the ingress point through all Dapr service invocations.
