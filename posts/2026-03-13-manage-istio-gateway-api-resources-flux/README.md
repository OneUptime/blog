# How to Manage Istio Gateway API Resources with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Istio, Gateway API, HTTPRoute, Service Mesh

Description: Manage Kubernetes Gateway API resources for Istio using Flux CD to configure ingress and service-to-service traffic routing declaratively.

---

## Introduction

The Kubernetes Gateway API is the successor to Ingress, providing a richer, more expressive API for managing ingress and east-west traffic. Istio supports the Gateway API natively, enabling teams to configure HTTP routes, TLS termination, traffic splitting, and header-based routing using standardized Kubernetes resources.

Managing Gateway API resources through Flux CD means your traffic routing rules - Gateway, HTTPRoute, TCPRoute - are all version-controlled. Rolling out a canary deployment or adding a new route requires a pull request, not manual `kubectl apply` commands.

This guide covers installing the Gateway API CRDs and managing Istio Gateway API resources with Flux CD.

## Prerequisites

- Kubernetes cluster with Istio installed (1.12+ for Gateway API support)
- Flux CD v2 bootstrapped to your Git repository
- Gateway API CRDs installed in the cluster

## Step 1: Install Gateway API CRDs

```yaml
# clusters/my-cluster/gateway-api/gitrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: gateway-api
  namespace: flux-system
spec:
  interval: 12h
  url: https://github.com/kubernetes-sigs/gateway-api
  ref:
    tag: v1.1.0
  ignore: |
    /*
    !/config/crd/experimental/
---
# clusters/my-cluster/gateway-api/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: gateway-api-crds
  namespace: flux-system
spec:
  interval: 1h
  path: ./config/crd/experimental
  prune: false   # Never prune CRDs
  sourceRef:
    kind: GitRepository
    name: gateway-api
```

## Step 2: Create a Gateway for Ingress

```yaml
# clusters/my-cluster/apps/gateway.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: main-gateway
  namespace: istio-system
spec:
  # Istio's GatewayClass
  gatewayClassName: istio
  listeners:
    - name: http
      port: 80
      protocol: HTTP
      allowedRoutes:
        namespaces:
          from: Selector
          selector:
            matchLabels:
              gateway-access: "true"
    - name: https
      port: 443
      protocol: HTTPS
      tls:
        mode: Terminate
        certificateRefs:
          - name: wildcard-tls-cert
            namespace: istio-system
      allowedRoutes:
        namespaces:
          from: Selector
          selector:
            matchLabels:
              gateway-access: "true"
```

## Step 3: Create HTTPRoutes for Services

```yaml
# clusters/my-cluster/apps/routes/api-httproute.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: api-route
  namespace: production
spec:
  parentRefs:
    - name: main-gateway
      namespace: istio-system
  hostnames:
    - "api.example.com"
  rules:
    # Route /v1 to the v1 service
    - matches:
        - path:
            type: PathPrefix
            value: /v1
      backendRefs:
        - name: api-service-v1
          port: 8080
          weight: 90
        # Canary: 10% to v2
        - name: api-service-v2
          port: 8080
          weight: 10
    # Route /v2 directly to v2
    - matches:
        - path:
            type: PathPrefix
            value: /v2
      backendRefs:
        - name: api-service-v2
          port: 8080
---
# clusters/my-cluster/apps/routes/header-route.yaml
# Header-based routing for beta users
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: beta-route
  namespace: production
spec:
  parentRefs:
    - name: main-gateway
      namespace: istio-system
  hostnames:
    - "api.example.com"
  rules:
    - matches:
        - headers:
            - name: X-Beta-User
              value: "true"
      backendRefs:
        - name: api-service-beta
          port: 8080
```

## Step 4: Configure East-West Traffic Routing

```yaml
# clusters/my-cluster/apps/routes/service-route.yaml
# HTTPRoute for service-to-service traffic (east-west)
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: payment-service-route
  namespace: production
spec:
  parentRefs:
    # Reference the mesh gateway for east-west routing
    - kind: Service
      group: ""
      name: payment-service
      namespace: production
  rules:
    - backendRefs:
        - name: payment-service-v2
          port: 8080
          weight: 80
        - name: payment-service-v1
          port: 8080
          weight: 20
      # Add retry policy
      filters:
        - type: RequestMirror
          requestMirror:
            backendRef:
              name: payment-service-shadow
              port: 8080
```

## Step 5: Create the Flux Kustomization

```yaml
# clusters/my-cluster/apps/routes/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gateway.yaml
  - api-httproute.yaml
  - header-route.yaml
  - service-route.yaml
---
# clusters/my-cluster/flux-kustomization-gateway-api.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: gateway-api-routes
  namespace: flux-system
spec:
  interval: 5m
  dependsOn:
    - name: istio
    - name: gateway-api-crds
  path: ./clusters/my-cluster/apps/routes
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Step 6: Verify Gateway API Routing

```bash
# Check Gateway status
kubectl get gateway -n istio-system

# Check HTTPRoute status
kubectl get httproute -n production

# Get Gateway IP
GATEWAY_IP=$(kubectl get gateway main-gateway -n istio-system \
  -o jsonpath='{.status.addresses[0].value}')

# Test routing
curl -H "Host: api.example.com" http://$GATEWAY_IP/v1/health
curl -H "Host: api.example.com" -H "X-Beta-User: true" http://$GATEWAY_IP/api/feature
```

## Best Practices

- Install Gateway API CRDs with `prune: false` - these are cluster-level resources that should never be accidentally removed by Flux.
- Use `allowedRoutes.namespaces` on Gateways to restrict which namespaces can attach HTTPRoutes, preventing unauthorized route injection.
- Model canary rollouts as weight changes in HTTPRoute `backendRefs` - increase the canary weight gradually via pull requests.
- Use `parentRefs` pointing to a Service (not a Gateway) for east-west (service-to-service) traffic routing within the mesh.
- Test HTTPRoute changes in staging by deploying to a staging-namespaced Gateway before promoting to production routes.

## Conclusion

Managing Istio Gateway API resources through Flux CD brings GitOps discipline to Kubernetes traffic routing. Every route change - canary rollout, header-based routing, traffic split - is a version-controlled pull request that can be reviewed, tested in staging, and automatically applied to production by Flux's continuous reconciliation.
