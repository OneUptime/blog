# How to Version Dapr CRDs Across Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, CRD, Versioning, GitOps, Cluster Management

Description: Manage Dapr CRD versions across multiple Kubernetes clusters using GitOps, Helm chart versioning, and schema migration strategies to maintain consistency and backward compatibility.

---

## The Challenge of CRD Versioning

As Dapr evolves, its CRD schemas change. Managing these changes across development, staging, and production clusters - or across multiple region clusters - requires careful version tracking, schema migration, and rollout strategies to avoid breaking running workloads.

## Track Installed CRD Versions

Check the CRD version installed in each cluster:

```bash
# Check Dapr CRD schema versions
kubectl get crd components.dapr.io -o json | \
  python3 -c "import json,sys; d=json.load(sys.stdin); \
  [print(v['name']) for v in d['spec']['versions']]"
```

Track the Dapr runtime version associated with the CRDs:

```bash
kubectl get deployment dapr-operator -n dapr-system \
  -o jsonpath='{.spec.template.spec.containers[0].image}'
# daprio/dapr:1.13.0
```

## Storing CRDs in Git

Store CRD manifests in a dedicated Git directory:

```bash
# Export current CRDs to version-controlled directory
for crd in components configurations resiliencies subscriptions httpendpoints; do
  kubectl get crd ${crd}.dapr.io -o yaml > ./crds/dapr/${crd}.yaml
done
```

Commit changes as part of Dapr upgrade procedures:

```bash
git add ./crds/dapr/
git commit -m "Upgrade Dapr CRDs to v1.13.0"
```

## Using Helm for CRD Lifecycle Management

Dapr's Helm chart manages CRDs:

```bash
# Install/upgrade Dapr with specific version across clusters
helm repo update

# Production cluster
helm upgrade --install dapr dapr/dapr \
  --version 1.13.0 \
  --namespace dapr-system \
  --create-namespace \
  --wait \
  --kube-context prod-cluster

# Staging cluster
helm upgrade --install dapr dapr/dapr \
  --version 1.13.0 \
  --namespace dapr-system \
  --create-namespace \
  --wait \
  --kube-context staging-cluster
```

## GitOps-Based CRD Versioning with Flux

Use Flux HelmRelease to declare the desired Dapr version per cluster:

```yaml
# clusters/production/dapr-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: dapr
  namespace: dapr-system
spec:
  interval: 30m
  chart:
    spec:
      chart: dapr
      version: "1.13.0"
      sourceRef:
        kind: HelmRepository
        name: dapr
```

```yaml
# clusters/staging/dapr-helmrelease.yaml
spec:
  chart:
    spec:
      version: "1.14.0"  # Staging gets newer version first
```

## Validating CRD Compatibility

Before upgrading, validate existing resources against the new CRD schema:

```bash
# Dry-run apply with the new CRDs
kubectl apply --dry-run=server -f ./crds/dapr/components.yaml

# Validate existing components against new schema
kubectl get components -A -o yaml | \
  kubectl apply --dry-run=server -f -
```

## Handling Breaking Changes

When a CRD version introduces breaking schema changes, migrate resources:

```bash
# Export existing resources
kubectl get components -A -o yaml > components-backup.yaml

# Apply schema migration script
python3 migrate-components.py \
  --from-version v1alpha1 \
  --to-version v1beta1 \
  --input components-backup.yaml \
  --output components-migrated.yaml

# Apply migrated resources
kubectl apply -f components-migrated.yaml
```

## Summary

Versioning Dapr CRDs across clusters requires storing CRD manifests in Git, using Helm chart version pinning per cluster, and leveraging GitOps tools like Flux to declare desired versions declaratively. Test new Dapr versions on staging clusters first, validate existing resources against new CRD schemas with dry-run mode, and maintain migration scripts for breaking schema changes before rolling out to production.
