# How to Deploy Fission Serverless with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Fission, Serverless, Functions, FaaS

Description: Deploy Fission serverless framework to Kubernetes using Flux CD to run functions with millisecond cold starts and GitOps-managed configuration.

---

## Introduction

Fission is a Kubernetes-native serverless framework designed for fast cold starts — typically under 100 milliseconds — by pre-warming function containers. It supports multiple language environments (Python, Node.js, Go, Java, and more) and provides a clean separation between function code, runtime environments, and triggers.

Managing Fission through Flux CD gives platform teams a reproducible deployment of the Fission control plane, while application teams can manage their function definitions, environments, and triggers declaratively in Git.

This guide covers deploying Fission on Kubernetes using Flux CD HelmRelease and defining functions as code.

## Prerequisites

- Kubernetes cluster (1.25+)
- Flux CD v2 bootstrapped to your Git repository
- kubectl and Fission CLI installed locally for testing

## Step 1: Create the Namespace and HelmRepository

```yaml
# clusters/my-cluster/fission/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: fission
  labels:
    app.kubernetes.io/managed-by: flux
---
# clusters/my-cluster/fission/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: fission
  namespace: flux-system
spec:
  interval: 12h
  url: https://fission.github.io/fission-charts/
```

## Step 2: Deploy Fission via HelmRelease

```yaml
# clusters/my-cluster/fission/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: fission
  namespace: fission
spec:
  interval: 1h
  chart:
    spec:
      chart: fission-all
      version: "1.20.*"
      sourceRef:
        kind: HelmRepository
        name: fission
        namespace: flux-system
      interval: 12h
  values:
    # Fission service type
    serviceType: ClusterIP
    # Router type for function invocations
    routerServiceType: LoadBalancer
    # Enable function logs via InfluxDB or Loki
    logger:
      enabled: true
    # Enable Prometheus integration
    prometheus:
      enabled: true
    # Pre-pool size for environments (reduce cold starts)
    executor:
      defaultIdleContainerCount: 2
    # Namespace for function pods
    functionNamespace: fission-fn
    builderNamespace: fission-builder
```

## Step 3: Wire Up the Flux Kustomization

```yaml
# clusters/my-cluster/fission/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - helmrepository.yaml
  - helmrelease.yaml
---
# clusters/my-cluster/flux-kustomization-fission.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: fission
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/fission
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: controller
      namespace: fission
```

## Step 4: Define Fission Resources in Git

Fission uses its own CRDs for Environments, Functions, and Triggers:

```yaml
# clusters/my-cluster/fission-apps/python-env.yaml
# Define a Python runtime environment
apiVersion: fission.io/v1
kind: Environment
metadata:
  name: python
  namespace: fission
spec:
  version: 3
  runtime:
    image: fission/python-env:3.9
  builder:
    image: fission/python-builder:3.9
    command: build
  # Keep 2 pods pre-warmed to eliminate cold starts
  poolsize: 2
  resources:
    requests:
      memory: "128Mi"
      cpu: "100m"
    limits:
      memory: "256Mi"
      cpu: "500m"
---
# clusters/my-cluster/fission-apps/hello-function.yaml
apiVersion: fission.io/v1
kind: Function
metadata:
  name: hello-python
  namespace: fission
spec:
  environment:
    name: python
    namespace: fission
  # Reference to the source package
  package:
    functionName: handler
    packageref:
      name: hello-pkg
      namespace: fission
      resourceversion: ""
  resources:
    requests:
      memory: "64Mi"
      cpu: "100m"
    limits:
      memory: "128Mi"
      cpu: "500m"
---
# clusters/my-cluster/fission-apps/http-trigger.yaml
apiVersion: fission.io/v1
kind: HTTPTrigger
metadata:
  name: hello-http
  namespace: fission
spec:
  # HTTP route
  host: ""
  relativeurl: /hello
  method: GET
  functionref:
    type: name
    name: hello-python
  # Canary config for gradual rollouts
  createingress: true
  ingressconfig:
    host: fission.example.com
    path: /hello
    tls: ""
    annotations:
      kubernetes.io/ingress.class: nginx
```

## Step 5: Create the Flux Kustomization for Functions

```yaml
# clusters/my-cluster/flux-kustomization-fission-apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: fission-apps
  namespace: flux-system
spec:
  interval: 5m
  dependsOn:
    - name: fission
  path: ./clusters/my-cluster/fission-apps
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Step 6: Test the Function

```bash
# Verify Fission deployment
flux get kustomizations fission fission-apps

# Configure Fission CLI
export FISSION_ROUTER=$(kubectl get svc router -n fission \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# List functions
fission function list

# Invoke function
curl http://$FISSION_ROUTER/hello
# Response: Hello, World!

# Check function logs
fission function log -f hello-python
```

## Best Practices

- Set `poolsize: 2` or higher on your Environments to keep pre-warmed containers ready, achieving Fission's sub-100ms cold start promise.
- Use the Fission `Environment` resource's `builder` section to compile function code at deploy time rather than at invocation time, reducing runtime overhead.
- Manage function source code in a separate Git repository and use Flux's `OCIRepository` to pull pre-built function packages from an OCI registry.
- Define `TimeTrigger` and `MessageQueueTrigger` CRDs for scheduled and message-driven functions alongside HTTP triggers for full serverless patterns.
- Apply resource requests and limits on both Environment and Function specs to prevent runaway function containers from starving other workloads.

## Conclusion

Fission deployed through Flux CD combines fast serverless function execution with GitOps governance. Function environments, definitions, and HTTP triggers are all declared in Git, making the entire serverless platform auditable and reproducible. Teams get the speed benefits of pre-warmed function containers with the operational consistency of a GitOps workflow.
