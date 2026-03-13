# How to Configure Flagger with Gateway API HTTPRoute

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flagger, Gateway API, HTTPRoute, Kubernetes, Canary Deployments

Description: Learn how to configure Flagger with Kubernetes Gateway API HTTPRoute for progressive delivery and automated canary deployments.

---

## Introduction

The Kubernetes Gateway API is the next-generation standard for managing ingress traffic in Kubernetes clusters. It provides a more expressive, extensible, and role-oriented model compared to the legacy Ingress resource. HTTPRoute is the core routing resource in the Gateway API that defines how HTTP traffic should be routed to backend services.

Flagger supports the Gateway API natively, using HTTPRoute resources to manage traffic splitting during canary deployments. This integration works with any Gateway API-compliant controller, including Envoy Gateway, Istio, Contour, and others. This guide walks you through configuring Flagger with Gateway API HTTPRoute for automated progressive delivery.

## Prerequisites

Before you begin, ensure you have:

- A Kubernetes cluster running version 1.24 or later.
- `kubectl` installed and configured.
- Helm 3 installed.
- A Gateway API-compliant controller installed (such as Envoy Gateway or Istio).
- Gateway API CRDs installed in your cluster.
- Prometheus installed for metrics collection.

## Installing Gateway API CRDs

If the Gateway API CRDs are not already installed, deploy them from the official release.

```bash
# Install the standard Gateway API CRDs
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.0.0/standard-install.yaml
```

## Setting Up a Gateway Resource

Create a Gateway resource that defines the listener configuration for your ingress traffic.

```yaml
# gateway.yaml
# Gateway resource defining the entry point for traffic
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: main-gateway
  namespace: test
spec:
  gatewayClassName: envoy
  listeners:
    - name: http
      protocol: HTTP
      port: 80
      allowedRoutes:
        namespaces:
          from: Same
```

Apply the Gateway resource.

```bash
kubectl apply -f gateway.yaml
```

## Installing Flagger for Gateway API

Install Flagger with the Gateway API provider.

```bash
helm repo add flagger https://flagger.app

helm install flagger flagger/flagger \
  --namespace flagger-system \
  --create-namespace \
  --set meshProvider=gatewayapi \
  --set metricsServer=http://prometheus.monitoring:9090
```

## Deploying the Application

Deploy your application with a Deployment and Service.

```yaml
# app.yaml
# Application deployment and service
apiVersion: v1
kind: Namespace
metadata:
  name: test
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: podinfo
  namespace: test
  labels:
    app: podinfo
spec:
  replicas: 2
  selector:
    matchLabels:
      app: podinfo
  template:
    metadata:
      labels:
        app: podinfo
    spec:
      containers:
        - name: podinfo
          image: stefanprodan/podinfo:6.1.0
          ports:
            - containerPort: 9898
              name: http
          readinessProbe:
            httpGet:
              path: /readyz
              port: 9898
            initialDelaySeconds: 5
            periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: podinfo
  namespace: test
spec:
  type: ClusterIP
  selector:
    app: podinfo
  ports:
    - name: http
      port: 80
      targetPort: 9898
```

## Creating the HTTPRoute

Define an HTTPRoute that routes traffic through the Gateway to your application. Flagger will modify this route to include weighted backends during canary analysis.

```yaml
# httproute.yaml
# Gateway API HTTPRoute for the application
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: podinfo
  namespace: test
spec:
  parentRefs:
    - name: main-gateway
      namespace: test
  hostnames:
    - app.example.com
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /
      backendRefs:
        - name: podinfo
          port: 80
```

Apply the resources.

```bash
kubectl apply -f app.yaml
kubectl apply -f httproute.yaml
```

## Configuring the Flagger Canary Resource

Create the Canary resource that references the HTTPRoute for traffic management.

```yaml
# canary.yaml
# Flagger Canary resource for Gateway API HTTPRoute
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: podinfo
  namespace: test
spec:
  provider: gatewayapi
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: podinfo
  progressDeadlineSeconds: 60
  service:
    port: 80
    targetPort: 9898
    gatewayRefs:
      - name: main-gateway
        namespace: test
        group: gateway.networking.k8s.io
        kind: Gateway
  analysis:
    interval: 30s
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
      - name: request-duration
        thresholdRange:
          max: 500
        interval: 1m
    webhooks:
      - name: load-test
        type: rollout
        url: http://flagger-loadtester.test/
        metadata:
          cmd: "hey -z 1m -q 10 -c 2 http://podinfo-canary.test/"
```

Apply the Canary resource.

```bash
kubectl apply -f canary.yaml
```

## How Flagger Manages HTTPRoute Traffic Splitting

When Flagger detects a new revision, it updates the HTTPRoute backendRefs to include weighted references to both the primary and canary services.

```yaml
# Example of HTTPRoute during canary analysis (managed by Flagger)
spec:
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /
      backendRefs:
        - name: podinfo-primary
          port: 80
          weight: 90
        - name: podinfo-canary
          port: 80
          weight: 10
```

The weights are updated at each analysis step. Flagger increases the canary weight based on the stepWeight value if metrics are within the defined thresholds.

## Verifying and Triggering a Canary Deployment

Verify the initialization and then trigger a canary.

```bash
# Check canary status
kubectl get canary -n test

# Trigger a canary by updating the image
kubectl set image deployment/podinfo \
  podinfo=stefanprodan/podinfo:6.2.0 -n test

# Watch the progression
kubectl get canary podinfo -n test -w

# Inspect the HTTPRoute during analysis
kubectl get httproute podinfo -n test -o yaml
```

## Conclusion

Configuring Flagger with Gateway API HTTPRoute positions your progressive delivery pipeline on the latest Kubernetes networking standard. The Gateway API provides a more structured and extensible routing model than legacy Ingress, and Flagger's native support means you get automated canary analysis and traffic shifting without vendor lock-in to any specific ingress controller. This approach is future-proof and works across multiple Gateway API implementations.
