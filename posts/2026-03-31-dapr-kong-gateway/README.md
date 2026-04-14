# How to Use Dapr with Kong Gateway

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kong, Gateway, API, Kubernetes

Description: Learn how to integrate Dapr with Kong Gateway to add authentication, rate limiting, and routing to Dapr-enabled microservices running in Kubernetes.

---

## Overview

Kong Gateway is a popular cloud-native API gateway used to manage traffic, enforce security, and add observability to services. When combined with Dapr, Kong handles north-south traffic at the edge while Dapr manages east-west service-to-service communication and infrastructure abstraction.

## Architecture Overview

In this setup:
- Kong Gateway handles incoming external HTTP traffic
- Kong routes requests to Dapr-enabled services via the Dapr sidecar HTTP port (3500)
- Dapr handles service invocation, state, and pub/sub internally

```text
Client --> Kong Gateway --> Dapr Sidecar (:3500) --> App (:8080)
```

## Installing Kong on Kubernetes

Deploy Kong using Helm:

```bash
helm repo add kong https://charts.konghq.com
helm repo update

helm install kong kong/ingress -n kong --create-namespace
```

## Deploying a Dapr-Enabled Service

Create a Kubernetes deployment with Dapr annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-service"
        dapr.io/app-port: "8080"
      labels:
        app: order-service
    spec:
      containers:
        - name: order-service
          image: myregistry/order-service:latest
          ports:
            - containerPort: 8080
```

Create the corresponding service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: order-service
spec:
  selector:
    app: order-service
  ports:
    - port: 3500
      targetPort: 3500
```

## Configuring Kong Ingress for Dapr

Define an Ingress resource to route through Kong to the Dapr sidecar port:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: order-service-ingress
  annotations:
    konghq.com/strip-path: "true"
    konghq.com/plugins: "rate-limiting,key-auth"
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

## Adding Rate Limiting with a Kong Plugin

Apply a rate limiting plugin to protect the service:

```yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: rate-limiting
plugin: rate-limiting
config:
  minute: 100
  hour: 5000
  policy: local
```

## Adding Key Authentication

Require API key authentication for external callers:

```yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: key-auth
plugin: key-auth
config:
  key_names:
    - X-API-Key
  hide_credentials: true
```

## Testing the Integration

Send a request through Kong to the Dapr-enabled service:

```bash
curl -H "X-API-Key: my-api-key" \
  http://kong-gateway-proxy.kong.svc/orders/v1.0/invoke/order-service/method/list
```

Requests flow through Kong (authentication + rate limiting) and then to the Dapr sidecar, which forwards them to the application on port 8080.

## Summary

Integrating Dapr with Kong Gateway combines edge traffic management with Dapr's service mesh capabilities. Kong handles external authentication, rate limiting, and routing while Dapr provides reliable service-to-service communication, state management, and pub/sub internally. This separation of concerns keeps your microservices lean while gaining the full benefits of both platforms.
