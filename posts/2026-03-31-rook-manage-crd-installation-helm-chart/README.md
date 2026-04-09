# How to Manage CRD Installation with Rook Helm Chart

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, Helm, CRD, Operator

Description: Control how Rook-Ceph Custom Resource Definitions are installed and updated via Helm to avoid conflicts and manage CRD lifecycle in production clusters.

---

## Overview

Rook-Ceph relies on many Custom Resource Definitions (CRDs) including `CephCluster`, `CephBlockPool`, `CephFilesystem`, and others. The Helm chart can install these CRDs automatically, but managing CRD lifecycle carefully is important to avoid data loss and upgrade conflicts.

## CRD Installation Modes

The Rook operator Helm chart provides two approaches to CRD management:

**Helm-managed CRDs (using `crds/` directory)**: CRDs are included in the chart and installed by Helm on initial install. Note that Helm does not update or delete CRDs from the `crds/` directory on upgrade or uninstall, so CRDs must still be updated manually before upgrading the operator.

**Separate CRD installation**: Install CRDs independently before the operator, then deploy the operator without CRDs.

## Installing CRDs Separately (Recommended for Production)

For production clusters where CRD changes need explicit review, install CRDs independently:

```bash
# Check out the Rook release version matching your chart
kubectl apply -f https://raw.githubusercontent.com/rook/rook/v1.13.0/deploy/examples/crds.yaml
```

Or extract CRDs from the Helm chart:

```bash
helm template rook-ceph rook-release/rook-ceph \
  --include-crds \
  --namespace rook-ceph | \
  grep -A1000 "CustomResourceDefinition" > rook-crds.yaml

kubectl apply -f rook-crds.yaml
```

Then install the operator without CRDs:

```bash
helm install rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  --skip-crds \
  -f rook-operator-values.yaml
```

## Listing Installed Rook CRDs

```bash
kubectl get crd | grep ceph.rook.io
```

Expected CRDs include:

```text
cephblockpoolradosnamespaces.ceph.rook.io
cephblockpools.ceph.rook.io
cephbucketnotifications.ceph.rook.io
cephbuckettopics.ceph.rook.io
cephclients.ceph.rook.io
cephclusters.ceph.rook.io
cephfilesystemmirrors.ceph.rook.io
cephfilesystems.ceph.rook.io
cephnfses.ceph.rook.io
cephobjectstores.ceph.rook.io
```

## Updating CRDs During Upgrade

When upgrading Rook, CRDs must be updated before the operator:

```bash
# Step 1: Update CRDs
kubectl apply -f https://raw.githubusercontent.com/rook/rook/v1.14.0/deploy/examples/crds.yaml

# Step 2: Upgrade operator
helm upgrade rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  --version 1.14.0 \
  -f rook-operator-values.yaml
```

## Avoiding CRD Deletion During Helm Uninstall

CRDs in Helm's `crds/` directory are not deleted on `helm uninstall` by default. However, if CRDs are managed as regular Helm templates instead, they will be removed on uninstall, which destroys all custom resources. As a defensive measure, annotate CRDs to prevent accidental deletion:

```bash
for crd in $(kubectl get crd -o name | grep ceph.rook.io); do
  kubectl annotate "$crd" \
    helm.sh/resource-policy=keep \
    --overwrite
done
```

## Summary

Managing Rook CRDs separately from the operator chart gives you explicit control over when schema changes take effect. Always update CRDs before upgrading the operator, annotate CRDs with `helm.sh/resource-policy=keep` to prevent accidental deletion, and use `--skip-crds` during operator installation when CRDs are managed independently.
