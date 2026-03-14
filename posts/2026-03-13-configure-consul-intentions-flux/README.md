# How to Configure Consul Intentions with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Consul, Intentions, Service Mesh, Zero Trust, Access Control

Description: Manage Consul Connect service-to-service intentions using Flux CD GitOps to enforce zero-trust access control across your Consul service mesh.

---

## Introduction

Consul Intentions define which services are allowed to communicate with each other in a Consul Connect service mesh. They operate at the identity level - using cryptographically verified service identities rather than IP addresses - to enforce a zero-trust communication model. When a service tries to establish a connection, Consul checks whether an intention exists permitting that connection before allowing the Envoy proxy to forward it.

Managing Intentions through Flux CD ensures your service communication policy is version-controlled. Adding a new service dependency or revoking an existing permission is a pull request, giving security teams a clear record of every authorization change.

This guide covers configuring Consul Intentions using Flux CD, both with legacy config entries and the modern CRD-based approach.

## Prerequisites

- Kubernetes cluster with Consul Connect installed
- Flux CD v2 bootstrapped to your Git repository
- Consul ACLs enabled (required for intention enforcement)
- Services meshed with the Consul Connect sidecar

## Step 1: Apply Default Deny Intention

Start with a deny-all baseline:

```yaml
# clusters/my-cluster/consul-intentions/default-deny.yaml
# Default deny via Consul ServiceIntentions CRD
apiVersion: consul.hashicorp.com/v1alpha1
kind: ServiceIntentions
metadata:
  name: deny-all-default
  namespace: consul
spec:
  destination:
    # Wildcard destination: applies to all services
    name: "*"
  sources:
    # Deny all sources by default
    - name: "*"
      action: deny
```

## Step 2: Create Allow Intentions Between Services

```yaml
# clusters/my-cluster/consul-intentions/service-intentions.yaml
# Allow frontend to call the API service
apiVersion: consul.hashicorp.com/v1alpha1
kind: ServiceIntentions
metadata:
  name: api-service-intentions
  namespace: consul
spec:
  destination:
    name: api-service
  sources:
    # Explicitly allow frontend-service
    - name: frontend-service
      action: allow
    # Allow the Consul ingress gateway
    - name: ingress-gateway
      action: allow
    # Deny all others (default)
    - name: "*"
      action: deny
---
# Allow API service to call user-service
apiVersion: consul.hashicorp.com/v1alpha1
kind: ServiceIntentions
metadata:
  name: user-service-intentions
  namespace: consul
spec:
  destination:
    name: user-service
  sources:
    - name: api-service
      action: allow
    - name: "*"
      action: deny
---
# Allow API service to call payment-service
apiVersion: consul.hashicorp.com/v1alpha1
kind: ServiceIntentions
metadata:
  name: payment-service-intentions
  namespace: consul
spec:
  destination:
    name: payment-service
  sources:
    - name: api-service
      action: allow
    - name: "*"
      action: deny
```

## Step 3: Configure L7 Intentions with HTTP Permissions

With Consul Connect's L7 traffic management, intentions can be scoped to specific HTTP methods and paths:

```yaml
# clusters/my-cluster/consul-intentions/l7-intentions.yaml
apiVersion: consul.hashicorp.com/v1alpha1
kind: ServiceIntentions
metadata:
  name: admin-api-intentions
  namespace: consul
spec:
  destination:
    name: admin-api
  sources:
    # Allow the API gateway for all requests
    - name: api-gateway
      action: allow
    # Allow the ops service only for GET requests
    - name: ops-service
      permissions:
        - action: allow
          http:
            methods: ["GET"]
            pathPrefix: /admin/status
        - action: deny
          http:
            methods: ["POST", "PUT", "DELETE"]
    # Deny everything else
    - name: "*"
      action: deny
```

## Step 4: Allow Monitoring and Health Checks

```yaml
# clusters/my-cluster/consul-intentions/observability-intentions.yaml
# Allow Prometheus to scrape metrics from all services
apiVersion: consul.hashicorp.com/v1alpha1
kind: ServiceIntentions
metadata:
  name: prometheus-intentions
  namespace: consul
spec:
  destination:
    name: "*"
  sources:
    # Allow Prometheus to reach all services for scraping
    - name: prometheus
      permissions:
        - action: allow
          http:
            methods: ["GET"]
            pathPrefix: /metrics
```

## Step 5: Create the Flux Kustomization

```yaml
# clusters/my-cluster/consul-intentions/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - default-deny.yaml
  - service-intentions.yaml
  - l7-intentions.yaml
  - observability-intentions.yaml
---
# clusters/my-cluster/flux-kustomization-consul-intentions.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: consul-intentions
  namespace: flux-system
spec:
  interval: 5m
  dependsOn:
    - name: consul
  path: ./clusters/my-cluster/consul-intentions
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Step 6: Validate Intentions

```bash
# Apply Flux reconciliation
flux reconcile kustomization consul-intentions

# List all ServiceIntentions
kubectl get serviceintentions -n consul

# Test allowed connection (should succeed)
kubectl exec -n production deploy/frontend-service \
  -c frontend -- curl -sv http://localhost:8080/api/health
# (8080 is the upstream port defined in the Connect annotation)

# Test denied connection (should fail with "Connection refused")
kubectl exec -n production deploy/payment-service \
  -c payment -- curl -sv http://localhost:8081/api/users
# Expected: upstream connect error (denied by intention)

# Check intentions in Consul UI
kubectl port-forward svc/consul-ui 8500:80 -n consul
# Navigate to: http://localhost:8500/ui/dc1/intentions

# Use Consul CLI to list intentions
kubectl exec -n consul consul-server-0 -- \
  consul intention list
```

## Best Practices

- Start with a `deny-all` wildcard intention and explicitly allow only the service-to-service paths you need - this enforces zero-trust from day one.
- Use L7 intentions with HTTP permissions for sensitive endpoints like admin APIs, restricting by both source service and HTTP method/path.
- Allow Prometheus scraping via intentions scoped to the `/metrics` path so your monitoring stack can function without opening broad access.
- Name ServiceIntentions resources after the destination service (e.g., `api-service-intentions`) for clarity when listing with `kubectl get serviceintentions`.
- Test intention changes in a staging namespace before applying to production - a missing intention can silently break service communication if ACLs are in `deny` mode.

## Conclusion

Managing Consul Intentions through Flux CD creates a GitOps-governed zero-trust access control layer for your Consul service mesh. Every service communication permission is version-controlled in Git, reviewed through pull requests, and automatically enforced by Consul's identity-based proxy layer. This combination of cryptographic service identity and GitOps governance provides robust, auditable network security across your entire Consul-connected infrastructure.
