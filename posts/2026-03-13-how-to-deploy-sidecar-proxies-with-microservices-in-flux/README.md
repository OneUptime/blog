# How to Deploy Sidecar Proxies with Microservices in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Sidecar, Envoy, Service Mesh, Microservices, Kustomization

Description: Learn how to inject Envoy or other sidecar proxies alongside microservices using Flux CD and Kustomize patch strategies.

---

## Introduction

Sidecar proxies like Envoy, Linkerd, and Nginx provide cross-cutting concerns such as mutual TLS, traffic management, observability, and circuit breaking without modifying application code. In a GitOps workflow with Flux CD, you want sidecar proxy configuration to live in Git alongside your service manifests, so the same deployment pipeline that manages your application also manages its networking layer.

There are two common patterns for sidecar injection in Kubernetes: automatic injection via a mutating admission webhook (used by Istio and Linkerd) and manual injection where you explicitly define the sidecar container in your Pod spec. Flux CD works well with both patterns. For manual injection, Kustomize strategic merge patches allow you to add sidecar containers to any Deployment without modifying the base manifest.

In this guide you will learn how to configure automatic Envoy sidecar injection for a microservice namespace managed by Flux, and how to use Kustomize patches to manually add a sidecar proxy to specific services when you want precise control without a service mesh.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- `kubectl` and `flux` CLI tools installed
- Either Istio/Envoy installed in the cluster or a plan to deploy it via Flux
- Basic understanding of Kubernetes Pod specs and Kustomize patches

## Step 1: Deploy Envoy Proxy Infrastructure with Flux

First, deploy the Envoy proxy infrastructure (using Istio as an example).

```yaml
# clusters/production/infrastructure/istio-base-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: istio-base
  namespace: flux-system
spec:
  interval: 1h
  targetNamespace: istio-system
  createNamespace: true
  chart:
    spec:
      chart: base
      version: "1.20.x"
      sourceRef:
        kind: HelmRepository
        name: istio
---
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: istiod
  namespace: flux-system
spec:
  interval: 1h
  targetNamespace: istio-system
  chart:
    spec:
      chart: istiod
      version: "1.20.x"
      sourceRef:
        kind: HelmRepository
        name: istio
  dependsOn:
    - name: istio-base
  values:
    pilot:
      resources:
        requests:
          cpu: 200m
          memory: 256Mi
    meshConfig:
      # Enable access logging
      accessLogFile: /dev/stdout
      # Enable distributed tracing
      enableTracing: true
      defaultConfig:
        tracing:
          zipkin:
            address: zipkin.observability:9411
```

## Step 2: Enable Automatic Sidecar Injection via Namespace Label

Label the namespace where your microservices run to enable automatic Envoy injection.

```yaml
# apps/microservices/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: microservices
  labels:
    # Istio will automatically inject Envoy into all pods in this namespace
    istio-injection: enabled
    # Linkerd alternative:
    # linkerd.io/inject: enabled
```

```yaml
# clusters/production/apps/namespace-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-namespaces
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: app-repo
  path: ./apps/microservices
  prune: true
  # Namespaces must exist before services deploy
  dependsOn:
    - name: istiod
```

## Step 3: Configure Per-Pod Injection Override

Override injection settings for specific pods when needed.

```yaml
# apps/microservices/backend-api/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-api
  namespace: microservices
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend-api
  template:
    metadata:
      labels:
        app: backend-api
      annotations:
        # Explicitly enable injection on this pod (redundant if namespace has label)
        sidecar.istio.io/inject: "true"
        # Configure proxy resource limits
        sidecar.istio.io/proxyCPU: "100m"
        sidecar.istio.io/proxyMemory: "128Mi"
        sidecar.istio.io/proxyCPULimit: "500m"
        sidecar.istio.io/proxyMemoryLimit: "256Mi"
    spec:
      containers:
        - name: backend-api
          image: myregistry/backend-api:v2.5.0
          ports:
            - containerPort: 8080
```

