# How to Structure a Flux Repository for Multiple Clusters Multi-Region

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Repository Structure, Multi-Cluster, Multi-Region

Description: Learn how to organize a Flux repository for managing Kubernetes clusters spread across multiple geographic regions.

---

Running Kubernetes clusters across multiple regions introduces additional complexity in your GitOps workflow. Each region may have different requirements for latency-sensitive configurations, data residency, backup targets, and scaling policies. A well-structured Flux repository handles these differences while keeping the shared configuration consistent.

This guide explains how to organize your Flux repository for multi-region, multi-cluster deployments.

## When to Use This Pattern

This pattern is appropriate when you have:

- Kubernetes clusters deployed in two or more geographic regions
- Region-specific configurations like endpoint URLs, storage classes, or DNS settings
- A need for consistent base configuration across all regions
- Different scaling requirements based on regional traffic patterns

## Recommended Directory Structure

```text
fleet-repo/
  clusters/
    us-east-1/
      staging/
        flux-system/
        infrastructure.yaml
        apps.yaml
      production/
        flux-system/
        infrastructure.yaml
        apps.yaml
    eu-west-1/
      staging/
        flux-system/
        infrastructure.yaml
        apps.yaml
      production/
        flux-system/
        infrastructure.yaml
        apps.yaml
  infrastructure/
    base/
      sources/
      controllers/
      kustomization.yaml
    overlays/
      us-east-1/
        kustomization.yaml
        patches/
      eu-west-1/
        kustomization.yaml
        patches/
  apps/
    base/
      app-one/
      app-two/
      kustomization.yaml
    overlays/
      us-east-1-staging/
        kustomization.yaml
      us-east-1-production/
        kustomization.yaml
      eu-west-1-staging/
        kustomization.yaml
      eu-west-1-production/
        kustomization.yaml
```

## Cluster Entry Points

Each cluster has a unique path combining region and environment:

```yaml
# clusters/us-east-1/production/infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/overlays/us-east-1
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  postBuild:
    substitute:
      REGION: us-east-1
      ENVIRONMENT: production
      CLUSTER_NAME: us-east-1-production
```

```yaml
# clusters/eu-west-1/production/infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/overlays/eu-west-1
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  postBuild:
    substitute:
      REGION: eu-west-1
      ENVIRONMENT: production
      CLUSTER_NAME: eu-west-1-production
```

## Region-Specific Infrastructure

Each region may need different configurations for storage, networking, or external services:

```yaml
# infrastructure/overlays/us-east-1/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
patches:
  - path: patches/storage-class.yaml
  - path: patches/external-dns.yaml
```

```yaml
# infrastructure/overlays/us-east-1/patches/storage-class.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-storage
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iopsPerGB: "3000"
allowedTopologies:
  - matchLabelExpressions:
      - key: topology.ebs.csi.aws.com/zone
        values:
          - us-east-1a
          - us-east-1b
```

```yaml
# infrastructure/overlays/eu-west-1/patches/storage-class.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-storage
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iopsPerGB: "3000"
allowedTopologies:
  - matchLabelExpressions:
      - key: topology.ebs.csi.aws.com/zone
        values:
          - eu-west-1a
          - eu-west-1b
```

## Application Overlays per Region and Environment

Combine region and environment in application overlays:

```yaml
# apps/overlays/us-east-1-production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
patches:
  - path: patches/replicas.yaml
    target:
      kind: Deployment
  - path: patches/region-config.yaml
images:
  - name: app-one
    newTag: "1.5.0"
```

```yaml
# apps/overlays/us-east-1-production/patches/region-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  REGION: us-east-1
  CDN_ENDPOINT: https://cdn-us.example.com
  DB_ENDPOINT: db-us-east.example.com
```

```yaml
# apps/overlays/eu-west-1-production/patches/region-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  REGION: eu-west-1
  CDN_ENDPOINT: https://cdn-eu.example.com
  DB_ENDPOINT: db-eu-west.example.com
```

## Bootstrapping Multi-Region Clusters

Bootstrap each cluster with its unique path:

```bash
# US East staging
flux bootstrap github \
  --owner=your-org \
  --repository=fleet-repo \
  --branch=main \
  --path=./clusters/us-east-1/staging \
  --context=us-east-1-staging

# EU West production
flux bootstrap github \
  --owner=your-org \
  --repository=fleet-repo \
  --branch=main \
  --path=./clusters/eu-west-1/production \
  --context=eu-west-1-production
```

## Handling Regional Rollouts

For multi-region rollouts, update one region at a time. A typical workflow:

1. Update the staging overlay in one region
2. Verify the deployment is healthy
3. Update the production overlay in that region
4. Repeat for additional regions

This gives you a canary-style rollout across regions:

```bash
# Step 1: Update US staging
# Edit apps/overlays/us-east-1-staging/kustomization.yaml with new image tag
git commit -am "Deploy v1.6.0 to us-east-1 staging"
git push

# Step 2: After verification, update US production
# Edit apps/overlays/us-east-1-production/kustomization.yaml
git commit -am "Deploy v1.6.0 to us-east-1 production"
git push

# Step 3: Roll out to EU
# Repeat for eu-west-1 overlays
```

## Region-Specific Health Checks

Configure health checks that account for regional services:

```yaml
# clusters/us-east-1/production/apps.yaml
spec:
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: app-one
      namespace: default
  timeout: 5m
```

## Conclusion

Structuring a Flux repository for multi-region deployments requires a layered approach that separates shared base configuration from region-specific and environment-specific overlays. By using the region-environment combination as the overlay key, you maintain clear boundaries while keeping the configuration DRY. This structure supports safe regional rollouts and makes it straightforward to add new regions or environments as your infrastructure grows.
