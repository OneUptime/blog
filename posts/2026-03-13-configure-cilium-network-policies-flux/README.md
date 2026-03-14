# How to Configure Cilium Network Policies with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Cilium, Network Policy, Security, EBPF, Zero Trust

Description: Manage Cilium Network Policy resources using Flux CD GitOps to enforce zero-trust network security with L3/L4/L7 policy controls.

---

## Introduction

Cilium's CiliumNetworkPolicy extends Kubernetes NetworkPolicy with L7 awareness, identity-based filtering, DNS-based egress control, and cluster-level policies. Combined with eBPF enforcement at the kernel level, Cilium policies provide both high performance and rich expressiveness for zero-trust networking.

Managing CiliumNetworkPolicy resources through Flux CD ensures your network security posture is version-controlled and auditable. Every policy change - adding a new allowed path or restricting egress to a new external API - goes through pull request review.

This guide covers configuring CiliumNetworkPolicy resources using Flux CD for ingress, egress, L7 HTTP, and DNS-based policies.

## Prerequisites

- Kubernetes cluster with Cilium installed as the CNI
- Flux CD v2 bootstrapped to your Git repository
- Cilium Hubble enabled for policy verification

## Step 1: Create a Default Deny Policy

```yaml
# clusters/my-cluster/cilium-policies/default-deny.yaml
# Deny all ingress and egress by default for the production namespace
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: deny-all-production
  namespace: production
spec:
  endpointSelector:
    matchLabels: {}   # Match all pods in namespace
  ingress: []         # Empty = deny all ingress
  egress: []          # Empty = deny all egress
```

## Step 2: Create Ingress Policies

```yaml
# clusters/my-cluster/cilium-policies/ingress-policies.yaml
# Allow frontend to reach API service on specific ports and methods
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-frontend-to-api
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: api-service
  ingress:
    - fromEndpoints:
        - matchLabels:
            app: frontend-service
      toPorts:
        - ports:
            - port: "8080"
              protocol: TCP
          rules:
            http:
              - method: GET
                path: /api/.*
              - method: POST
                path: /api/orders
---
# Allow ingress gateway (load balancer) access to frontend
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-ingress-to-frontend
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: frontend-service
  ingress:
    - fromEntities:
        - world   # Allow external traffic (from outside the cluster)
      toPorts:
        - ports:
            - port: "3000"
              protocol: TCP
```

## Step 3: Create Egress Policies

```yaml
# clusters/my-cluster/cilium-policies/egress-policies.yaml
# Allow API service to reach the database
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-api-to-db
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: api-service
  egress:
    - toEndpoints:
        - matchLabels:
            app: postgresql
      toPorts:
        - ports:
            - port: "5432"
              protocol: TCP
    # Allow DNS resolution (required for all egress policies)
    - toEndpoints:
        - matchLabels:
            "k8s:io.kubernetes.pod.namespace": kube-system
            k8s-app: kube-dns
      toPorts:
        - ports:
            - port: "53"
              protocol: UDP
            - port: "53"
              protocol: TCP
          rules:
            dns:
              - matchPattern: "*"
```

## Step 4: DNS-Based Egress Policy for External APIs

```yaml
# clusters/my-cluster/cilium-policies/dns-egress-policy.yaml
# Allow API service to reach specific external APIs by DNS name
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-external-apis
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: api-service
  egress:
    # Allow Stripe API
    - toFQDNs:
        - matchName: "api.stripe.com"
      toPorts:
        - ports:
            - port: "443"
              protocol: TCP
    # Allow SendGrid
    - toFQDNs:
        - matchName: "api.sendgrid.com"
      toPorts:
        - ports:
            - port: "443"
              protocol: TCP
    # Allow any *.amazonaws.com subdomain (for S3, SQS, etc.)
    - toFQDNs:
        - matchPattern: "*.amazonaws.com"
      toPorts:
        - ports:
            - port: "443"
              protocol: TCP
```

## Step 5: Cluster-Wide Policy with CiliumClusterwideNetworkPolicy

```yaml
# clusters/my-cluster/cilium-policies/clusterwide-policy.yaml
# Cluster-wide policy (no namespace needed)
apiVersion: cilium.io/v2
kind: CiliumClusterwideNetworkPolicy
metadata:
  name: allow-kube-system-monitoring
spec:
  endpointSelector:
    matchLabels:
      "k8s:io.kubernetes.pod.namespace": monitoring
  ingress:
    # Allow scraping from anywhere in the cluster
    - fromEntities:
        - cluster
      toPorts:
        - ports:
            - port: "9090"  # Prometheus
              protocol: TCP
            - port: "9091"  # Push Gateway
              protocol: TCP
```

## Step 6: Create the Flux Kustomization

```yaml
# clusters/my-cluster/cilium-policies/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - default-deny.yaml
  - ingress-policies.yaml
  - egress-policies.yaml
  - dns-egress-policy.yaml
  - clusterwide-policy.yaml
---
# clusters/my-cluster/flux-kustomization-cilium-policies.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cilium-network-policies
  namespace: flux-system
spec:
  interval: 5m
  dependsOn:
    - name: cilium
  path: ./clusters/my-cluster/cilium-policies
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Validate Network Policies

```bash
# Apply Flux reconciliation
flux reconcile kustomization cilium-network-policies

# List all Cilium policies
kubectl get ciliumnetworkpolicy --all-namespaces

# Test allowed traffic
kubectl exec -n production deploy/frontend-service -- \
  curl -sv http://api-service:8080/api/orders

# Test denied traffic (should fail)
kubectl exec -n production deploy/api-service -- \
  curl -sv http://frontend-service:3000

# Use Hubble to observe policy decisions
hubble observe --namespace production --verdict DROPPED --last 100

# Check policy enforcement for a pod
kubectl exec -n cilium daemonset/cilium -- \
  cilium endpoint list | grep production
```

## Best Practices

- Always include a DNS egress rule (`port 53 UDP/TCP`) in egress policies - without it, pods cannot resolve any service names or external hostnames.
- Use `toFQDNs` for external API access rather than IP CIDRs - IPs for cloud services change frequently, but DNS names are stable.
- Apply a `deny-all` policy per namespace first, then add explicit allows - this is the zero-trust approach and prevents unintended communication paths.
- Use Hubble's `hubble observe --verdict DROPPED` to debug policy issues in real-time before policies are finalized.
- Prefer `CiliumNetworkPolicy` over standard Kubernetes `NetworkPolicy` when using Cilium - you get L7 HTTP rules, DNS filtering, and entity-based selectors that standard NetworkPolicy cannot provide.

## Conclusion

Managing Cilium Network Policies through Flux CD creates a GitOps-controlled, zero-trust network security layer for your Kubernetes cluster. Every access control decision - from L3 port filtering to L7 HTTP method restrictions to DNS-based egress control - is version-controlled, reviewed through pull requests, and automatically enforced at the kernel level via eBPF.
