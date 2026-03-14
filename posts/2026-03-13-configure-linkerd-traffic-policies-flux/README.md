# How to Configure Linkerd Traffic Policies with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Linkerd, Traffic Policy, Circuit Breaking, Service Mesh

Description: Configure Linkerd traffic policies and circuit breaking using Flux CD to protect services from cascading failures in production.

---

## Introduction

Linkerd provides traffic policy primitives through its policy resources: Server, ServerAuthorization, and HTTPRoute CRDs. These enable fine-grained control over which clients can access which services, what mTLS mode is required, and how traffic should be routed — all managed declaratively.

By managing Linkerd traffic policies through Flux CD, your service-to-service communication rules are version-controlled. Adding a new authorized client or adjusting traffic routing for a service becomes a pull request, not an ad-hoc change.

This guide covers configuring Linkerd Server policies, ServerAuthorizations, and traffic management using Flux CD.

## Prerequisites

- Kubernetes cluster with Linkerd installed (1.22+)
- Flux CD v2 bootstrapped to your Git repository
- Services meshed with Linkerd proxy injection

## Step 1: Configure a Linkerd Server Policy

The `Server` resource declares how a service port should be handled:

```yaml
# clusters/my-cluster/linkerd-policies/api-server-policy.yaml
apiVersion: policy.linkerd.io/v1beta3
kind: Server
metadata:
  name: api-server-http
  namespace: production
spec:
  # Target pods with app=api-service label
  podSelector:
    matchLabels:
      app: api-service
  port:
    number: 8080
  # Require mTLS for all inbound connections
  proxyProtocol: HTTP/1
```

## Step 2: Create ServerAuthorization Resources

```yaml
# clusters/my-cluster/linkerd-policies/api-authz.yaml
# Allow only the frontend service to call the API
apiVersion: policy.linkerd.io/v1beta3
kind: ServerAuthorization
metadata:
  name: allow-frontend-to-api
  namespace: production
spec:
  server:
    name: api-server-http
  client:
    # Require mTLS from the frontend service account
    meshTLS:
      serviceAccounts:
        - name: frontend-service
          namespace: production
---
# Allow monitoring from the Linkerd viz extension
apiVersion: policy.linkerd.io/v1beta3
kind: ServerAuthorization
metadata:
  name: allow-linkerd-viz
  namespace: production
spec:
  server:
    name: api-server-http
  client:
    meshTLS:
      serviceAccounts:
        - name: prometheus
          namespace: linkerd-viz
```

## Step 3: Configure HTTPRoute for Traffic Management

```yaml
# clusters/my-cluster/linkerd-policies/api-httproute.yaml
apiVersion: policy.linkerd.io/v1beta3
kind: HTTPRoute
metadata:
  name: api-traffic-split
  namespace: production
spec:
  parentRefs:
    - name: api-server-http
      kind: Server
      group: policy.linkerd.io
  rules:
    # Route to stable backend
    - backendRefs:
        - name: api-service-stable
          port: 8080
          weight: 90
        # Canary traffic
        - name: api-service-canary
          port: 8080
          weight: 10
```

## Step 4: Configure the Default Policy

```yaml
# clusters/my-cluster/linkerd-policies/default-policy.yaml
# Namespace annotation to set the default policy
# All servers in this namespace deny unauthenticated traffic by default
apiVersion: v1
kind: Namespace
metadata:
  name: production
  annotations:
    # deny: require explicit ServerAuthorization for all traffic
    # all-unauthenticated: allow all traffic (not recommended for production)
    config.linkerd.io/default-inbound-policy: deny
```

## Step 5: Allow Health Probe Traffic

Kubernetes probes come from the kubelet (not a Linkerd-meshed client) and need explicit allow:

```yaml
# clusters/my-cluster/linkerd-policies/allow-probes.yaml
apiVersion: policy.linkerd.io/v1beta3
kind: ServerAuthorization
metadata:
  name: allow-k8s-probes
  namespace: production
spec:
  server:
    name: api-server-http
  client:
    # Allow unauthenticated access from the kubelet for probes
    unauthenticated: true
  # Only allow probe-like paths
```

## Step 6: Create the Flux Kustomization

```yaml
# clusters/my-cluster/linkerd-policies/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - api-server-policy.yaml
  - api-authz.yaml
  - api-httproute.yaml
  - allow-probes.yaml
---
# clusters/my-cluster/flux-kustomization-linkerd-policies.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: linkerd-traffic-policies
  namespace: flux-system
spec:
  interval: 5m
  dependsOn:
    - name: linkerd
  path: ./clusters/my-cluster/linkerd-policies
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Validate Traffic Policies

```bash
# Apply Flux reconciliation
flux reconcile kustomization linkerd-traffic-policies

# Check Server and ServerAuthorization resources
kubectl get server,serverauthorization -n production

# Test authorized access
kubectl exec -n production deploy/frontend-service -- \
  curl -sv http://api-service:8080/health

# Test unauthorized access (should be denied)
kubectl exec -n production deploy/other-service -- \
  curl -sv http://api-service:8080/health

# View effective policy for a pod
linkerd policy -n production pod/api-service-xxx-yyy

# Check traffic split metrics
linkerd viz routes deployment/api-service -n production
```

## Best Practices

- Set `config.linkerd.io/default-inbound-policy: deny` on production namespaces and create explicit `ServerAuthorization` resources for each allowed client — this enforces zero-trust at the Linkerd layer.
- Always create a `ServerAuthorization` for the Linkerd viz prometheus scraper and the Kubernetes kubelet (for health probes) when using the `deny` default policy.
- Use `policy.linkerd.io/v1beta3` HTTPRoute for traffic splitting alongside `ServerAuthorization` — the two resources complement each other for access control plus routing.
- Name `ServerAuthorization` resources descriptively (e.g., `allow-frontend-to-api`) rather than generically so their purpose is clear in `kubectl get` output.
- Test policy changes in a staging environment with `linkerd policy` inspection before committing to production — an incorrect policy can immediately deny all traffic to a service.

## Conclusion

Linkerd traffic policies managed through Flux CD provide a declarative, GitOps-controlled approach to service-to-service access control and traffic routing. Every authorization change is version-controlled and reviewable, giving platform and security teams confidence that communication patterns between services are exactly as intended — and any deviation is corrected automatically by Flux's continuous reconciliation.
