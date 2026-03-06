# How to Deploy Kuma Service Mesh with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kuma, Service Mesh, GitOps, Kubernetes, Envoy, CNCF

Description: A step-by-step guide to deploying and managing the Kuma service mesh on Kubernetes using Flux CD for GitOps-driven operations.

---

## Introduction

Kuma is a CNCF service mesh built on top of Envoy proxy that supports both Kubernetes and universal (VM) environments. It offers features like mTLS, traffic routing, observability, and multi-zone deployments. Deploying Kuma through Flux CD allows you to manage the entire mesh lifecycle via Git, providing consistency and traceability.

This guide covers deploying Kuma in standalone mode on Kubernetes, configuring mesh policies, and managing the lifecycle through Flux CD.

## Prerequisites

Before starting, ensure you have:

- A Kubernetes cluster (v1.25 or later)
- Flux CD bootstrapped and connected to a Git repository
- kubectl access to the cluster
- Familiarity with Flux HelmRelease and Kustomization resources

## Adding the Kuma Helm Repository

Create a HelmRepository resource pointing to the official Kuma chart repository.

```yaml
# infrastructure/sources/kuma-helmrepo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: kuma
  namespace: flux-system
spec:
  interval: 1h
  url: https://kumahq.github.io/charts
```

## Creating the Kuma Namespace

Define the namespace where Kuma control plane components will run.

```yaml
# infrastructure/kuma/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: kuma-system
  labels:
    # Indicate this namespace is managed by Flux
    kuma.io/system-namespace: "true"
```

## Deploying the Kuma Control Plane

Use a HelmRelease to deploy the Kuma control plane.

```yaml
# infrastructure/kuma/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: kuma
  namespace: kuma-system
spec:
  interval: 30m
  chart:
    spec:
      chart: kuma
      version: "2.9.x"
      sourceRef:
        kind: HelmRepository
        name: kuma
        namespace: flux-system
      interval: 12h
  # Install CRDs as part of the Helm release
  install:
    crds: CreateReplace
    remediation:
      retries: 3
  upgrade:
    crds: CreateReplace
    remediation:
      retries: 3
  values:
    # Control plane configuration
    controlPlane:
      mode: standalone
      replicas: 1
      resources:
        requests:
          memory: "256Mi"
          cpu: "250m"
        limits:
          memory: "512Mi"
          cpu: "500m"
      # Enable the admin API
      apiServer:
        corsAllowedDomains:
          - "http://localhost:5681"
    # Configure the CNI plugin for transparent proxying
    cni:
      enabled: true
      # Use the init container approach instead of CNI
      chained: true
    # Configure the data plane proxy defaults
    dataPlane:
      resources:
        requests:
          memory: "64Mi"
          cpu: "50m"
        limits:
          memory: "128Mi"
          cpu: "100m"
    # Enable the ingress for external traffic
    ingress:
      enabled: false
    # Enable the egress for outbound traffic
    egress:
      enabled: false
```

## Creating the Flux Kustomization

Set up the Flux Kustomization to manage deployment ordering.

```yaml
# clusters/my-cluster/infrastructure/kuma.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kuma
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/kuma
  prune: true
  wait: true
  timeout: 10m
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: kuma-control-plane
      namespace: kuma-system
```

## Enabling Sidecar Injection

Kuma uses namespace annotations to enable automatic sidecar injection.

```yaml
# apps/demo/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: demo-app
  annotations:
    # Enable Kuma sidecar injection for all pods in this namespace
    kuma.io/sidecar-injection: enabled
  labels:
    # Associate this namespace with the default mesh
    kuma.io/mesh: default
```

## Deploying a Sample Application

Deploy a sample application that will automatically get a Kuma sidecar.

```yaml
# apps/demo/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-api
  namespace: demo-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend-api
  template:
    metadata:
      labels:
        app: backend-api
    spec:
      containers:
        - name: backend-api
          image: my-registry/backend-api:v1.0.0
          ports:
            - containerPort: 3000
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
---
apiVersion: v1
kind: Service
metadata:
  name: backend-api
  namespace: demo-app
spec:
  selector:
    app: backend-api
  ports:
    - port: 3000
      targetPort: 3000
      protocol: TCP
```

## Configuring the Default Mesh

Define the default Mesh resource with mTLS enabled.

