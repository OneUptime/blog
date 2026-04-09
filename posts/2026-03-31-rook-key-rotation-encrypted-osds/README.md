# How to Configure Key Rotation for Encrypted OSDs in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Encryption, Security, Kubernetes

Description: Configure automatic and manual encryption key rotation for LUKS-encrypted OSDs in Rook-Ceph to meet security compliance requirements.

---

## Overview

Encryption key rotation is a security best practice that periodically replaces encryption keys to limit the impact of potential key compromise. For Rook-Ceph encrypted OSDs, key rotation involves generating a new LUKS passphrase and updating the KMS without interrupting OSD operation. Rook manages this automatically via per-OSD CronJobs when key rotation is enabled in the CephCluster spec.

> **Note:** Key rotation is currently supported only for PVC-backed encrypted OSDs, and only when the Key Encryption Keys (KEKs) are stored in a Kubernetes Secret or Vault KMS.

## How Key Rotation Works in Rook

Rook supports key rotation for encrypted OSDs through the `spec.security.keyRotation` section of the CephCluster CRD. When enabled, Rook creates a Kubernetes CronJob for each encrypted OSD. On each scheduled run, the CronJob performs a dual-slot LUKS key rotation:

1. The current key (K1) is obtained from the KMS
2. K1 is copied to a second LUKS key slot as a backup
3. A new key (K2) is generated and added to the first LUKS key slot
4. K2 is updated in the KMS
5. K1 is removed from the second LUKS key slot
6. The OSD continues operating without interruption

This dual-slot approach ensures that the encrypted device can always be unlocked even if the rotation process is interrupted partway through.

## Enable Key Rotation in the CephCluster Spec

Enable key rotation by adding the `keyRotation` section to the `security` block of your CephCluster resource:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  security:
    keyRotation:
      enabled: true
      schedule: "@weekly"  # cron format, default is @weekly
```

Apply the change:

```bash
kubectl apply -f cluster.yaml
```

You can also patch an existing cluster:

```bash
kubectl patch cephcluster rook-ceph -n rook-ceph --type merge \
  -p '{"spec":{"security":{"keyRotation":{"enabled":true,"schedule":"@weekly"}}}}'
```

Rook will automatically create a CronJob for each encrypted PVC-backed OSD, named `rook-ceph-osd-key-rotation-<OSD_ID>`.

## Verify Key Rotation Is Active

List the key rotation CronJobs created by Rook:

```bash
kubectl get cronjobs -n rook-ceph -l app=rook-ceph-osd
```

Check the most recent job runs:

```bash
kubectl get jobs -n rook-ceph | grep key-rotation
```

From the toolbox, verify the OSDs are still healthy after rotation:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph health
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph osd stat
```

## Customize the Rotation Schedule

The `schedule` field accepts standard cron expressions. Some examples:

```yaml
# Weekly (default)
schedule: "@weekly"

# Monthly on the 1st at 2 AM
schedule: "0 2 1 * *"

# Daily at midnight
schedule: "@daily"
```

After updating the schedule in the CephCluster spec, Rook will reconcile and update the existing CronJobs to match the new schedule.

## Monitor Key Rotation

Check CronJob status to ensure rotations are completing on schedule:

```bash
kubectl get cronjobs -n rook-ceph | grep key-rotation
```

Inspect a failed job for troubleshooting:

```bash
kubectl get jobs -n rook-ceph | grep key-rotation
kubectl logs -n rook-ceph job/<job-name>
```

Verify overall cluster health via the toolbox:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph health detail
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph osd stat
```

## Summary

Key rotation for Rook-Ceph encrypted OSDs is configured in the CephCluster spec under `spec.security.keyRotation` and executes without OSD downtime. Rook automatically creates per-OSD CronJobs that perform a safe dual-slot LUKS key rotation on the configured schedule. Monitoring CronJob status and cluster health ensures rotation failures are caught promptly before they become compliance gaps.
