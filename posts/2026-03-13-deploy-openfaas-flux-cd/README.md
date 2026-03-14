# How to Deploy OpenFaaS with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, OpenFaaS, Serverless, Functions as a Service, FaaS

Description: Deploy OpenFaaS Functions as a Service platform using Flux CD to manage serverless function deployments with GitOps-driven lifecycle management.

---

## Introduction

OpenFaaS (Functions as a Service) is a popular open-source serverless framework for Kubernetes that lets you deploy functions in any language as containers. It provides a built-in UI, REST API, and CLI (faas-cli) for managing functions, along with auto-scaling based on request throughput.

Deploying OpenFaaS through Flux CD gives you a GitOps-managed serverless platform where both the OpenFaaS infrastructure and the functions running on it are version-controlled. Function updates become pull requests that are automatically applied to the cluster.

This guide covers deploying OpenFaaS CE (Community Edition) using Flux CD HelmRelease and deploying a sample function.

## Prerequisites

- Kubernetes cluster (1.24+)
- Flux CD v2 bootstrapped to your Git repository
- A container registry for storing function images
- Basic familiarity with serverless/FaaS concepts

## Step 1: Create Namespaces

OpenFaaS uses two namespaces by default - one for the platform, one for functions:

```yaml
# clusters/my-cluster/openfaas/namespaces.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: openfaas
  labels:
    role: openfaas-system
    app.kubernetes.io/managed-by: flux
---
apiVersion: v1
kind: Namespace
metadata:
  name: openfaas-fn
  labels:
    role: openfaas-fn
    app.kubernetes.io/managed-by: flux
```

## Step 2: Create the HelmRepository

```yaml
# clusters/my-cluster/openfaas/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: openfaas
  namespace: flux-system
spec:
  interval: 12h
  url: https://openfaas.github.io/faas-netes/
```

## Step 3: Deploy OpenFaaS via HelmRelease

```yaml
# clusters/my-cluster/openfaas/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: openfaas
  namespace: openfaas
spec:
  interval: 1h
  chart:
    spec:
      chart: openfaas
      version: "14.2.*"
      sourceRef:
        kind: HelmRepository
        name: openfaas
        namespace: flux-system
      interval: 12h
  values:
    # Deploy OpenFaaS gateway
    gateway:
      replicas: 1
      # Require auth for all API calls
      directFunctions: false
      resources:
        requests:
          memory: "120Mi"
          cpu: "50m"
    # Enable Prometheus scraping
    prometheus:
      create: true
    # Enable Alertmanager for autoscaling triggers
    alertmanager:
      create: true
    # Namespace for functions
    functionNamespace: openfaas-fn
    # Set basic auth password (override with secret in production)
    generateBasicAuth: true
    # Enable async function invocations with NATS
    nats:
      channel: "faas-request"
      external:
        enabled: false
    # Configure autoscaling
    autoscaler:
      enabled: true
      replicas: 1
```

## Step 4: Retrieve the Admin Password

```bash
# After deployment, get the auto-generated basic auth password
PASSWORD=$(kubectl get secret -n openfaas basic-auth \
  -o jsonpath="{.data.basic-auth-password}" | base64 --decode)
echo "OpenFaaS Password: $PASSWORD"
```

## Step 5: Deploy a Function via Flux

Manage function deployments as Kubernetes resources in Git:

```yaml
# clusters/my-cluster/openfaas-functions/figlet.yaml
# OpenFaaS Function custom resource
apiVersion: openfaas.com/v1
kind: Function
metadata:
  name: figlet
  namespace: openfaas-fn
spec:
  name: figlet
  # Use a pre-built function image
  image: ghcr.io/openfaas/figlet:latest
  # Scale from 0 to N replicas based on load
  labels:
    com.openfaas.scale.min: "1"
    com.openfaas.scale.max: "5"
    com.openfaas.scale.factor: "20"
  # Environment variables for the function
  environment:
    write_debug: "true"
  resources:
    requests:
      memory: "64Mi"
      cpu: "50m"
    limits:
      memory: "128Mi"
      cpu: "200m"
---
# clusters/my-cluster/flux-kustomization-openfaas-functions.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: openfaas-functions
  namespace: flux-system
spec:
  interval: 5m
  dependsOn:
    - name: openfaas
  path: ./clusters/my-cluster/openfaas-functions
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Step 6: Verify and Test Functions

```bash
# Check OpenFaaS deployment
flux get kustomizations openfaas

# Port-forward the gateway
kubectl port-forward svc/gateway 8080:8080 -n openfaas

# Login with faas-cli
faas-cli login --username admin --password "$PASSWORD" --gateway http://localhost:8080

# List deployed functions
faas-cli list --gateway http://localhost:8080

# Invoke the figlet function
echo "GitOps" | faas-cli invoke figlet --gateway http://localhost:8080
```

## Best Practices

- Use the `Function` CRD to manage all functions declaratively in Git, rather than using `faas-cli deploy` imperatively.
- Set `com.openfaas.scale.min: "1"` for latency-sensitive functions to keep at least one replica warm, avoiding cold start delays.
- Store the OpenFaaS basic auth credentials in a Kubernetes Secret managed by Flux's SOPS integration, not plain text in values.
- Enable async invocations with NATS for long-running functions to avoid gateway timeouts.
- Use Flux image update automation to automatically detect and deploy new function container image tags from your registry.

## Conclusion

OpenFaaS deployed and managed by Flux CD provides a complete serverless platform where both the FaaS infrastructure and individual functions are version-controlled. Function deployments become pull requests, autoscaling policies are tracked in Git, and the cluster self-heals any configuration drift - giving your development teams a reliable serverless platform with GitOps-level governance.
