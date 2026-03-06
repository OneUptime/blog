# How to Implement A/B Testing Deployments with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, ab testing, GitOps, Traffic Splitting, NGINX, Istio

Description: A practical guide to implementing A/B testing deployments in Kubernetes using Flux CD with traffic splitting based on headers, cookies, and weighted routing.

---

## Introduction

A/B testing deployments allow you to run two or more versions of an application simultaneously and route users to different versions based on specific criteria such as headers, cookies, or traffic percentages. This enables data-driven decisions about which version performs better.

This guide covers how to implement A/B testing deployments with Flux CD using Nginx Ingress and Istio for traffic management.

## Prerequisites

- A Kubernetes cluster (v1.26+)
- Flux CD installed and bootstrapped
- Nginx Ingress Controller or Istio service mesh installed
- A Git repository connected to Flux

## Repository Structure

```text
clusters/
  my-cluster/
    ab-testing.yaml
apps/
  ab-testing/
    kustomization.yaml
    namespace.yaml
    version-a/
      deployment.yaml
      service.yaml
    version-b/
      deployment.yaml
      service.yaml
    ingress.yaml
```

## Flux Kustomization

```yaml
# clusters/my-cluster/ab-testing.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: ab-testing
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/ab-testing
  prune: true
  wait: true
  timeout: 5m
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: myapp-a
      namespace: ab-testing
    - apiVersion: apps/v1
      kind: Deployment
      name: myapp-b
      namespace: ab-testing
```

## Deploying Version A (Control)

```yaml
# apps/ab-testing/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: ab-testing
---
# apps/ab-testing/version-a/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-a
  namespace: ab-testing
  labels:
    app: myapp
    version: a
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
      version: a
  template:
    metadata:
      labels:
        app: myapp
        version: a
    spec:
      containers:
        - name: myapp
          image: myregistry.io/myapp:v1.0.0
          ports:
            - containerPort: 8080
          env:
            - name: VERSION
              value: "A"
            - name: VARIANT_NAME
              value: "control"
          resources:
            requests:
              cpu: "250m"
              memory: "256Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
---
# apps/ab-testing/version-a/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp-a
  namespace: ab-testing
spec:
  selector:
    app: myapp
    version: a
  ports:
    - port: 80
      targetPort: 8080
```

## Deploying Version B (Variant)

```yaml
# apps/ab-testing/version-b/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-b
  namespace: ab-testing
  labels:
    app: myapp
    version: b
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
      version: b
  template:
    metadata:
      labels:
        app: myapp
        version: b
    spec:
      containers:
        - name: myapp
          # Different version of the application
          image: myregistry.io/myapp:v2.0.0-beta
          ports:
            - containerPort: 8080
          env:
            - name: VERSION
              value: "B"
            - name: VARIANT_NAME
              value: "new-checkout-flow"
          resources:
            requests:
              cpu: "250m"
              memory: "256Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
---
# apps/ab-testing/version-b/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp-b
  namespace: ab-testing
spec:
  selector:
    app: myapp
    version: b
  ports:
    - port: 80
      targetPort: 8080
```

## A/B Testing with Nginx Ingress

### Header-Based Routing

Route traffic based on a custom header:

```yaml
# apps/ab-testing/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-main
  namespace: ab-testing
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  rules:
    - host: myapp.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: myapp-a
                port:
                  number: 80
---
# Canary ingress routes specific traffic to version B
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-ab-test
  namespace: ab-testing
  annotations:
    # Enable canary mode
    nginx.ingress.kubernetes.io/canary: "true"
    # Route to version B when this header is present
    nginx.ingress.kubernetes.io/canary-by-header: "X-AB-Test"
    # Only route when the header value matches
    nginx.ingress.kubernetes.io/canary-by-header-value: "variant-b"
spec:
  ingressClassName: nginx
  rules:
    - host: myapp.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: myapp-b
                port:
                  number: 80
```

### Cookie-Based Routing

Route users based on a cookie for persistent A/B testing:

```yaml
# apps/ab-testing/ingress-cookie.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-main
  namespace: ab-testing
spec:
  ingressClassName: nginx
  rules:
    - host: myapp.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: myapp-a
                port:
                  number: 80
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-ab-cookie
  namespace: ab-testing
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    # Route to version B when cookie "ab_test" equals "b"
    nginx.ingress.kubernetes.io/canary-by-cookie: "ab_test"
spec:
  ingressClassName: nginx
  rules:
    - host: myapp.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: myapp-b
                port:
                  number: 80
```

### Weighted Traffic Splitting

Send a percentage of traffic to each version:

