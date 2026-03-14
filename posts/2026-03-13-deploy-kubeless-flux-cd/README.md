# How to Deploy Kubeless with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Kubeless, Serverless, Functions, FaaS

Description: Deploy Kubeless serverless framework to Kubernetes using Flux CD to run native Kubernetes functions with CRD-based management.

---

## Introduction

Kubeless is a Kubernetes-native serverless framework that leverages Kubernetes primitives directly — functions are deployed as Kubernetes Deployments with a CRD layer on top. This approach makes Kubeless extremely lightweight with minimal overhead, and functions inherit all Kubernetes features including RBAC, network policies, and horizontal pod autoscaling.

By managing Kubeless through Flux CD, both the framework and the functions deployed on it are fully version-controlled. Function updates flow through your Git repository, and the cluster state is continuously reconciled.

This guide covers deploying Kubeless on Kubernetes using Flux CD and defining functions as GitOps-managed resources.

## Prerequisites

- Kubernetes cluster (1.24+)
- Flux CD v2 bootstrapped to your Git repository
- kubectl access to the cluster

## Step 1: Deploy Kubeless via Manifest

Kubeless is typically installed via a manifest. We'll manage it with a GitRepository source pointing to the official release:

```yaml
# clusters/my-cluster/kubeless/gitrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: kubeless-manifests
  namespace: flux-system
spec:
  interval: 12h
  url: https://github.com/vmware-archive/kubeless
  ref:
    tag: v1.0.8
  ignore: |
    /*
    !/manifests/
```

## Step 2: Create the Kubeless Namespace

```yaml
# clusters/my-cluster/kubeless/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: kubeless
  labels:
    app.kubernetes.io/managed-by: flux
```

## Step 3: Apply the Kubeless Controller

```yaml
# clusters/my-cluster/flux-kustomization-kubeless.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kubeless
  namespace: flux-system
spec:
  interval: 10m
  path: ./manifests
  prune: false   # Never prune CRDs
  sourceRef:
    kind: GitRepository
    name: kubeless-manifests
  patches:
    # Patch resources for the controller deployment
    - patch: |
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: kubeless-controller-manager
          namespace: kubeless
        spec:
          template:
            spec:
              containers:
                - name: kubeless-controller-manager
                  resources:
                    requests:
                      memory: "128Mi"
                      cpu: "100m"
                    limits:
                      memory: "256Mi"
                      cpu: "500m"
      target:
        kind: Deployment
        name: kubeless-controller-manager
```

## Step 4: Deploy a Python Function

```yaml
# clusters/my-cluster/kubeless-functions/hello-function.yaml
apiVersion: kubeless.io/v1beta1
kind: Function
metadata:
  name: hello-python
  namespace: default
  labels:
    created-by: kubeless
    function: hello-python
spec:
  runtime: python3.8
  # Function handler: <filename>.<function_name>
  handler: hello.handler
  # Inline function source code
  function: |
    import json

    def handler(event, context):
        name = event['data'].get('name', 'World')
        return f'Hello, {name}! Deployed via Flux CD and Kubeless.'

  # Function dependencies
  deps: ""

  # Deployment configuration
  deployment:
    spec:
      replicas: 2
      template:
        spec:
          containers:
            - name: hello-python
              resources:
                requests:
                  memory: "64Mi"
                  cpu: "50m"
                limits:
                  memory: "128Mi"
                  cpu: "200m"

  # Horizontal pod autoscaler
  horizontalPodAutoscaler:
    spec:
      maxReplicas: 10
      minReplicas: 1
      metrics:
        - type: Resource
          resource:
            name: cpu
            target:
              type: Utilization
              averageUtilization: 70
```

## Step 5: Add an HTTP Trigger

```yaml
# clusters/my-cluster/kubeless-functions/http-trigger.yaml
apiVersion: kubeless.io/v1beta1
kind: HTTPTrigger
metadata:
  name: hello-http-trigger
  namespace: default
spec:
  # Route function via Ingress
  routeTimeoutSeconds: 60
  serviceName: hello-python
  servicePort: 8080
  path: /hello
  hostname: kubeless.example.com
  tls: false
  corsEnable: true
```

## Step 6: Create Flux Kustomization for Functions

```yaml
# clusters/my-cluster/kubeless-functions/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - hello-function.yaml
  - http-trigger.yaml
---
# clusters/my-cluster/flux-kustomization-kubeless-functions.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kubeless-functions
  namespace: flux-system
spec:
  interval: 5m
  dependsOn:
    - name: kubeless
  path: ./clusters/my-cluster/kubeless-functions
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Step 7: Test the Function

```bash
# Verify Kubeless is running
flux get kustomizations kubeless kubeless-functions

# List deployed functions
kubectl get functions -n default

# Port-forward and invoke the function
kubectl port-forward svc/hello-python 8080:8080 -n default

curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '{"name": "GitOps"}'
# Response: Hello, GitOps! Deployed via Flux CD and Kubeless.
```

## Best Practices

- Use `prune: false` on the Kubeless CRD Kustomization to prevent Flux from accidentally deleting CRDs when manifest files are reorganized.
- For production functions, avoid inline source code in the Function spec — instead build and push a container image and reference it in `spec.deployment`.
- Set explicit CPU and memory requests and limits on function deployments to avoid resource contention with other cluster workloads.
- Use Kubeless's `CronJobTrigger` CRD to define scheduled function invocations declaratively in Git alongside your HTTP triggers.
- Monitor function invocation metrics via the built-in Prometheus endpoint on each function service for visibility into latency and error rates.

## Conclusion

Kubeless managed by Flux CD delivers a lightweight, Kubernetes-native serverless experience with full GitOps lifecycle management. Functions, triggers, and autoscaling policies are all defined as code in your Git repository, reconciled automatically by Flux, and inherently benefit from Kubernetes-native features like RBAC and network policies.
