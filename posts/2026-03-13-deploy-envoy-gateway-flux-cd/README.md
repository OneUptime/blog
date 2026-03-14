# How to Deploy Envoy Gateway with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Envoy Gateway, API Gateway, HelmRelease, Gateway API, Envoy

Description: Deploy the Kubernetes Envoy Gateway using Flux CD HelmRelease to implement the Kubernetes Gateway API specification with Envoy proxy as the data plane.

---

## Introduction

Envoy Gateway is an open-source Kubernetes Gateway API implementation built on Envoy proxy and maintained under the EnvoyProxy project. It implements the Kubernetes Gateway API specification — the next generation of Kubernetes network routing — providing a standardized, extensible model for managing ingress, traffic routing, and service mesh entry points that works across different gateway implementations.

Unlike proprietary gateway CRDs, Gateway API is a Kubernetes SIG project with broad ecosystem support. Routing configurations written for Envoy Gateway are largely portable to other Gateway API implementations like Contour, Istio, and others. This portability, combined with Envoy's proven performance and Flux CD's GitOps management, makes Envoy Gateway an excellent choice for platform teams building for the long term.

This guide deploys Envoy Gateway using Flux CD HelmRelease and configures the core Gateway API resources for production HTTP and HTTPS routing.

## Prerequisites

- A Kubernetes cluster with Flux CD bootstrapped (Kubernetes 1.26+)
- kubectl with cluster-admin access
- A Git repository connected to Flux CD
- cert-manager for TLS certificate management
- Basic familiarity with Kubernetes Gateway API concepts (GatewayClass, Gateway, HTTPRoute)

## Step 1: Add the Envoy Gateway HelmRepository

Register the Envoy Gateway Helm chart repository with Flux CD.

```yaml
# infrastructure/envoy-gateway/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: envoy-gateway
  namespace: flux-system
spec:
  interval: 1h
  url: https://gateway.envoyproxy.io/helm-stable
```

## Step 2: Deploy Envoy Gateway

Install Envoy Gateway as the Gateway API controller.

```yaml
# infrastructure/envoy-gateway/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: envoy-gateway
  namespace: envoy-gateway-system
spec:
  interval: 30m
  chart:
    spec:
      chart: gateway-helm
      version: ">=1.0.0 <2.0.0"
      sourceRef:
        kind: HelmRepository
        name: envoy-gateway
        namespace: flux-system
      interval: 12h
  values:
    # Envoy Gateway configuration
    config:
      envoyGateway:
        gateway:
          controllerName: gateway.envoyproxy.io/gatewayclass-controller
        provider:
          type: Kubernetes
          kubernetes:
            rateLimitServer:
              url: "ratelimit:8081"
        logging:
          level:
            default: info

    # Resource allocation for the controller
    deployment:
      envoyGateway:
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 1Gi

    # Enable metrics
    metrics:
      enabled: true
```

## Step 3: Create the GatewayClass

Define a GatewayClass that references Envoy Gateway as the controller.

```yaml
# infrastructure/envoy-gateway/gatewayclass.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: envoy-gateway
  labels:
    app.kubernetes.io/managed-by: flux
spec:
  # Reference to Envoy Gateway's controller
  controllerName: gateway.envoyproxy.io/gatewayclass-controller
  description: "Envoy Gateway - production API gateway"
```

## Step 4: Create a Gateway

Define a Gateway resource that instantiates an Envoy proxy instance.

```yaml
# infrastructure/envoy-gateway/gateway.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: production-gateway
  namespace: envoy-gateway-system
  labels:
    app.kubernetes.io/managed-by: flux
spec:
  gatewayClassName: envoy-gateway
  listeners:
    # HTTP listener - redirects to HTTPS
    - name: http
      protocol: HTTP
      port: 80
      allowedRoutes:
        namespaces:
          from: All

    # HTTPS listener with TLS termination
    - name: https
      protocol: HTTPS
      port: 443
      tls:
        mode: Terminate
        certificateRefs:
          - name: wildcard-example-tls
            namespace: envoy-gateway-system
      allowedRoutes:
        namespaces:
          from: All
```

## Step 5: Create HTTPRoutes for Applications

Application teams define HTTPRoute resources to attach their services to the Gateway.

```yaml
# apps/backend/httproute.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: api-server-route
  namespace: backend
  labels:
    app.kubernetes.io/managed-by: flux
spec:
  # Attach to the production gateway in the envoy-gateway-system namespace
  parentRefs:
    - name: production-gateway
      namespace: envoy-gateway-system
      sectionName: https

  hostnames:
    - "api.example.com"

  rules:
    # Route API requests with versioning
    - matches:
        - path:
            type: PathPrefix
            value: /api/v1
      backendRefs:
        - name: api-server
          port: 8080
          weight: 100

    # Health check route
    - matches:
        - path:
            type: Exact
            value: /health
      backendRefs:
        - name: api-server
          port: 8080

    # Canary routing using header-based matching
    - matches:
        - path:
            type: PathPrefix
            value: /api/v2
          headers:
            - name: X-Canary
              value: "true"
      backendRefs:
        - name: api-server-canary
          port: 8080
```

## Step 6: Apply with Flux and Verify

Create the Flux Kustomization and verify the Gateway API resources are working.

```yaml
# clusters/production/envoy-gateway-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: envoy-gateway
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/envoy-gateway
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: envoy-gateway
      namespace: envoy-gateway-system
  timeout: 10m
```

```bash
# Check Envoy Gateway deployment
kubectl get pods -n envoy-gateway-system

# Verify GatewayClass is accepted
kubectl get gatewayclass envoy-gateway

# Check Gateway status
kubectl describe gateway production-gateway -n envoy-gateway-system

# List all HTTPRoutes
kubectl get httproute -A

# Get the Gateway's LoadBalancer IP
kubectl get svc -n envoy-gateway-system

# Test routing
GATEWAY_IP=$(kubectl get svc envoy-envoy-gateway-system-production-gateway \
  -n envoy-gateway-system \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

curl -H "Host: api.example.com" http://$GATEWAY_IP/health

# Verify Flux reconciliation
flux get kustomization envoy-gateway
flux get helmrelease envoy-gateway -n envoy-gateway-system
```

## Best Practices

- Use `allowedRoutes.namespaces.from: Selector` with namespace labels rather than `All` to control which namespaces can attach routes to your Gateway; this prevents unauthorized route attachment.
- Implement HTTPS redirect by adding an HTTPRoute that redirects all HTTP traffic to HTTPS before exposing production services.
- Use Gateway API's `ReferenceGrant` resource when HTTPRoutes in one namespace need to reference backends in another namespace; this prevents cross-namespace access without explicit approval.
- Pin the GatewayClass controller name to the exact Envoy Gateway version you are running to prevent unexpected behavior during upgrades.
- Monitor Envoy Gateway using its Prometheus metrics; key metrics include listener error rates, route match counts, and upstream connection latency.
- Test Gateway API manifest portability by validating your HTTPRoute resources against the Gateway API conformance test suite.

## Conclusion

Envoy Gateway deployed through Flux CD implements the Kubernetes Gateway API standard with Envoy's proven data plane performance. The standardized CRDs provide portability across implementations while Flux ensures consistent, auditable deployment. As the Gateway API matures into the definitive Kubernetes routing standard, Envoy Gateway positions your platform on a long-term supported, community-backed foundation.
