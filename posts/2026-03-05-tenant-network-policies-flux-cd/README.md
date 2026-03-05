# How to Configure Tenant Network Policies with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Multi-Tenancy, Network Policies, Security

Description: Learn how to configure Kubernetes NetworkPolicies for tenant isolation in Flux CD to prevent unauthorized cross-tenant network communication.

---

Network policies provide network-level isolation between tenants in a shared Kubernetes cluster. While namespace-based RBAC prevents tenants from managing each other's resources, it does not prevent network traffic between namespaces by default. This guide shows how to use Flux CD to deploy network policies that enforce tenant network isolation.

## Prerequisites

Network policies require a CNI plugin that supports them. Common options include:

- Calico
- Cilium
- Weave Net

Verify your CNI supports network policies before proceeding.

## Step 1: Create a Default Deny Policy

Start with a default deny policy that blocks all ingress and egress traffic in the tenant namespace. Then selectively allow what is needed.

```yaml
# tenants/team-alpha/network-policies/default-deny.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: team-alpha
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
```

This policy applies to all pods in the `team-alpha` namespace and blocks all inbound and outbound traffic.

## Step 2: Allow DNS Resolution

With default deny in place, pods cannot resolve DNS names. Allow egress to the cluster DNS service.

```yaml
# tenants/team-alpha/network-policies/allow-dns.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: team-alpha
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    # Allow DNS lookups to kube-system
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
```

## Step 3: Allow Intra-Namespace Communication

Allow pods within the same tenant namespace to communicate with each other.

```yaml
# tenants/team-alpha/network-policies/allow-same-namespace.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-same-namespace
  namespace: team-alpha
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    # Allow traffic from pods in the same namespace
    - from:
        - podSelector: {}
  egress:
    # Allow traffic to pods in the same namespace
    - to:
        - podSelector: {}
```

## Step 4: Allow Ingress from the Ingress Controller

If tenants expose services through an ingress controller, allow traffic from the ingress namespace.

```yaml
# tenants/team-alpha/network-policies/allow-ingress-controller.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ingress-controller
  namespace: team-alpha
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  ingress:
    # Allow traffic from the ingress controller namespace
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
```

## Step 5: Allow Egress to External Services

Allow pods to reach external services such as databases or APIs outside the cluster.

```yaml
# tenants/team-alpha/network-policies/allow-external-egress.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-external-egress
  namespace: team-alpha
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    # Allow HTTPS traffic to external services
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
            except:
              # Block traffic to cluster-internal CIDRs
              # Adjust these ranges to match your cluster
              - 10.0.0.0/8
              - 172.16.0.0/12
              - 192.168.0.0/16
      ports:
        - protocol: TCP
          port: 443
```

## Step 6: Create a Network Policy Template

Create a reusable base that platform admins apply to every tenant namespace.

```yaml
# tenants/base/network-policies/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - default-deny.yaml
  - allow-dns.yaml
  - allow-same-namespace.yaml
  - allow-ingress-controller.yaml
  - allow-external-egress.yaml
```

Include this in each tenant's configuration.

```yaml
# tenants/team-alpha/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - service-account.yaml
  - rbac.yaml
  - resource-quota.yaml
  - ../base/network-policies
  - git-repo.yaml
  - sync.yaml
```

## Step 7: Allow Specific Cross-Tenant Communication

Sometimes two tenants need to communicate. Create targeted policies that allow specific traffic flows.

```yaml
# tenants/team-alpha/network-policies/allow-from-team-beta.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-from-team-beta
  namespace: team-alpha
spec:
  podSelector:
    matchLabels:
      # Only the API service receives traffic from team-beta
      app: team-alpha-api
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              toolkit.fluxcd.io/tenant: team-beta
          podSelector:
            matchLabels:
              app: team-beta-client
      ports:
        - protocol: TCP
          port: 8080
```

## Step 8: Prevent Tenants from Modifying Network Policies

Use RBAC to prevent tenants from creating or modifying network policies. Only the platform admin should manage network policies.

```yaml
# platform/cluster-roles/tenant-no-netpol.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: tenant-reconciler
rules:
  - apiGroups: ["apps"]
    resources: ["deployments", "statefulsets"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: [""]
    resources: ["services", "configmaps", "secrets"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # Note: networking.k8s.io/networkpolicies is NOT included
  # This prevents tenants from modifying network policies
```

## Step 9: Verify Network Isolation

Test that network policies are working as expected.

```bash
# Verify network policies are applied
kubectl get networkpolicies -n team-alpha

# Test connectivity from within the tenant namespace
kubectl run test-pod --rm -it --image=busybox -n team-alpha -- wget -qO- http://service.team-alpha.svc.cluster.local

# Test that cross-tenant traffic is blocked
kubectl run test-pod --rm -it --image=busybox -n team-beta -- wget -qO- --timeout=3 http://service.team-alpha.svc.cluster.local
# Expected: wget: download timed out
```

## Summary

Network policies are a critical layer of tenant isolation in multi-tenant Flux CD environments. By starting with a default deny policy and selectively allowing required traffic, platform administrators can prevent unauthorized cross-tenant communication. Manage network policies through the platform admin's Flux configuration, not through tenant repositories, and use RBAC to prevent tenants from modifying these policies. Always test network isolation after deploying policies to confirm they work as intended.
