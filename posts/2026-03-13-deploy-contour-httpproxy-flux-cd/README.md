# How to Deploy Contour with HTTPProxy via Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Contour, HTTPProxy, Envoy, Ingress, HelmRelease

Description: Deploy Contour ingress controller and manage HTTPProxy resources using Flux CD GitOps for advanced HTTP routing built on Envoy proxy with support for weighted routing and TLS delegation.

---

## Introduction

Contour is a Kubernetes ingress controller that uses Envoy as the data plane and exposes its own CRD called HTTPProxy for advanced routing. HTTPProxy extends standard Kubernetes Ingress with capabilities including multi-team TLS certificate delegation, weighted backend routing, per-route timeout and retry policies, and inclusion-based routing across namespace boundaries — all without the annotation sprawl of traditional ingress controllers.

Contour's multi-team model is especially valuable in GitOps environments: a platform team can manage the root HTTPProxy resources and TLS configuration through one Flux Kustomization, while application teams manage their own child HTTPProxy routing resources in separate namespaces through another Kustomization. This separation of concerns maps perfectly onto team-based GitOps workflows.

This guide deploys Contour using Flux CD HelmRelease and demonstrates the HTTPProxy CRD for production API routing with TLS termination.

## Prerequisites

- A Kubernetes cluster with Flux CD bootstrapped
- kubectl with cluster-admin access
- A Git repository connected to Flux CD
- cert-manager for TLS certificate management
- A domain name with DNS configured

## Step 1: Add the Contour HelmRepository

Register the Bitnami Helm chart repository which provides the Contour chart.

```yaml
# infrastructure/contour/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: bitnami
  namespace: flux-system
spec:
  interval: 1h
  url: https://charts.bitnami.com/bitnami
```

## Step 2: Deploy Contour

Install the Contour Ingress Controller with Envoy as the data plane.

```yaml
# infrastructure/contour/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: contour
  namespace: projectcontour
spec:
  interval: 30m
  chart:
    spec:
      chart: contour
      version: ">=19.0.0 <20.0.0"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
      interval: 12h
  values:
    contour:
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
        limits:
          cpu: 500m
          memory: 512Mi

    envoy:
      service:
        type: LoadBalancer
      resources:
        requests:
          cpu: 200m
          memory: 200Mi
        limits:
          cpu: "2"
          memory: 2Gi

      # Replica count for high availability
      replicaCount: 2

      # Anti-affinity for spreading across nodes
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app.kubernetes.io/component: envoy
                topologyKey: kubernetes.io/hostname

    metrics:
      serviceMonitor:
        enabled: true
        namespace: monitoring
```

## Step 3: Create a Root HTTPProxy with TLS

Define the root HTTPProxy that handles TLS termination and includes child routes.

```yaml
# infrastructure/contour/root-httpproxy.yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: root-proxy
  namespace: projectcontour
  labels:
    app.kubernetes.io/managed-by: flux
spec:
  # TLS configuration for the root domain
  virtualhost:
    fqdn: api.example.com
    tls:
      secretName: api-example-tls
      # Allow delegation to child HTTPProxy resources
      enableFallbackCertificate: false
  # Include application-team HTTPProxy resources
  includes:
    # Include the backend team's routing from the backend namespace
    - name: backend-proxy
      namespace: backend
      conditions:
        - prefix: /api
    # Include the frontend team's routing
    - name: frontend-proxy
      namespace: frontend
      conditions:
        - prefix: /app
```

## Step 4: Create Application HTTPProxy Resources

Application teams define their own HTTPProxy resources in their namespaces.

```yaml
# apps/backend/httpproxy.yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: backend-proxy
  namespace: backend
spec:
  # No virtualhost - this is a child proxy included by the root
  routes:
    # Route to the main API service
    - conditions:
        - prefix: /api/v1
      services:
        - name: api-server-v1
          port: 8080
          # Health check configuration
          healthCheckPolicy:
            path: /health
            intervalSeconds: 10
            timeoutSeconds: 5
            unhealthyThresholdCount: 3
            healthyThresholdCount: 2
      # Timeout and retry policy for this route
      timeoutPolicy:
        response: 30s
        idle: 60s
      retryPolicy:
        count: 3
        perTryTimeout: 10s
      # Load balancing strategy
      loadBalancerPolicy:
        strategy: WeightedLeastRequest

    # Canary route with traffic weighting
    - conditions:
        - prefix: /api/v2
      services:
        # 90% to stable v2
        - name: api-server-v2-stable
          port: 8080
          weight: 90
        # 10% to canary
        - name: api-server-v2-canary
          port: 8080
          weight: 10
```

## Step 5: Configure TLS Certificate Delegation

Allow application namespaces to use TLS certificates managed centrally by the platform team.

```yaml
# infrastructure/contour/tls-delegation.yaml
apiVersion: projectcontour.io/v1
kind: TLSCertificateDelegation
metadata:
  name: tls-delegation
  namespace: cert-manager
spec:
  delegations:
    # Allow backend namespace to use the wildcard certificate
    - secretName: wildcard-example-tls
      targetNamespaces:
        - backend
        - frontend
        - auth
```

## Step 6: Deploy with Flux and Verify

Apply Contour resources with the Flux Kustomization and verify operation.

```yaml
# clusters/production/contour-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: contour
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/contour
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: contour
      namespace: projectcontour
  timeout: 10m
```

```bash
# Verify Contour and Envoy are running
kubectl get pods -n projectcontour

# Check Flux reconciliation
flux get helmrelease contour -n projectcontour

# List all HTTPProxy resources
kubectl get httpproxy -A

# Check HTTPProxy status (should show "valid" in STATUS column)
kubectl describe httpproxy root-proxy -n projectcontour

# Test routing
curl -I https://api.example.com/api/v1/health
curl -I https://api.example.com/app/index.html

# Check Contour's Envoy configuration
kubectl exec -n projectcontour deployment/contour -- contour cli routes --port=8001
```

## Best Practices

- Use HTTPProxy inclusion to delegate routing authority to application teams while maintaining platform-level TLS control; this prevents application teams from misconfiguring TLS.
- Set explicit `timeoutPolicy` and `retryPolicy` on all routes rather than relying on Envoy's defaults; application-specific timeout requirements vary significantly.
- Use `TLSCertificateDelegation` to share certificates from a central namespace rather than duplicating certificates across namespaces.
- Monitor HTTPProxy status fields — Contour reports detailed error messages when a proxy is misconfigured, making debugging straightforward.
- Use the `WeightedLeastRequest` load balancing strategy for APIs with variable response times; it naturally routes to faster backends.
- Configure health checks on all HTTPProxy backend services to prevent Envoy from routing to unhealthy pods before Kubernetes updates the Endpoints.

## Conclusion

Contour with HTTPProxy, deployed through Flux CD, provides a multi-team-friendly ingress architecture where platform and application concerns are cleanly separated. The inclusion model lets platform teams manage root routing and TLS while application teams control their own routes — all within a GitOps workflow that keeps every routing decision auditable and reproducible.
