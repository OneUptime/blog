# How to Deploy Knative Serving with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Knative, Serverless, Knative Serving, HelmRelease

Description: Deploy Knative Serving for serverless workloads using Flux CD HelmRelease to enable scale-to-zero and traffic-splitting for containerized applications.

---

## Introduction

Knative Serving is a Kubernetes extension that adds serverless capabilities including automatic scale-to-zero, request-driven autoscaling, and traffic splitting for blue/green and canary deployments. It abstracts away Deployments, Services, and Ingress into a simple `Service` resource that manages the full application lifecycle.

Managing Knative through Flux CD ensures the platform components - CRDs, controller, and networking layer - are consistently deployed and version-controlled. Application teams can then deploy Knative Services through the same GitOps pipeline, giving you end-to-end auditability from platform to workload.

This guide covers deploying Knative Serving with Kourier as the networking layer using Flux CD Kustomization.

## Prerequisites

- Kubernetes cluster (1.33+)
- Flux CD v2 bootstrapped to your Git repository
- A domain name or wildcard DNS for Knative routes (or use `<external-ip>.sslip.io` for testing)

## Step 1: Create the Namespace

```yaml
# clusters/my-cluster/knative/namespace.yaml

apiVersion: v1
kind: Namespace
metadata:
  name: knative-serving
  labels:
    app.kubernetes.io/managed-by: flux
```

## Step 2: Create GitRepositories for Knative Manifests

For Knative, the recommended GitOps approach is to apply the official YAML manifests via Flux Kustomizations:

```yaml
# clusters/my-cluster/knative/gitrepository-knative.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: knative-serving-manifests
  namespace: flux-system
spec:
  interval: 12h
  url: https://github.com/knative/serving
  ref:
    tag: knative-v1.22.0
  sparseCheckout:
    - config/core
    - config/post-install
---
# clusters/my-cluster/knative/gitrepository-kourier.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: knative-net-kourier
  namespace: flux-system
spec:
  interval: 12h
  url: https://github.com/knative-extensions/net-kourier
  ref:
    tag: knative-v1.22.0
  sparseCheckout:
    - config
```

## Step 3: Apply Knative Serving Core

```yaml
# clusters/my-cluster/knative/kustomization-serving.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: knative-serving
  namespace: flux-system
spec:
  interval: 10m
  path: ./config/core
  prune: false
  sourceRef:
    kind: GitRepository
    name: knative-serving-manifests
  patches:
    # Configure the domain for Knative routes
    - patch: |
        apiVersion: v1
        kind: ConfigMap
        metadata:
          name: config-domain
          namespace: knative-serving
        data:
          # Use your wildcard DNS domain, or <external-ip>.sslip.io for testing
          "<your-domain>": ""
      target:
        kind: ConfigMap
        name: config-domain
    # Configure Kourier as the default ingress class
    - patch: |
        apiVersion: v1
        kind: ConfigMap
        metadata:
          name: config-network
          namespace: knative-serving
        data:
          ingress-class: kourier.ingress.networking.knative.dev
      target:
        kind: ConfigMap
        name: config-network
```

## Step 4: Deploy Kourier as the Networking Layer

```yaml
# clusters/my-cluster/knative/kustomization-kourier.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: knative-kourier
  namespace: flux-system
spec:
  interval: 10m
  dependsOn:
    - name: knative-serving
  path: ./config
  prune: true
  sourceRef:
    kind: GitRepository
    name: knative-net-kourier
```

## Step 5: Deploy a Knative Service

```yaml
# clusters/my-cluster/apps/hello-ksvc.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: hello-world
  namespace: default
spec:
  template:
    metadata:
      annotations:
        # Wait 60 seconds before applying scale-down decisions
        autoscaling.knative.dev/scale-down-delay: "60s"
        # Target 10 concurrent requests per pod before scaling
        autoscaling.knative.dev/target: "10"
    spec:
      containers:
        - image: gcr.io/knative-samples/helloworld-go:v1.0
          env:
            - name: TARGET
              value: "GitOps with Flux"
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "256Mi"
```

## Step 6: Verify Knative Serving

```bash
# Check Knative serving components
flux get kustomizations knative-serving knative-kourier

# Verify Knative pods
kubectl get pods -n knative-serving

# Check Knative service
kubectl get ksvc hello-world -n default

# Test invocation
curl http://hello-world.default.<your-domain>
# Response: Hello GitOps with Flux!
```

## Best Practices

- Use `dependsOn` in Flux Kustomizations to ensure Knative Serving is applied before networking and services that depend on it.
- Set `prune: false` for Kustomizations that include CRDs - Flux should never delete CRDs as that would destroy all custom resources.
- Configure the Knative autoscaler targets per-service rather than globally to tune scale-to-zero behavior for each workload's latency requirements.
- Use traffic splitting in Knative Services for canary rollouts: define named revisions and set traffic weights in your Git-managed Service spec.
- Monitor cold start latency with Prometheus and configure `autoscaling.knative.dev/min-scale: "1"` for latency-sensitive services that cannot tolerate scale-from-zero delays.

## Conclusion

Deploying Knative Serving through Flux CD gives your platform team a GitOps-managed serverless layer on Kubernetes. Application teams can deploy scale-to-zero workloads through pull requests, and the entire Knative platform - from CRDs to networking - is continuously reconciled against your Git repository.
