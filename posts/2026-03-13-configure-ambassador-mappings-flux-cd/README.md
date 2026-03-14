# How to Configure Ambassador Mappings with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Ambassador, Emissary-ingress, Mapping, API Gateway, Routing

Description: Manage Ambassador Mapping resources for API routing using Flux CD GitOps, covering path routing, header-based routing, canary releases, and traffic splitting.

---

## Introduction

Ambassador Mappings are the core routing primitive in Ambassador Edge Stack. A Mapping defines the relationship between an incoming request (matched by host, path, headers, or other criteria) and an upstream service. Unlike Kubernetes Ingress resources, Ambassador Mappings provide rich routing capabilities including header-based routing, canary deployments, traffic weighting, and gRPC proxying — all expressed as Kubernetes CRDs.

Managing Mappings through Flux CD makes API routing a first-class GitOps concern. When a new service needs an API endpoint, a developer adds a Mapping YAML file to the Git repository, opens a pull request, and after review, Flux CD automatically applies the routing rule. Route changes are auditable, reversible, and consistent across environments.

This guide covers the most important Mapping patterns: basic path routing, header-based routing for API versioning, traffic splitting for canary deployments, and gRPC service routing.

## Prerequisites

- Ambassador Edge Stack deployed in your cluster
- Flux CD bootstrapped and connected to your Git repository
- kubectl with access to your cluster
- Backend services deployed that Mappings will route to
- Basic understanding of Ambassador's Host and Listener concepts

## Step 1: Basic Path Routing Mapping

The simplest Mapping connects an URL path to a Kubernetes service.

```yaml
# apps/backend/ambassador-mappings/api-mapping.yaml
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: api-v1-mapping
  namespace: backend
  labels:
    app.kubernetes.io/managed-by: flux
spec:
  hostname: api.example.com
  prefix: /api/v1/
  # Route to the api-server service in the same namespace
  service: api-server:8080
  # Timeout configuration
  timeout_ms: 30000
  idle_timeout_ms: 30000
  # Enable connection draining during pod restarts
  allow_upgrade:
    - websocket
```

## Step 2: Header-Based Routing for API Versioning

Route requests to different backend versions based on request headers.

```yaml
# apps/backend/ambassador-mappings/api-versioning-mappings.yaml
# Route v1 clients to the stable service
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: api-v1-stable
  namespace: backend
spec:
  hostname: api.example.com
  prefix: /api/
  headers:
    # Match requests with the Accept-Version header set to v1
    Accept-Version: "v1"
  service: api-server-v1:8080
  weight: 100
---
# Route v2 clients to the new service
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: api-v2-beta
  namespace: backend
spec:
  hostname: api.example.com
  prefix: /api/
  headers:
    Accept-Version: "v2"
  service: api-server-v2:8080
  weight: 100
```

## Step 3: Traffic Splitting for Canary Deployments

Gradually shift traffic from an old service version to a new one using weighted Mappings.

```yaml
# apps/backend/ambassador-mappings/canary-release.yaml
# Stable version receives 90% of traffic
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: checkout-service-stable
  namespace: backend
  annotations:
    # Document the canary release in Git
    canary/release-date: "2026-03-13"
    canary/target-percentage: "10"
spec:
  hostname: api.example.com
  prefix: /checkout/
  service: checkout-service-v1:8080
  # 90% of requests go to the stable version
  weight: 90
---
# Canary version receives 10% of traffic
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: checkout-service-canary
  namespace: backend
spec:
  hostname: api.example.com
  prefix: /checkout/
  service: checkout-service-v2:8080
  # 10% of requests go to the canary
  weight: 10
  # Add header to identify canary responses for testing
  add_response_headers:
    X-Canary-Version: "v2"
```

## Step 4: Rate Limiting on Mappings

Attach rate limiting to specific routes using Ambassador's RateLimitService.

```yaml
# apps/backend/ambassador-mappings/rate-limited-mapping.yaml
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: public-api-mapping
  namespace: backend
spec:
  hostname: api.example.com
  prefix: /public/
  service: public-api:8080
  labels:
    ambassador:
      # Labels used by the RateLimitService to identify this traffic
      - string_request_label:
          label: backend
      - remote_address_request_label:
          label: remote_address
```

## Step 5: gRPC Service Routing

Route gRPC traffic through Ambassador to backend gRPC services.

```yaml
# apps/backend/ambassador-mappings/grpc-mapping.yaml
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: grpc-service-mapping
  namespace: backend
spec:
  hostname: grpc.example.com
  prefix: /mypackage.MyService/
  # Enable gRPC mode
  grpc: true
  service: grpc-service:50051
  timeout_ms: 10000
  # gRPC requires HTTP/2
  allow_upgrade:
    - h2c
```

## Step 6: Create the Flux Kustomization for Mappings

Manage all Mappings through Flux with proper dependency ordering.

```yaml
# clusters/production/ambassador-mappings-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: ambassador-mappings
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Ensure Ambassador is deployed before applying Mappings
  dependsOn:
    - name: ambassador
  # Only process Mapping CRDs
  patches: []
```

```bash
# Verify Mappings are applied and routing works
kubectl get mappings -A

# Check Ambassador's view of all configured routes
kubectl port-forward -n ambassador svc/ambassador-admin 8877:8877 &
curl http://localhost:8877/ambassador/v0/diag/ | jq '.groups'

# Test canary traffic distribution (run multiple times, ~10% should hit v2)
for i in {1..20}; do
  curl -s -o /dev/null -w "%{http_code}\n" https://api.example.com/checkout/status
done

# Verify Flux reconciliation
flux get kustomization ambassador-mappings
```

## Best Practices

- Group related Mappings in the same file rather than creating one file per Mapping; this makes the routing intent clearer and reduces file proliferation.
- Use Mapping `precedence` field to define explicit ordering when multiple Mappings match the same prefix; higher precedence values win.
- Implement canary releases incrementally — start at 1% and increase by 5-10% increments with monitoring between each step.
- Add `cors` configuration to Mappings that serve browser-based clients rather than relying on a global CORS setting; this gives per-route control.
- Use `retry_policy` in Mappings for idempotent endpoints to automatically retry failed upstream requests.
- Monitor per-Mapping error rates through Ambassador's Prometheus metrics to identify routing issues before they affect all traffic.

## Conclusion

Ambassador Mappings managed through Flux CD give you a declarative, GitOps-driven routing layer that is as powerful as it is auditable. Traffic splitting for canary releases, header-based routing for API versioning, and gRPC support are all expressed as simple Kubernetes YAML files in your repository. Every routing change is a pull request, every production issue is a revert, and every configuration state is exactly what is in your Git history.