## Step 4: Manual Sidecar Injection with Kustomize Patches

When you need a standalone Envoy proxy (without a service mesh), use a Kustomize strategic merge patch.

```yaml
# apps/microservices/backend-api/sidecar-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-api
  namespace: microservices
spec:
  template:
    spec:
      # Add the Envoy sidecar container
      containers:
        - name: envoy-proxy
          image: envoyproxy/envoy:v1.28-latest
          args:
            - -c
            - /etc/envoy/envoy.yaml
            - --log-level
            - info
          ports:
            - containerPort: 9901
              name: admin
            - containerPort: 15001
              name: outbound
          volumeMounts:
            - name: envoy-config
              mountPath: /etc/envoy
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 200m
              memory: 128Mi
      # Mount the Envoy configuration
      volumes:
        - name: envoy-config
          configMap:
            name: envoy-config
```

```yaml
# apps/microservices/backend-api/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - deployment.yaml
  - service.yaml
  - envoy-configmap.yaml

# Apply the sidecar patch to add Envoy
patches:
  - path: sidecar-patch.yaml
    target:
      kind: Deployment
      name: backend-api
```

## Step 5: Configure Envoy as a Traffic Interceptor

```yaml
# apps/microservices/backend-api/envoy-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: envoy-config
  namespace: microservices
data:
  envoy.yaml: |
    admin:
      address:
        socket_address:
          address: 0.0.0.0
          port_value: 9901

    static_resources:
      listeners:
        - name: inbound_listener
          address:
            socket_address:
              address: 0.0.0.0
              port_value: 15001
          filter_chains:
            - filters:
                - name: envoy.filters.network.http_connection_manager
                  typed_config:
                    "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                    stat_prefix: inbound_http
                    route_config:
                      virtual_hosts:
                        - name: backend
                          domains: ["*"]
                          routes:
                            - match:
                                prefix: "/"
                              route:
                                cluster: local_backend
                    http_filters:
                      - name: envoy.filters.http.router
                        typed_config:
                          "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

      clusters:
        - name: local_backend
          connect_timeout: 0.25s
          type: STATIC
          load_assignment:
            cluster_name: local_backend
            endpoints:
              - lb_endpoints:
                  - endpoint:
                      address:
                        socket_address:
                          address: 127.0.0.1
                          port_value: 8080
```

## Step 6: Apply and Verify Sidecar Injection

```bash
# Apply the namespace first so injection label is set
kubectl apply -f apps/microservices/namespace.yaml

# Apply the microservice with sidecar patch
flux reconcile kustomization backend-api --with-source

# Verify the sidecar was injected (should see 2 containers)
kubectl get pods -n microservices
# NAME                           READY   STATUS    RESTARTS
# backend-api-7d4f8c9b5d-xk2p9   2/2     Running   0

# Inspect the injected sidecar
kubectl describe pod -n microservices -l app=backend-api | grep -A5 "Containers:"

# Check Envoy admin interface
kubectl port-forward -n microservices deploy/backend-api 9901:9901
curl localhost:9901/stats
```

## Best Practices

- Use namespace-level injection labels for automatic injection in service mesh environments
- Keep Envoy configuration in a versioned ConfigMap managed by Flux alongside the service
- Apply resource limits to sidecar containers to prevent them from starving the main application
- Use `dependsOn` to ensure the service mesh control plane is ready before deploying services with sidecar injection
- Test sidecar injection in a dev namespace before rolling out to production
- Monitor sidecar resource usage separately from application containers using pod-level metrics

## Conclusion

Deploying sidecar proxies with microservices using Flux CD brings networking configuration under GitOps control. Whether you rely on automatic injection from Istio or Linkerd, or manually inject Envoy with Kustomize patches, Flux ensures the proxy infrastructure is deployed in the correct order and that proxy configuration is version-controlled alongside your application code. This approach makes your service networking as reproducible and auditable as your application deployments.
