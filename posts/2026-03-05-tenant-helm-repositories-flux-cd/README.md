# How to Configure Tenant-Specific Helm Repositories in Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Multi-Tenancy, Helm, Helm Repositories

Description: Learn how to configure and manage tenant-specific Helm repositories in Flux CD so each tenant can deploy approved Helm charts within their namespace.

---

Helm charts are a popular way to deploy applications on Kubernetes. In a multi-tenant Flux CD environment, each tenant may need access to specific Helm repositories for their applications. This guide covers how to configure per-tenant Helm repositories with proper access controls.

## How Helm Repositories Work in Flux CD

Flux CD's source-controller manages HelmRepository resources that define where to find Helm charts. HelmRelease resources reference these repositories to deploy charts. In a multi-tenant setup, HelmRepository resources are namespace-scoped, meaning each tenant namespace can have its own set of repositories.

## Step 1: Create a Helm Repository for a Tenant

Define HelmRepository resources in the tenant's namespace.

```yaml
# tenants/team-alpha/helm-repos.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: bitnami
  namespace: team-alpha
spec:
  interval: 10m
  url: https://charts.bitnami.com/bitnami
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: team-alpha-charts
  namespace: team-alpha
spec:
  interval: 10m
  url: https://charts.example.com/team-alpha
  secretRef:
    name: team-alpha-helm-auth
```

## Step 2: Configure Authentication for Private Helm Repositories

Create a Secret with credentials for private Helm repositories.

```bash
# Create authentication secret for a private Helm repo
kubectl create secret generic team-alpha-helm-auth \
  --from-literal=username=team-alpha \
  --from-literal=password="${HELM_REPO_PASSWORD}" \
  -n team-alpha
```

For OCI-based Helm repositories, use a different secret format.

```yaml
# tenants/team-alpha/oci-helm-repo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: team-alpha-oci
  namespace: team-alpha
spec:
  interval: 10m
  type: oci
  url: oci://registry.example.com/team-alpha/charts
  secretRef:
    name: team-alpha-oci-auth
```

```bash
# Create OCI registry credentials
kubectl create secret docker-registry team-alpha-oci-auth \
  --docker-server=registry.example.com \
  --docker-username=team-alpha \
  --docker-password="${REGISTRY_PASSWORD}" \
  -n team-alpha
```

## Step 3: Deploy Charts from Tenant Repositories

Tenants create HelmRelease resources in their namespace that reference their approved repositories.

```yaml
# In the tenant's repository: team-alpha-apps/apps/redis/release.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: redis
  namespace: team-alpha
spec:
  interval: 5m
  chart:
    spec:
      chart: redis
      version: "18.x"
      sourceRef:
        kind: HelmRepository
        name: bitnami
  values:
    architecture: standalone
    auth:
      enabled: true
    master:
      persistence:
        size: 8Gi
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
        limits:
          cpu: 500m
          memory: 512Mi
```

## Step 4: Provide Shared Helm Repositories

For charts used by multiple tenants, create HelmRepository resources in a shared namespace.

```yaml
# infrastructure/shared-helm-repos/repos.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: ingress-nginx
  namespace: shared-sources
spec:
  interval: 10m
  url: https://kubernetes.github.io/ingress-nginx
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: cert-manager
  namespace: shared-sources
spec:
  interval: 10m
  url: https://charts.jetstack.io
```

Tenants reference shared repositories by specifying the namespace.

```yaml
# In the tenant's repository
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: nginx-ingress
  namespace: team-alpha
spec:
  interval: 5m
  chart:
    spec:
      chart: ingress-nginx
      version: "4.x"
      sourceRef:
        kind: HelmRepository
        name: ingress-nginx
        # Cross-namespace reference to shared repo
        namespace: shared-sources
```

## Step 5: Restrict Tenants from Creating Repositories

To prevent tenants from adding unauthorized Helm repositories, exclude Flux source CRD permissions from their RBAC role.

```yaml
# platform/cluster-roles/tenant-helm-consumer.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: tenant-helm-consumer
rules:
  # Allow creating HelmReleases
  - apiGroups: ["helm.toolkit.fluxcd.io"]
    resources: ["helmreleases"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # Read-only access to HelmRepositories (cannot create or modify)
  - apiGroups: ["source.toolkit.fluxcd.io"]
    resources: ["helmrepositories"]
    verbs: ["get", "list", "watch"]
  # Standard workload permissions
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets", "statefulsets"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: [""]
    resources: ["services", "configmaps", "secrets", "pods"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
```

## Step 6: Version-Constrain Helm Charts

Use version constraints in HelmRelease resources to control which chart versions tenants can deploy.

```yaml
# Platform admin can create HelmRelease templates with version constraints
# tenants/team-alpha/constrained-release.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: postgres
  namespace: team-alpha
spec:
  interval: 5m
  chart:
    spec:
      chart: postgresql
      # Only allow versions in the 14.x range
      version: ">=14.0.0 <15.0.0"
      sourceRef:
        kind: HelmRepository
        name: bitnami
```

## Step 7: Include Helm Repositories in Tenant Onboarding

Add Helm repository setup to the tenant onboarding template.

```yaml
# tenants/base/helm-repos/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - bitnami.yaml
  - internal-charts.yaml
```

```yaml
# tenants/base/helm-repos/bitnami.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: bitnami
spec:
  interval: 10m
  url: https://charts.bitnami.com/bitnami
```

```yaml
# tenants/base/helm-repos/internal-charts.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: internal
spec:
  interval: 10m
  url: https://charts.internal.example.com/stable
  secretRef:
    name: internal-helm-auth
```

## Step 8: Verify Helm Repository Configuration

Check that Helm repositories are properly configured and syncing.

```bash
# List Helm repositories in the tenant namespace
flux get sources helm -n team-alpha

# Check repository sync status
kubectl describe helmrepository bitnami -n team-alpha

# List HelmReleases in the tenant namespace
flux get helmreleases -n team-alpha

# Force a repository sync
flux reconcile source helm bitnami -n team-alpha

# Check for failed releases
flux get helmreleases -n team-alpha --status-selector ready=false
```

## Summary

Tenant-specific Helm repositories in Flux CD are configured by creating HelmRepository resources in each tenant's namespace. Platform administrators control which repositories are available to each tenant and can restrict tenants from creating their own repositories using RBAC. Shared repositories can be placed in a common namespace and referenced across tenant namespaces. Version constraints on HelmRelease resources provide an additional layer of control over what tenants can deploy.
