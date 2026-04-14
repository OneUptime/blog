# How to Use Dapr with Traefik as API Gateway

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Traefik, Gateway, Kubernetes, Routing

Description: Learn how to configure Traefik as an API gateway for Dapr-enabled microservices, with routing rules, middleware, and TLS termination in Kubernetes.

---

## Overview

Traefik is a modern reverse proxy and load balancer built for dynamic environments like Kubernetes. Pairing Traefik with Dapr lets you manage external API routing, middleware, and TLS at the edge, while Dapr handles internal service communication and infrastructure abstractions.

## Installing Traefik

Install Traefik using Helm:

```bash
helm repo add traefik https://traefik.github.io/charts
helm repo update

helm install traefik traefik/traefik -n traefik --create-namespace \
  --set ports.web.port=8000 \
  --set ports.websecure.port=8443 \
  --set service.type=LoadBalancer
```

## Deploying a Dapr Service

Deploy the application with Dapr sidecar injection enabled:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: product-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: product-service
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "product-service"
        dapr.io/app-port: "8080"
      labels:
        app: product-service
    spec:
      containers:
        - name: product-service
          image: myregistry/product-service:latest
          ports:
            - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: product-service
spec:
  selector:
    app: product-service
  ports:
    - port: 3500
      targetPort: 3500
      name: dapr-http
```

## Defining a Traefik IngressRoute

Use Traefik's `IngressRoute` CRD to route traffic to the Dapr sidecar:

```yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: product-route
  namespace: default
spec:
  entryPoints:
    - web
  routes:
    - match: PathPrefix(`/products`)
      kind: Rule
      middlewares:
        - name: strip-prefix
        - name: add-dapr-headers
      services:
        - name: product-service
          port: 3500
```

## Adding Middleware for Path Stripping

Strip the `/products` prefix before forwarding to the Dapr invoke path:

```yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: strip-prefix
spec:
  stripPrefix:
    prefixes:
      - /products
```

## Adding Request Headers for Dapr Routing

Inject the `dapr-app-id` header so Dapr knows the target service:

```yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: add-dapr-headers
spec:
  headers:
    customRequestHeaders:
      dapr-app-id: "product-service"
```

## TLS Termination with Let's Encrypt

Configure Traefik to manage TLS certificates automatically:

```yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: product-route-tls
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(`api.example.com`) && PathPrefix(`/products`)
      kind: Rule
      middlewares:
        - name: strip-prefix
        - name: add-dapr-headers
      services:
        - name: product-service
          port: 3500
  tls:
    certResolver: letsencrypt
```

## Testing the Setup

Send a request through Traefik to the Dapr-managed service:

```bash
curl https://api.example.com/products/list
```

Traefik handles TLS termination and prefix stripping, then forwards the request to the Dapr sidecar, which routes it to the product service container.

## Summary

Traefik and Dapr complement each other well in Kubernetes environments. Traefik handles external routing, middleware processing, and TLS termination at the edge, while Dapr manages internal service invocation and infrastructure integrations. Using IngressRoute CRDs with Dapr sidecars gives you a clean, declarative API gateway configuration that scales with your microservices.
