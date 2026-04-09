# How to Perform Patch Release Upgrades in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Upgrade, PATCH, Maintenance

Description: Step-by-step guide to safely performing patch release upgrades in Rook-Ceph, covering pre-checks, upgrade execution, and post-upgrade verification.

---

Patch releases in Rook (e.g., v1.14.0 to v1.14.3) fix bugs and security vulnerabilities without introducing breaking changes. While patch upgrades are lower risk than minor or major upgrades, they still require a systematic approach to avoid unexpected downtime.

## Understanding Patch vs. Minor Upgrades

Rook follows semantic versioning:
- Patch releases (x.y.Z): Bug fixes, security patches, no API changes
- Minor releases (x.Y.0): New features, possible deprecations, may require CRD updates
- Major releases (X.0.0): Breaking changes, API removals, mandatory migration steps

For patch upgrades, CRDs usually do not change, so the upgrade is simpler. Always verify by checking the release notes.

## Pre-Upgrade Checklist

Before starting any upgrade, verify the cluster is healthy:

```bash
# Check overall cluster health
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status

# Verify all OSDs are up
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd stat

# Check for pending operations
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd pool stats

# Verify PG health
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg stat
```

Expected healthy output:

```text
cluster:
  health: HEALTH_OK

osds: 6 osds: 6 up (since 5d), 6 in (since 5d)

pgmap: 192 pgs: 192 active+clean; 5.4 GiB data, 16 GiB used, 94 GiB / 110 GiB avail
```

Do not proceed with upgrades if the cluster shows `HEALTH_WARN` or `HEALTH_ERR` or has any degraded PGs.

## Check the Target Version

Review the release notes for the target patch version:

```bash
# Check current version
kubectl -n rook-ceph get deployment rook-ceph-operator \
  -o jsonpath='{.spec.template.spec.containers[0].image}'
```

```text
rook/ceph:v1.14.0
```

Check the Rook GitHub releases page for the changelog between your current version and the target.

## Upgrading with Helm

If you installed Rook via Helm, update the Helm repository and upgrade:

```bash
# Update Helm repository
helm repo update

# Check available versions
helm search repo rook-release/rook-ceph --versions | head -10

# Upgrade operator (patch release - CRDs rarely change)
helm upgrade rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  --version 1.14.3 \
  --reuse-values
```

For patch releases, you typically do not need to upgrade CRDs separately, but verify in the release notes.

## Upgrading with Manifests

If you installed via manifests, download the new version manifests:

```bash
ROOK_VERSION="v1.14.3"

# Check if CRDs changed
diff <(kubectl get crd -o yaml | grep -A2 "rook.io") \
  <(curl -s https://raw.githubusercontent.com/rook/rook/${ROOK_VERSION}/deploy/examples/crds.yaml | grep "name:")

# Apply CRDs if changed
kubectl apply -f https://raw.githubusercontent.com/rook/rook/${ROOK_VERSION}/deploy/examples/crds.yaml

# Apply common resources
kubectl apply -f https://raw.githubusercontent.com/rook/rook/${ROOK_VERSION}/deploy/examples/common.yaml

# Apply operator
kubectl apply -f https://raw.githubusercontent.com/rook/rook/${ROOK_VERSION}/deploy/examples/operator.yaml
```

## Monitoring the Upgrade

After applying the new operator image, watch the rollout:

```bash
kubectl -n rook-ceph rollout status deployment rook-ceph-operator
kubectl -n rook-ceph rollout status deployment rook-ceph-mgr-a
```

The operator will automatically update the Ceph daemon images. Monitor daemon pod restarts:

```bash
kubectl -n rook-ceph get pods -w | grep -E "mon|mgr|osd"
```

Daemons restart one at a time to maintain availability.

## Post-Upgrade Verification

After all pods have updated, verify the cluster is healthy:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph versions
```

The `ceph versions` command shows all daemon versions, which should now be consistent:

```text
{
    "mon": {
        "ceph version 18.2.3 (abc123) reef (stable)": 3
    },
    "mgr": {
        "ceph version 18.2.3 (abc123) reef (stable)": 1
    },
    "osd": {
        "ceph version 18.2.3 (abc123) reef (stable)": 6
    }
}
```

If any daemon shows an old version, force a pod restart:

```bash
kubectl -n rook-ceph rollout restart deployment rook-ceph-mon-a
```

## Rollback

If a patch upgrade causes issues, rolling back is straightforward since patch releases do not change APIs:

```bash
helm rollback rook-ceph --namespace rook-ceph
```

Or apply the previous version manifests.

## Summary

Patch release upgrades in Rook-Ceph require verifying cluster health before starting, checking if CRDs changed (usually not for patch releases), updating the operator via Helm or manifests, monitoring daemon pod restarts, and confirming all daemons report the new version with `ceph versions`. Patch upgrades are lower risk than minor upgrades but still require cluster health verification before and after the process.
