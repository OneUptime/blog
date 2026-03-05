# How to Configure Cross-Tenant Resource Sharing in Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Multi-Tenancy, Resource Sharing, Cross-Namespace

Description: Learn how to safely share resources like Helm repositories, ConfigMaps, and services between tenants in a multi-tenant Flux CD environment.

---

While tenant isolation is the default in multi-tenant Flux CD, there are legitimate cases where tenants need to share resources. Shared Helm repositories, common configuration, or inter-service communication between teams are all common scenarios. This guide covers how to configure cross-tenant resource sharing while maintaining security boundaries.

## When to Share Resources

Common sharing scenarios include:

- Shared Helm chart repositories that multiple tenants use
- Common configuration like TLS certificates or external service endpoints
- Shared databases or message queues managed by the platform team
- Service-to-service communication between tenant applications

## Step 1: Share Helm Repositories Across Tenants

Create a shared Helm repository in a common namespace and allow tenants to reference it.

```yaml
# infrastructure/shared-sources/helm-repos.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: bitnami
  namespace: shared-sources
spec:
  interval: 10m
  url: https://charts.bitnami.com/bitnami
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: ingress-nginx
  namespace: shared-sources
spec:
  interval: 10m
  url: https://kubernetes.github.io/ingress-nginx
```

For tenants to reference sources in another namespace, cross-namespace references must be enabled on the Flux controllers (this is the default behavior).

## Step 2: Create the Shared Sources Namespace

Set up the namespace where shared resources live.

```yaml
# infrastructure/shared-sources/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: shared-sources
  labels:
    app.kubernetes.io/managed-by: flux
    purpose: shared-resources
```

## Step 3: Reference Shared Sources from Tenant Namespaces

Tenants can reference the shared Helm repository by specifying the namespace in their HelmRelease.

```yaml
# In the tenant's repository
# team-alpha-apps/apps/nginx/helm-release.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: nginx
  namespace: team-alpha
spec:
  interval: 5m
  chart:
    spec:
      chart: nginx
      version: "15.x"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        # Reference the shared namespace
        namespace: shared-sources
  values:
    replicaCount: 2
```

## Step 4: Share Configuration via ConfigMaps

Create shared ConfigMaps in a common namespace and copy them to tenant namespaces using Flux.

```yaml
# infrastructure/shared-config/common-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: shared-endpoints
  namespace: shared-config
data:
  DATABASE_HOST: db.internal.example.com
  REDIS_HOST: redis.internal.example.com
  LOG_COLLECTOR: logs.internal.example.com:9200
```

Use a Kustomization to copy the shared config into tenant namespaces.

```yaml
# tenants/team-alpha/shared-config-sync.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: team-alpha-shared-config
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/shared-config
  prune: true
  targetNamespace: team-alpha
```

## Step 5: Share Secrets Using Sealed Secrets or External Secrets

For sharing secrets like TLS certificates, use a tool like Sealed Secrets or External Secrets Operator.

```yaml
# infrastructure/shared-secrets/tls-cert.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: wildcard-tls
  namespace: team-alpha
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: platform-vault
    kind: ClusterSecretStore
  target:
    name: wildcard-tls
  data:
    - secretKey: tls.crt
      remoteRef:
        key: certificates/wildcard
        property: cert
    - secretKey: tls.key
      remoteRef:
        key: certificates/wildcard
        property: key
```

## Step 6: Enable Cross-Tenant Service Communication

When two tenant applications need to communicate, configure network policies to allow specific traffic flows.

```yaml
# tenants/team-alpha/network-policy-allow-beta.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-from-team-beta-api
  namespace: team-alpha
spec:
  podSelector:
    matchLabels:
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

The corresponding egress rule in team-beta's namespace.

```yaml
# tenants/team-beta/network-policy-to-alpha.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-to-team-alpha-api
  namespace: team-beta
spec:
  podSelector:
    matchLabels:
      app: team-beta-client
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              toolkit.fluxcd.io/tenant: team-alpha
          podSelector:
            matchLabels:
              app: team-alpha-api
      ports:
        - protocol: TCP
          port: 8080
```

## Step 7: Create a Shared Services Namespace

For platform-managed shared services like databases or caches, create a dedicated namespace.

```yaml
# infrastructure/shared-services/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: shared-services
  labels:
    purpose: shared-services
---
# infrastructure/shared-services/redis.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: shared-redis
  namespace: shared-services
spec:
  interval: 5m
  chart:
    spec:
      chart: redis
      version: "18.x"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: shared-sources
  values:
    architecture: standalone
    auth:
      enabled: true
      existingSecret: redis-password
```

Allow tenant namespaces to access the shared services.

```yaml
# infrastructure/shared-services/network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-tenant-access
  namespace: shared-services
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  ingress:
    - from:
        # Allow all tenant namespaces
        - namespaceSelector:
            matchExpressions:
              - key: toolkit.fluxcd.io/tenant
                operator: Exists
      ports:
        - protocol: TCP
          port: 6379
```

## Step 8: Verify Cross-Tenant Sharing

Test that shared resources are accessible from tenant namespaces.

```bash
# Verify shared Helm repos are visible
flux get sources helm -n shared-sources

# Test cross-namespace reference works
flux get helmreleases -n team-alpha

# Test network connectivity to shared services
kubectl run test-pod --rm -it --image=busybox -n team-alpha \
  -- wget -qO- --timeout=3 http://shared-redis.shared-services.svc.cluster.local:6379
```

## Security Best Practices

- Only the platform admin should manage shared resources and cross-tenant network policies
- Use network policies to explicitly allow only required cross-tenant traffic
- Audit cross-namespace references regularly to ensure no unauthorized sharing
- Prefer duplicating small resources (like ConfigMaps) into tenant namespaces over cross-namespace references for better isolation

## Summary

Cross-tenant resource sharing in Flux CD is achieved through cross-namespace references for sources, shared namespaces for common services, and targeted network policies for inter-service communication. The platform admin controls all sharing configurations, ensuring that tenants cannot create unauthorized access paths. Balance convenience with security by sharing only what is necessary and maintaining explicit network policies for all cross-tenant traffic.