```yaml
# apps/ab-testing/ingress-weighted.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-main
  namespace: ab-testing
spec:
  ingressClassName: nginx
  rules:
    - host: myapp.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: myapp-a
                port:
                  number: 80
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-ab-weighted
  namespace: ab-testing
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    # Send 20% of traffic to version B
    nginx.ingress.kubernetes.io/canary-weight: "20"
spec:
  ingressClassName: nginx
  rules:
    - host: myapp.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: myapp-b
                port:
                  number: 80
```

## A/B Testing with Istio

### Virtual Service for Traffic Splitting

```yaml
# apps/ab-testing/istio/virtual-service.yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: myapp
  namespace: ab-testing
spec:
  hosts:
    - myapp.example.com
  gateways:
    - myapp-gateway
  http:
    # Route based on header first
    - match:
        - headers:
            x-ab-test:
              exact: "variant-b"
      route:
        - destination:
            host: myapp-b
            port:
              number: 80
    # Route based on cookie
    - match:
        - headers:
            cookie:
              regex: ".*ab_test=b.*"
      route:
        - destination:
            host: myapp-b
            port:
              number: 80
    # Default: weighted split
    - route:
        - destination:
            host: myapp-a
            port:
              number: 80
          weight: 80
        - destination:
            host: myapp-b
            port:
              number: 80
          weight: 20
---
# apps/ab-testing/istio/destination-rule.yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: myapp
  namespace: ab-testing
spec:
  host: myapp-a
  trafficPolicy:
    connectionPool:
      http:
        h2UpgradePolicy: DEFAULT
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: myapp-b
  namespace: ab-testing
spec:
  host: myapp-b
  trafficPolicy:
    connectionPool:
      http:
        h2UpgradePolicy: DEFAULT
```

### Istio Gateway

```yaml
# apps/ab-testing/istio/gateway.yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: myapp-gateway
  namespace: ab-testing
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      hosts:
        - myapp.example.com
      tls:
        mode: SIMPLE
        credentialName: myapp-tls
```

## Progressive Traffic Shifting

Use Git commits to gradually shift traffic:

```yaml
# Step 1: 10% to version B (initial test)
- route:
    - destination:
        host: myapp-a
      weight: 90
    - destination:
        host: myapp-b
      weight: 10

# Step 2: 30% to version B (after positive metrics)
- route:
    - destination:
        host: myapp-a
      weight: 70
    - destination:
        host: myapp-b
      weight: 30

# Step 3: 50/50 split (full A/B test)
- route:
    - destination:
        host: myapp-a
      weight: 50
    - destination:
        host: myapp-b
      weight: 50

# Step 4: Promote version B (test concluded)
- route:
    - destination:
        host: myapp-b
      weight: 100
```

## Monitoring A/B Test Results

Deploy metrics collection to compare versions:

```yaml
# apps/ab-testing/monitoring/service-monitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: myapp-ab-metrics
  namespace: ab-testing
spec:
  selector:
    matchLabels:
      app: myapp
  endpoints:
    - port: metrics
      interval: 15s
      path: /metrics
---
# Prometheus recording rules for A/B comparison
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: ab-test-rules
  namespace: monitoring
spec:
  groups:
    - name: ab_test.rules
      rules:
        # Request success rate per version
        - record: ab_test:request_success_rate
          expr: |
            sum(rate(http_requests_total{status=~"2.."}[5m])) by (version)
            /
            sum(rate(http_requests_total[5m])) by (version)

        # Average response time per version
        - record: ab_test:response_time_avg
          expr: |
            sum(rate(http_request_duration_seconds_sum[5m])) by (version)
            /
            sum(rate(http_request_duration_seconds_count[5m])) by (version)

        # Error rate per version
        - record: ab_test:error_rate
          expr: |
            sum(rate(http_requests_total{status=~"5.."}[5m])) by (version)
            /
            sum(rate(http_requests_total[5m])) by (version)
```

## Cleanup After A/B Test

Once the test is concluded, clean up by removing the losing version:

```yaml
# apps/ab-testing/kustomization.yaml (after test concludes)
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  # Only version B remains (the winner)
  - version-b/deployment.yaml
  - version-b/service.yaml
  - ingress-final.yaml
```

```yaml
# apps/ab-testing/ingress-final.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-main
  namespace: ab-testing
spec:
  ingressClassName: nginx
  rules:
    - host: myapp.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                # All traffic to version B (the winner)
                name: myapp-b
                port:
                  number: 80
```

## Summary

Implementing A/B testing with Flux CD enables controlled, data-driven deployments:

- Deploy two versions simultaneously with separate Deployments and Services
- Use Nginx Ingress canary annotations for header, cookie, or weight-based routing
- Use Istio VirtualService for more advanced traffic management rules
- Shift traffic progressively through Git commits with full audit trail
- Monitor metrics for both versions to make data-driven decisions
- Clean up the losing version by removing it from the Git repository
- Flux automatically reconciles changes, making A/B test management seamless
