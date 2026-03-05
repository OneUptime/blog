# How to Use Capsule with Flux CD for Multi-Tenancy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Multi-Tenancy, Capsule, Policy Engine

Description: Learn how to integrate Capsule with Flux CD to enforce multi-tenancy policies including namespace quotas, network isolation, and resource limits at the tenant level.

---

Capsule is a Kubernetes multi-tenancy framework that provides tenant isolation through a custom Tenant resource. When combined with Flux CD, Capsule adds policy enforcement that goes beyond what standard Kubernetes RBAC and resource quotas offer. This guide shows how to integrate Capsule with Flux CD for a robust multi-tenant platform.

## What Capsule Provides

Capsule introduces a Tenant custom resource that groups namespaces and enforces policies across them:

- Limits which namespaces a tenant can create
- Enforces resource quotas across all tenant namespaces combined
- Applies network policies automatically
- Restricts which storage classes, ingress classes, and registries tenants can use
- Provides hierarchical quota management

## Step 1: Install Capsule with Flux CD

Deploy Capsule using a Flux HelmRelease.

```yaml
# infrastructure/capsule/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: capsule-system
---
# infrastructure/capsule/helm-repo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: capsule
  namespace: capsule-system
spec:
  interval: 10m
  url: https://projectcapsule.github.io/charts
---
# infrastructure/capsule/helm-release.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: capsule
  namespace: capsule-system
spec:
  interval: 5m
  chart:
    spec:
      chart: capsule
      version: "0.7.x"
      sourceRef:
        kind: HelmRepository
        name: capsule
  values:
    manager:
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
```

## Step 2: Define a Tenant with Capsule

Create a Capsule Tenant resource that defines the tenant's boundaries.

```yaml
# tenants/team-alpha/capsule-tenant.yaml
apiVersion: capsule.clastix.io/v1beta2
kind: Tenant
metadata:
  name: team-alpha
spec:
  # Tenant owners who can create namespaces
  owners:
    - name: team-alpha
      kind: ServiceAccount
      namespace: team-alpha
  # Maximum number of namespaces the tenant can create
  namespaceOptions:
    quota: 5
    additionalMetadata:
      labels:
        toolkit.fluxcd.io/tenant: team-alpha
  # Resource quotas applied across all tenant namespaces combined
  resourceQuotas:
    scope: Tenant
    items:
      - hard:
          requests.cpu: "8"
          limits.cpu: "16"
          requests.memory: 16Gi
          limits.memory: 32Gi
          pods: "100"
  # Limit ranges applied to every namespace
  limitRanges:
    items:
      - limits:
          - type: Container
            default:
              cpu: 250m
              memory: 256Mi
            defaultRequest:
              cpu: 100m
              memory: 128Mi
  # Network policies applied to every namespace
  networkPolicies:
    items:
      - policyTypes:
          - Ingress
          - Egress
        ingress:
          - from:
              - namespaceSelector:
                  matchLabels:
                    capsule.clastix.io/tenant: team-alpha
        egress:
          - to:
              - namespaceSelector:
                  matchLabels:
                    capsule.clastix.io/tenant: team-alpha
          - to:
              - namespaceSelector:
                  matchLabels:
                    kubernetes.io/metadata.name: kube-system
            ports:
              - protocol: UDP
                port: 53
```

## Step 3: Restrict Allowed Registries

Capsule can restrict which container registries tenants can pull from.

```yaml
# tenants/team-alpha/capsule-tenant-registries.yaml
apiVersion: capsule.clastix.io/v1beta2
kind: Tenant
metadata:
  name: team-alpha
spec:
  owners:
    - name: team-alpha
      kind: ServiceAccount
      namespace: team-alpha
  # Only allow images from approved registries
  containerRegistries:
    allowed:
      - registry.example.com/team-alpha
      - docker.io/library
    allowedRegex: "^registry\\.example\\.com/shared/.*$"
  # Restrict storage classes
  storageClasses:
    allowed:
      - standard
      - ssd
  # Restrict ingress classes
  ingressOptions:
    allowedClasses:
      allowed:
        - nginx
```

## Step 4: Integrate Capsule Tenant with Flux Tenant

Combine the Capsule Tenant resource with the standard Flux tenant configuration.

```yaml
# tenants/team-alpha/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  # Capsule tenant definition (cluster-scoped)
  - capsule-tenant.yaml
  # Standard Flux tenant resources
  - namespace.yaml
  - service-account.yaml
  - rbac.yaml
  - git-repo.yaml
  - sync.yaml
```

The Flux Kustomization for the tenant should use the service account that is listed as a Capsule tenant owner.

```yaml
# tenants/team-alpha/sync.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: team-alpha-apps
  namespace: team-alpha
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: team-alpha-apps
  prune: true
  # This service account is a Capsule tenant owner
  serviceAccountName: team-alpha
  targetNamespace: team-alpha
```

## Step 5: Allow Tenants to Create Sub-Namespaces

With Capsule, tenants can create additional namespaces within their quota. The tenant's manifests can include new namespaces.

```yaml
# In the tenant's repository: team-alpha-apps/namespaces.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: team-alpha-staging
  labels:
    capsule.clastix.io/tenant: team-alpha
---
apiVersion: v1
kind: Namespace
metadata:
  name: team-alpha-production
  labels:
    capsule.clastix.io/tenant: team-alpha
```

Capsule automatically validates that the namespace belongs to the tenant and applies the tenant's policies (quotas, limit ranges, network policies) to the new namespace.

## Step 6: Monitor Capsule Tenant Status

Check the tenant status to see resource usage across all namespaces.

```bash
# List all Capsule tenants
kubectl get tenants

# Get detailed tenant status
kubectl describe tenant team-alpha

# Check namespace count against quota
kubectl get tenant team-alpha -o jsonpath='{.status.namespaces}'

# Check resource usage across all tenant namespaces
kubectl get resourcequota -l capsule.clastix.io/tenant=team-alpha --all-namespaces
```

## Step 7: Manage the Capsule Tenant Lifecycle with Flux

Register the Capsule tenant configuration in the platform admin's Flux Kustomization.

```yaml
# clusters/my-cluster/tenants.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: tenants
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./tenants
  prune: true
```

## Step 8: Verify Capsule Integration

Test that Capsule policies are being enforced alongside Flux.

```bash
# Verify the Capsule tenant is created
kubectl get tenant team-alpha

# Test that the tenant cannot use unauthorized registries
kubectl run test --image=unauthorized.io/image -n team-alpha \
  --as=system:serviceaccount:team-alpha:team-alpha

# Test namespace quota enforcement
kubectl create namespace team-alpha-extra \
  --as=system:serviceaccount:team-alpha:team-alpha

# Verify Flux reconciliation is working
flux get kustomizations -n team-alpha
```

## Summary

Capsule enhances Flux CD multi-tenancy by providing tenant-level policy enforcement that operates across multiple namespaces. While Flux CD handles the GitOps workflow and resource reconciliation, Capsule enforces policies on container registries, storage classes, ingress classes, and cross-namespace resource quotas. The combination gives platform administrators a powerful toolkit for running secure, well-governed multi-tenant Kubernetes clusters.
