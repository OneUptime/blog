# How to Manage Gateway API Resources with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, kubernetes, gateway api, gitops, traffic management, httproute

Description: Learn how to deploy and manage Kubernetes Gateway API resources using Flux CD for advanced traffic routing, load balancing, and multi-tenant networking.

---

## Introduction

The Kubernetes Gateway API is the next-generation replacement for Ingress, offering a more expressive, extensible, and role-oriented approach to managing network traffic. It introduces resources like Gateway, HTTPRoute, GRPCRoute, and TCPRoute that provide fine-grained control over traffic routing. Managing Gateway API resources through Flux CD brings GitOps best practices to your networking layer.

This guide covers installing Gateway API CRDs, deploying gateway controllers, and configuring routes with Flux CD.

## Prerequisites

- Kubernetes cluster v1.26 or later
- Flux CD v2 installed and bootstrapped
- A Gateway API-compatible controller (Envoy Gateway, Istio, or Cilium)
- kubectl access to the cluster

## Installing Gateway API CRDs with Flux

```yaml
# infrastructure/gateway-api/crds.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: gateway-api-crds
  namespace: flux-system
spec:
  interval: 30m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/gateway-api/crds
  prune: false
  # Never prune CRDs to avoid data loss
  wait: true
```

```yaml
# infrastructure/gateway-api/crds/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  # Install the standard Gateway API CRDs
  - https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.2.0/standard-install.yaml
```

## Installing Envoy Gateway with Flux

```yaml
# infrastructure/gateway-api/envoy-gateway-helmrepo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: envoy-gateway
  namespace: flux-system
spec:
  interval: 1h
  url: https://charts.envoyproxy.io
```

```yaml
# infrastructure/gateway-api/envoy-gateway-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: envoy-gateway
  namespace: envoy-gateway-system
spec:
  interval: 30m
  chart:
    spec:
      chart: gateway-helm
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: envoy-gateway
        namespace: flux-system
  install:
    createNamespace: true
  values:
    deployment:
      replicas: 2
      resources:
        requests:
          cpu: 100m
          memory: 256Mi
```

## Defining a GatewayClass

```yaml
# infrastructure/gateway-api/gatewayclass.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: envoy-gateway
spec:
  # Reference the controller that implements this class
  controllerName: gateway.envoyproxy.io/gatewayclass-controller
  description: "Envoy Gateway managed by Flux CD"
```

## Creating a Gateway

```yaml
# infrastructure/gateway-api/gateway.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: production-gateway
  namespace: production
  labels:
    app.kubernetes.io/managed-by: flux
spec:
  gatewayClassName: envoy-gateway
  listeners:
    # HTTP listener that redirects to HTTPS
    - name: http
      protocol: HTTP
      port: 80
      allowedRoutes:
        namespaces:
          from: Same
    # HTTPS listener with TLS termination
    - name: https
      protocol: HTTPS
      port: 443
      tls:
        mode: Terminate
        certificateRefs:
          - kind: Secret
            name: production-tls-cert
      allowedRoutes:
        namespaces:
          # Allow routes from specific namespaces
          from: Selector
          selector:
            matchLabels:
              gateway-access: "true"
```

## Multi-Tenant Gateway

Allow different teams to attach routes to a shared gateway:

```yaml
# infrastructure/gateway-api/shared-gateway.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: shared-gateway
  namespace: gateway-infra
spec:
  gatewayClassName: envoy-gateway
  listeners:
    # Team A listener
    - name: team-a
      hostname: "*.team-a.example.com"
      protocol: HTTPS
      port: 443
      tls:
        mode: Terminate
        certificateRefs:
          - kind: Secret
            name: team-a-wildcard-tls
      allowedRoutes:
        namespaces:
          from: Selector
          selector:
            matchLabels:
              team: team-a
    # Team B listener
    - name: team-b
      hostname: "*.team-b.example.com"
      protocol: HTTPS
      port: 443
      tls:
        mode: Terminate
        certificateRefs:
          - kind: Secret
            name: team-b-wildcard-tls
      allowedRoutes:
        namespaces:
          from: Selector
          selector:
            matchLabels:
              team: team-b
```

## HTTPRoute for Basic Routing

