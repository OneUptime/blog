# How to Use Dapr with NGINX as API Gateway

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Nginx, Gateway, Kubernetes, Proxy

Description: Learn how to configure NGINX as an API gateway in front of Dapr-enabled microservices for routing, load balancing, and header management in Kubernetes.

---

## Overview

NGINX is one of the most widely deployed reverse proxies and API gateways. Combining NGINX with Dapr provides a familiar, proven edge layer while leveraging Dapr's portable service invocation and infrastructure building blocks internally.

## Installing NGINX Ingress Controller

Deploy the NGINX Ingress Controller in your Kubernetes cluster:

```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

helm install nginx-ingress ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=LoadBalancer
```

## Deploying a Dapr Service

Create a deployment with Dapr sidecar injection:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: user-service
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "user-service"
        dapr.io/app-port: "8080"
        dapr.io/enable-metrics: "true"
      labels:
        app: user-service
    spec:
      containers:
        - name: user-service
          image: myregistry/user-service:latest
          ports:
            - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: user-service
spec:
  selector:
    app: user-service
  ports:
    - name: dapr-http
      port: 3500
      targetPort: 3500
```

## Creating an NGINX Ingress Resource

Route external traffic to the Dapr sidecar port:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: user-service-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /v1.0/invoke/user-service/method/$2
    nginx.ingress.kubernetes.io/use-regex: "true"
spec:
  ingressClassName: nginx
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /users(/|$)(.*)
            pathType: ImplementationSpecific
            backend:
              service:
                name: user-service
                port:
                  number: 3500
```

The rewrite rule maps `/users/profile` to `/v1.0/invoke/user-service/method/profile` on the Dapr sidecar.

## Adding Rate Limiting with NGINX Annotations

Apply rate limiting using NGINX annotations:

```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/limit-rps: "10"
    nginx.ingress.kubernetes.io/limit-connections: "5"
    nginx.ingress.kubernetes.io/limit-req-status-code: "429"
```

## Configuring Custom NGINX Headers

Pass custom headers to the Dapr sidecar for tracing and routing:

```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/configuration-snippet: |
      proxy_set_header dapr-app-id user-service;
      proxy_set_header traceparent $http_traceparent;
```

## Enabling TLS with a Certificate

Add TLS termination using a Kubernetes secret:

```bash
kubectl create secret tls api-tls-secret \
  --cert=tls.crt \
  --key=tls.key \
  -n default
```

```yaml
spec:
  tls:
    - hosts:
        - api.example.com
      secretName: api-tls-secret
```

## Testing the Integration

Call the API through NGINX to verify routing:

```bash
curl https://api.example.com/users/profile \
  -H "Authorization: Bearer my-token"
```

This request is rewritten by NGINX to `/v1.0/invoke/user-service/method/profile` and forwarded to the Dapr sidecar.

## Summary

NGINX as an API gateway in front of Dapr-enabled services provides a battle-tested edge layer with powerful rewrite rules, rate limiting, and TLS management. The NGINX Ingress Controller's annotation-driven configuration makes it straightforward to route external HTTP traffic to Dapr sidecars without modifying application code.
