# How to Configure Flagger with Traefik TraefikService

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flagger, Traefik, TraefikService, Kubernetes, Canary Deployments

Description: Learn how to configure Flagger with Traefik TraefikService for automated canary deployments using weighted routing on Kubernetes.

---

## Introduction

Traefik is a modern reverse proxy and ingress controller that integrates natively with Kubernetes through its custom resource definitions. The TraefikService resource enables advanced routing features including weighted round-robin load balancing, which Flagger leverages to perform canary deployments. By combining Flagger with Traefik, you can automate progressive delivery without requiring a full service mesh.

This guide covers the complete process of setting up Flagger with Traefik, using TraefikService resources for weighted traffic splitting during canary analysis.

## Prerequisites

Before you begin, make sure you have:

- A Kubernetes cluster running version 1.22 or later.
- `kubectl` installed and configured.
- Helm 3 installed.
- Prometheus installed for metrics collection.

## Installing Traefik

Deploy Traefik using the official Helm chart with the Kubernetes CRD provider enabled.

```bash
# Add the Traefik Helm repository
helm repo add traefik https://traefik.github.io/charts
helm repo update

# Install Traefik with CRD support and metrics enabled
helm install traefik traefik/traefik \
  --namespace traefik \
  --create-namespace \
  --set providers.kubernetesCRD.enabled=true \
  --set metrics.prometheus.enabled=true
```

Verify that Traefik is running.

```bash
kubectl get pods -n traefik
```

## Installing Flagger for Traefik

Install Flagger configured to use the Traefik provider.

```bash
helm repo add flagger https://flagger.app

helm install flagger flagger/flagger \
  --namespace traefik \
  --set meshProvider=traefik \
  --set metricsServer=http://prometheus.monitoring:9090
```

## Deploying the Application

Deploy a sample application with a ClusterIP service in a test namespace.

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
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9898"
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

Apply the resources.

```bash
kubectl apply -f app.yaml
```

## Creating the Traefik IngressRoute

Define a Traefik IngressRoute that references a TraefikService for routing. Flagger will manage the TraefikService resource to control weighted traffic splitting.

```yaml
# ingressroute.yaml
# Traefik IngressRoute that delegates to a TraefikService
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: podinfo
  namespace: test
spec:
  entryPoints:
    - web
  routes:
    - match: Host(`app.example.com`)
      kind: Rule
      services:
        - name: podinfo
          namespace: test
          kind: TraefikService
```

Apply the IngressRoute.

```bash
kubectl apply -f ingressroute.yaml
```

## Configuring the Flagger Canary Resource

Create the Canary resource that tells Flagger how to manage the progressive delivery using Traefik's TraefikService for weighted routing.

```yaml
# canary.yaml
# Flagger Canary resource for Traefik integration
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: podinfo
  namespace: test
spec:
  provider: traefik
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: podinfo
  progressDeadlineSeconds: 60
  service:
    port: 80
    targetPort: 9898
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

## Understanding TraefikService Weighted Routing

When Flagger initializes the canary, it creates a TraefikService resource that defines the weighted routing between the primary and canary services. During canary analysis, the weights are adjusted based on the step weight configuration.

```yaml
# Example TraefikService created by Flagger (managed automatically)
apiVersion: traefik.io/v1alpha1
kind: TraefikService
metadata:
  name: podinfo
  namespace: test
spec:
  weighted:
    services:
      - name: podinfo-primary
        port: 80
        weight: 90
      - name: podinfo-canary
        port: 80
        weight: 10
```

Flagger updates the weight values at each analysis interval. The primary starts at 100 percent and decreases as the canary weight increases through each step.

## Verifying the Setup

Check that Flagger has initialized the canary correctly.

```bash
# Check canary status
kubectl get canary -n test

# Verify the TraefikService was created
kubectl get traefikservice -n test

# Inspect the primary and canary deployments
kubectl get deployments -n test
```

## Triggering a Canary Deployment

Update the container image to trigger a canary deployment.

```bash
kubectl set image deployment/podinfo \
  podinfo=stefanprodan/podinfo:6.2.0 -n test
```

Monitor the canary analysis.

```bash
# Watch the canary progression
kubectl get canary podinfo -n test -w

# View detailed events
kubectl describe canary podinfo -n test
```

Flagger will progressively increase the canary weight from 10 to 50 percent in increments of 10 percent, checking request success rate and request duration at each step. If all checks pass, the canary is promoted to primary.

## Conclusion

Configuring Flagger with Traefik TraefikService provides a clean integration for progressive delivery using Traefik's native weighted routing capabilities. The TraefikService resource gives Flagger fine-grained control over traffic splitting without requiring modifications to Ingress resources or additional service mesh components. This approach works well for teams already using Traefik as their ingress controller and looking to add automated canary deployments to their release process.