```yaml
# apps/web-app/httproute.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: web-app-route
  namespace: production
spec:
  parentRefs:
    - name: production-gateway
      namespace: production
  hostnames:
    - "app.example.com"
  rules:
    # Route all traffic to the web app
    - matches:
        - path:
            type: PathPrefix
            value: /
      backendRefs:
        - name: web-app
          port: 80
          weight: 100
```

## HTTPRoute with Traffic Splitting

```yaml
# apps/web-app/httproute-canary.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: web-app-canary-route
  namespace: production
spec:
  parentRefs:
    - name: production-gateway
  hostnames:
    - "app.example.com"
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /
      backendRefs:
        # 90% to stable version
        - name: web-app-stable
          port: 80
          weight: 90
        # 10% to canary version
        - name: web-app-canary
          port: 80
          weight: 10
```

## HTTPRoute with Header-Based Routing

```yaml
# apps/api/httproute-headers.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: api-header-route
  namespace: production
spec:
  parentRefs:
    - name: production-gateway
  hostnames:
    - "api.example.com"
  rules:
    # Route v2 API requests based on header
    - matches:
        - headers:
            - name: X-API-Version
              value: "v2"
          path:
            type: PathPrefix
            value: /api
      backendRefs:
        - name: api-v2
          port: 8080
    # Default to v1
    - matches:
        - path:
            type: PathPrefix
            value: /api
      backendRefs:
        - name: api-v1
          port: 8080
```

## HTTPRoute with Request Modification

```yaml
# apps/api/httproute-filters.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: api-filtered-route
  namespace: production
spec:
  parentRefs:
    - name: production-gateway
  hostnames:
    - "api.example.com"
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /legacy
      filters:
        # Redirect legacy paths to new paths
        - type: RequestRedirect
          requestRedirect:
            path:
              type: ReplacePrefixMatch
              replacePrefixMatch: /v2
            statusCode: 301
    - matches:
        - path:
            type: PathPrefix
            value: /v2
      filters:
        # Add response headers
        - type: ResponseHeaderModifier
          responseHeaderModifier:
            add:
              - name: X-Frame-Options
                value: DENY
              - name: X-Content-Type-Options
                value: nosniff
      backendRefs:
        - name: api-v2
          port: 8080
```

## GRPCRoute for gRPC Services

```yaml
# apps/grpc-service/grpcroute.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: GRPCRoute
metadata:
  name: grpc-service-route
  namespace: production
spec:
  parentRefs:
    - name: production-gateway
  hostnames:
    - "grpc.example.com"
  rules:
    - matches:
        - method:
            service: myorg.UserService
            method: GetUser
      backendRefs:
        - name: user-service
          port: 50051
    - matches:
        - method:
            service: myorg.OrderService
      backendRefs:
        - name: order-service
          port: 50051
```

## Flux Kustomization for Gateway API Resources

```yaml
# clusters/my-cluster/gateway-api.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: gateway-api
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/gateway-api
  prune: true
  wait: true
  dependsOn:
    - name: gateway-api-crds
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: gateway-routes
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/routes/production
  prune: true
  wait: true
  dependsOn:
    - name: gateway-api
    - name: apps
```

## Verifying Gateway API Resources

```bash
# Check GatewayClass status
kubectl get gatewayclass

# Check Gateway status and assigned addresses
kubectl get gateways --all-namespaces
kubectl describe gateway production-gateway -n production

# List all HTTPRoutes
kubectl get httproutes --all-namespaces

# Verify route attachment to gateway
kubectl describe httproute web-app-route -n production

# Check Flux reconciliation
flux get kustomizations gateway-api
flux get kustomizations gateway-routes
```

## Best Practices

1. Use GatewayClass to standardize gateway implementations across teams
2. Leverage namespace selectors on Gateway listeners for multi-tenant isolation
3. Use weight-based traffic splitting in HTTPRoutes for canary deployments
4. Implement request/response header modification for security headers
5. Separate Gateway infrastructure from route definitions for role-based ownership
6. Never prune Gateway API CRDs to prevent accidental data loss

## Conclusion

The Kubernetes Gateway API with Flux CD provides a powerful, role-oriented approach to managing network traffic. Its expressive routing capabilities, combined with GitOps practices, enable teams to independently manage their routing rules while platform teams control the gateway infrastructure. This separation of concerns, backed by version control and automated reconciliation, makes Gateway API with Flux CD ideal for multi-team Kubernetes environments.