```yaml
# infrastructure/kuma/mesh.yaml
apiVersion: kuma.io/v1alpha1
kind: Mesh
metadata:
  name: default
spec:
  # Enable mutual TLS with built-in certificate authority
  mtls:
    enabledBackend: ca-1
    backends:
      - name: ca-1
        type: builtin
        dpCert:
          rotation:
            # Rotate data plane certificates every 24 hours
            expiration: 24h
        conf:
          caCert:
            RSAbits: 2048
            expiration: 10y
  # Enable logging for all traffic
  logging:
    defaultBackend: stdout
    backends:
      - name: stdout
        type: file
        conf:
          path: /dev/stdout
  # Enable metrics collection
  metrics:
    enabledBackend: prometheus-1
    backends:
      - name: prometheus-1
        type: prometheus
        conf:
          port: 5670
          path: /metrics
          # Expose metrics on all interfaces
          skipMTLS: false
```

## Defining Traffic Permissions

Control service-to-service communication using TrafficPermission resources.

```yaml
# infrastructure/kuma/traffic-permission.yaml
apiVersion: kuma.io/v1alpha1
kind: TrafficPermission
metadata:
  name: allow-frontend-to-backend
mesh: default
spec:
  sources:
    # Allow traffic from the frontend service
    - match:
        kuma.io/service: frontend_demo-app_svc_8080
  destinations:
    # Route to the backend API service
    - match:
        kuma.io/service: backend-api_demo-app_svc_3000
```

## Setting Up Traffic Routing

Define traffic routing policies for canary deployments and A/B testing.

```yaml
# infrastructure/kuma/traffic-route.yaml
apiVersion: kuma.io/v1alpha1
kind: TrafficRoute
metadata:
  name: backend-api-route
mesh: default
spec:
  sources:
    - match:
        kuma.io/service: "*"
  destinations:
    - match:
        kuma.io/service: backend-api_demo-app_svc_3000
  conf:
    loadBalancer:
      # Use round-robin load balancing
      roundRobin: {}
    split:
      # Send 90% of traffic to the stable version
      - weight: 90
        destination:
          kuma.io/service: backend-api_demo-app_svc_3000
          version: stable
      # Send 10% of traffic to the canary version
      - weight: 10
        destination:
          kuma.io/service: backend-api_demo-app_svc_3000
          version: canary
```

## Configuring Circuit Breakers

Add circuit breaker policies to protect services from cascading failures.

```yaml
# infrastructure/kuma/circuit-breaker.yaml
apiVersion: kuma.io/v1alpha1
kind: CircuitBreaker
metadata:
  name: backend-api-circuit-breaker
mesh: default
spec:
  sources:
    - match:
        kuma.io/service: "*"
  destinations:
    - match:
        kuma.io/service: backend-api_demo-app_svc_3000
  conf:
    # Configure connection limits
    thresholds:
      maxConnections: 100
      maxPendingRequests: 100
      maxRequests: 100
      maxRetries: 3
    # Configure outlier detection
    outlierDetection:
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
      splitExternalAndLocalErrors: false
      detectors:
        totalFailures:
          consecutive: 5
        localOriginFailures:
          consecutive: 5
```

## Verifying the Deployment

After pushing manifests to Git, verify everything is working.

```bash
# Check Flux reconciliation status
flux get kustomizations kuma

# Verify the Kuma control plane is running
kubectl get pods -n kuma-system

# Check the mesh configuration
kubectl get meshes

# List all data plane proxies
kubectl get dataplaneinsights --all-namespaces

# Verify traffic permissions
kubectl get trafficpermissions

# Check sidecar injection is working
kubectl get pods -n demo-app -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{range .spec.containers[*]}{.name}{","}{end}{"\n"}{end}'
```

## Troubleshooting

Common issues and how to resolve them.

```bash
# Check if sidecar injection annotation is present
kubectl get namespace demo-app -o jsonpath='{.metadata.annotations}'

# View Kuma control plane logs
kubectl logs -n kuma-system -l app=kuma-control-plane --tail=100

# Inspect a specific data plane proxy configuration
kubectl get pod <pod-name> -n demo-app -o yaml | grep -A5 "kuma.io"

# Force Flux to reconcile
flux reconcile kustomization kuma --with-source
```

## Summary

Deploying Kuma service mesh with Flux CD provides a GitOps-driven approach to managing your service mesh infrastructure. With Kuma's Kubernetes-native CRDs and Flux's automated reconciliation, you can version-control mesh policies, traffic routes, and circuit breaker configurations. This approach ensures that all mesh changes are tracked, reviewed, and automatically applied to your clusters.
