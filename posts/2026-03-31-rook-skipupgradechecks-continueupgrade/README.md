# How to Handle skipUpgradeChecks and continueUpgradeAfterChecks in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Upgrade, Configuration, Operator

Description: Learn when and how to use skipUpgradeChecks and continueUpgradeAfterChecksEvenIfNotHealthy settings in Rook to control upgrade behavior.

---

Rook's upgrade controller includes health checks that gate each step of a Ceph upgrade. If the cluster is not healthy, the operator pauses and waits before continuing. Two settings - `skipUpgradeChecks` and `continueUpgradeAfterChecksEvenIfNotHealthy` - control how the operator handles these gates. Understanding when to use them prevents upgrades from stalling or proceeding unsafely.

## The Default Upgrade Behavior

By default, Rook performs health checks between each daemon restart during a Ceph upgrade. The operator will:
1. Upgrade one daemon (e.g., one OSD pod)
2. Wait for the cluster to return to healthy state
3. Proceed to the next daemon

This behavior ensures the cluster has time to recover between each daemon restart before introducing additional disruption. The operator waits indefinitely for the cluster to become healthy before proceeding to the next daemon.

## When Upgrades Stall

If the cluster has a pre-existing health warning or if recovery after a daemon restart takes longer than expected, the upgrade may stall. Check the operator logs:

```bash
kubectl -n rook-ceph logs -l app=rook-ceph-operator | grep -i "upgrade\|check\|health"
```

```text
waiting for ceph cluster to become healthy before continuing upgrade
ceph health: HEALTH_WARN
  10 pgs not deep-scrubbed in time
```

A non-critical health warning (like overdue deep scrub) should not block an upgrade. This is where the override settings become useful.

## skipUpgradeChecks

The `skipUpgradeChecks` field instructs the Rook operator to skip health checks entirely between daemon restarts during an upgrade. All daemons are updated without waiting for health verification.

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  skipUpgradeChecks: true
  cephVersion:
    image: quay.io/ceph/ceph:v18.2.3
```

**When to use:** Only in controlled situations where you have verified the cluster is healthy and you want to accelerate the upgrade process (e.g., in staging environments or during maintenance windows where speed matters).

**When NOT to use:** In production clusters where you want the safety net of health verification between daemon restarts. If a daemon restart causes issues, `skipUpgradeChecks: true` means the upgrade continues before you can assess the damage.

After the upgrade completes, always reset this to `false`:

```bash
kubectl -n rook-ceph patch cephcluster rook-ceph \
  --type merge \
  -p '{"spec":{"skipUpgradeChecks": false}}'
```

## continueUpgradeAfterChecksEvenIfNotHealthy

This setting is a middle ground between the default (wait indefinitely) and `skipUpgradeChecks` (skip checks entirely). With `continueUpgradeAfterChecksEvenIfNotHealthy: true`, the operator runs the health checks but proceeds even if they report unhealthy - after a brief waiting period.

```yaml
spec:
  continueUpgradeAfterChecksEvenIfNotHealthy: true
  cephVersion:
    image: quay.io/ceph/ceph:v18.2.3
```

**When to use:** When the cluster has a known, non-critical health warning that you cannot resolve before the upgrade (e.g., a warning about deprecated features or overdue scrubbing). The health check still runs and logs the warning, but the upgrade proceeds.

**When NOT to use:** When the cluster has significant health issues like degraded PGs, offline OSDs, or incomplete recovery. Upgrading in those conditions risks data loss.

## Checking Current Settings

View the current settings on your CephCluster:

```bash
kubectl -n rook-ceph get cephcluster rook-ceph \
  -o jsonpath='{.spec.skipUpgradeChecks},{.spec.continueUpgradeAfterChecksEvenIfNotHealthy}'
```

## Practical Example: Stuck Upgrade Resolution

Scenario: An upgrade is stuck due to a `HEALTH_WARN` about overdue deep scrubs.

First, try to clear the warning by running deep scrub:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg deep-scrub 1.0
```

If clearing the warning is not practical in the maintenance window, use `continueUpgradeAfterChecksEvenIfNotHealthy`:

```bash
kubectl -n rook-ceph patch cephcluster rook-ceph \
  --type merge \
  -p '{"spec":{"continueUpgradeAfterChecksEvenIfNotHealthy": true}}'
```

Watch the operator resume:

```bash
kubectl -n rook-ceph logs -l app=rook-ceph-operator -f | grep -i upgrade
```

After the upgrade completes successfully, reset the setting:

```bash
kubectl -n rook-ceph patch cephcluster rook-ceph \
  --type merge \
  -p '{"spec":{"continueUpgradeAfterChecksEvenIfNotHealthy": false}}'
```

## Upgrade Timeout Configuration

You can also tune how long the operator waits before declaring a health check as failed:

```yaml
spec:
  healthCheck:
    daemonHealth:
      mon:
        interval: 45s
      osd:
        interval: 60s
      status:
        interval: 60s
```

This is separate from upgrade checks but affects how quickly the operator detects and reports health issues during upgrades.

## Summary

`skipUpgradeChecks` disables all health checks during Rook-Ceph upgrades and should only be used in non-production environments or when full control of the upgrade is desired. `continueUpgradeAfterChecksEvenIfNotHealthy` is a safer alternative that runs checks but proceeds despite non-critical warnings. Both settings should be reset to their default values after the upgrade completes. Always investigate the reason an upgrade is stalling before using these overrides in production.
