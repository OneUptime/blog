# How to Automate Ceph Upgrades with Rolling Strategy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Upgrade, Rolling Update, Automation

Description: Learn how to automate Ceph version upgrades using Rook's rolling upgrade strategy to update the cluster with zero downtime and automatic health verification.

---

Ceph upgrades must be performed carefully to avoid data unavailability. Rook's rolling upgrade strategy automates the process by updating one daemon at a time while verifying cluster health between each step.

## How Rook Rolling Upgrades Work

When you update the Ceph version in the CephCluster spec, Rook:
1. Updates the image for one daemon type at a time
2. Waits for each daemon to restart successfully
3. Verifies the cluster returns to a healthy state
4. Proceeds to the next daemon

The upgrade order is: MON -> MGR -> OSD -> MDS -> RGW -> RBD Mirror

## Preparing for an Upgrade

Check current version and cluster health:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph version
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph -s
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph health detail
```

Verify all PGs are clean:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph pg stat | grep -v "active+clean"
```

Do not proceed if any PGs are degraded or recovering.

## Triggering the Rolling Upgrade

Update the Ceph version in the CephCluster spec:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v18.2.4  # Updated from v18.2.0
    allowUnsupported: false
```

Apply the update:

```bash
kubectl apply -f cluster.yaml
```

## Monitoring Upgrade Progress

Watch the upgrade in real-time:

```bash
kubectl -n rook-ceph get pods -w
```

Check Rook operator logs:

```bash
kubectl -n rook-ceph logs deploy/rook-ceph-operator -f | grep -i upgrade
```

Check upgrade status via the CephCluster condition:

```bash
kubectl -n rook-ceph get cephcluster rook-ceph -o jsonpath='{.status.conditions}' | \
  python3 -m json.tool
```

## Automated Upgrade Script

```bash
#!/bin/bash
set -euo pipefail

NAMESPACE="rook-ceph"
NEW_VERSION="quay.io/ceph/ceph:v18.2.4"

echo "Starting Ceph upgrade to $NEW_VERSION"

# Pre-upgrade health check
HEALTH=$(kubectl -n $NAMESPACE exec deploy/rook-ceph-tools -- \
  ceph health --format json | python3 -c "import json,sys; print(json.load(sys.stdin)['status'])")

if [ "$HEALTH" != "HEALTH_OK" ]; then
  echo "Cluster is not healthy. Aborting upgrade."
  kubectl -n $NAMESPACE exec deploy/rook-ceph-tools -- ceph health detail
  exit 1
fi

# Patch the CephCluster
kubectl -n $NAMESPACE patch cephcluster rook-ceph \
  --type merge \
  --patch "{\"spec\":{\"cephVersion\":{\"image\":\"$NEW_VERSION\"}}}"

echo "Upgrade triggered. Monitoring..."

# Wait for upgrade to complete
timeout 1800 bash -c '
  while true; do
    PHASE=$(kubectl -n rook-ceph get cephcluster rook-ceph \
      -o jsonpath="{.status.phase}")
    echo "Phase: $PHASE"
    if [ "$PHASE" = "Ready" ]; then
      echo "Upgrade complete!"
      break
    fi
    sleep 30
  done
'

# Post-upgrade verification
kubectl -n $NAMESPACE exec deploy/rook-ceph-tools -- ceph version
kubectl -n $NAMESPACE exec deploy/rook-ceph-tools -- ceph -s
```

## Pausing and Resuming Upgrades

Pause a running upgrade by scaling down the Rook operator:

```bash
kubectl -n rook-ceph scale deployment rook-ceph-operator --replicas=0
```

Resume by scaling it back up:

```bash
kubectl -n rook-ceph scale deployment rook-ceph-operator --replicas=1
```

## Summary

Automating Ceph upgrades with Rook's rolling strategy requires updating the CephCluster image version and letting Rook handle daemon-by-daemon restarts with health verification. Adding pre-upgrade health checks and post-upgrade verification in a wrapper script creates a safe, repeatable upgrade process. Scaling down the Rook operator provides an emergency stop if something goes wrong mid-upgrade.
