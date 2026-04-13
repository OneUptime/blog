# How to Create a Ceph Upgrade Runbook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Upgrade, Runbook, Kubernetes, Operation

Description: A comprehensive Ceph upgrade runbook covering pre-upgrade checks, operator upgrade, Ceph version bumps, and post-upgrade validation steps.

---

## Pre-Upgrade Checklist

Before starting any upgrade, verify the cluster is healthy:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health detail
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd stat
```

All conditions must be true:
- Cluster is `HEALTH_OK`
- No OSDs are `down` or `out`
- All PGs are `active+clean`
- No ongoing recovery operations

## Step 1: Update CRDs

CRDs must be updated before the operator upgrade. The new operator may depend on CRD fields that do not exist yet, so always apply CRDs first:

```bash
kubectl apply -f https://raw.githubusercontent.com/rook/rook/v1.14.0/deploy/examples/crds.yaml
```

Verify the CRDs were updated:

```bash
kubectl get crd | grep ceph
```

## Step 2: Upgrade the Rook Operator

With CRDs in place, upgrade the Rook operator. Use the Helm upgrade:

```bash
helm repo update
helm upgrade rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  --version v1.14.0 \
  -f values.yaml
```

Or apply the updated operator manifests directly:

```bash
kubectl -n rook-ceph apply -f https://raw.githubusercontent.com/rook/rook/v1.14.0/deploy/examples/operator.yaml
```

Monitor the operator rollout:

```bash
kubectl -n rook-ceph rollout status deploy/rook-ceph-operator
```

## Step 3: Update the Ceph Image Version

Edit the CephCluster resource to bump the Ceph image:

```yaml
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v18.2.4
    allowUnsupported: false
```

Apply the change:

```bash
kubectl -n rook-ceph apply -f ceph-cluster.yaml
```

## Step 4: Monitor the Upgrade Progress

The Rook operator performs a rolling upgrade of all Ceph daemons:

```bash
watch kubectl -n rook-ceph get pods
```

Check the upgrade status via the `CephCluster` status:

```bash
kubectl -n rook-ceph get cephcluster rook-ceph -o jsonpath='{.status.ceph}' | python3 -m json.tool
```

## Step 5: Post-Upgrade Validation

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph version
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd versions
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph mon versions
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph mgr versions
```

Ensure all daemons report the new version.

## Rollback Procedure

If the upgrade causes issues, revert the Ceph image in the CephCluster spec and re-apply. Rook will roll back the daemon versions. Note that Ceph downgrades are not always safe - if internal data formats were upgraded during the new version's startup, reverting the image may cause issues. Test rollback procedures in a non-production environment first:

```bash
kubectl -n rook-ceph patch cephcluster rook-ceph --type merge \
  -p '{"spec":{"cephVersion":{"image":"quay.io/ceph/ceph:v18.2.2"}}}'
```

## Summary

A Ceph upgrade runbook ensures every step is documented and repeatable. The sequence is: validate health, update CRDs, upgrade the operator, bump the Ceph image, and confirm all daemons are running the new version. Always verify cluster health before and after each phase.
