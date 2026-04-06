# How to Configure Key Rotation for Encrypted OSDs in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Encryption, Security, Kubernetes

Description: Configure automatic and manual encryption key rotation for LUKS-encrypted OSDs in Rook-Ceph to meet security compliance requirements.

---

## Overview

Encryption key rotation is a security best practice that periodically replaces encryption keys to limit the impact of potential key compromise. For Rook-Ceph encrypted OSDs, key rotation involves generating a new LUKS passphrase and updating the KMS without interrupting OSD operation.

## How Key Rotation Works in Rook

Rook supports key rotation for encrypted OSDs through the `CephCluster` annotation mechanism. When rotation is triggered:

1. Rook generates a new encryption key
2. The new key is stored in the configured KMS
3. The LUKS key slot on the OSD device is updated
4. The old key is removed from the KMS
5. The OSD continues operating without interruption

## Trigger Key Rotation via Annotation

Annotate the CephCluster resource to initiate key rotation:

```bash
kubectl annotate cephcluster rook-ceph \
  rook.io/force-osd-encryption-key-rotation="true" \
  -n rook-ceph --overwrite
```

Monitor the rotation progress:

```bash
kubectl describe cephcluster rook-ceph -n rook-ceph | grep -A10 "Key Rotation"
kubectl get events -n rook-ceph | grep -i "key rotation\|encrypt"
```

## Verify Key Rotation Completed

Check the OSD logs for successful key update:

```bash
kubectl logs -n rook-ceph -l app=rook-ceph-osd -c osd | grep -i "key rotation\|luks"
```

From the toolbox, verify the OSD is still healthy after rotation:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph health
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph osd stat
```

## Configure Scheduled Key Rotation with a CronJob

For automated periodic rotation, create a Kubernetes CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: osd-key-rotation
  namespace: rook-ceph
spec:
  schedule: "0 2 1 * *"  # 2 AM on the 1st of each month
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: rook-ceph-operator
          containers:
          - name: key-rotator
            image: bitnami/kubectl:latest
            command:
            - kubectl
            - annotate
            - cephcluster
            - rook-ceph
            - rook.io/force-osd-encryption-key-rotation=true
            - --overwrite
            - -n
            - rook-ceph
          restartPolicy: OnFailure
```

## Monitor Key Rotation in Prometheus

Track key rotation events via Ceph metrics:

```bash
kubectl port-forward -n monitoring svc/prometheus-operated 9090:9090 &
curl -s 'http://localhost:9090/api/v1/query?query=ceph_health_status' | jq .
```

Create an alert if key rotation fails to complete within an expected time:

```yaml
- alert: CephOSDKeyRotationFailed
  expr: |
    kube_cephcluster_annotations{annotation_rook_io_force_osd_encryption_key_rotation="true"}
    and time() - kube_cephcluster_created > 3600
  for: 1h
  labels:
    severity: warning
  annotations:
    summary: "OSD encryption key rotation may be stalled"
```

## Summary

Key rotation for Rook-Ceph encrypted OSDs is triggered via a CephCluster annotation and executes without OSD downtime. For compliance environments requiring periodic rotation, a Kubernetes CronJob automates the process on a schedule. Monitoring via Prometheus alerts ensures rotation failures are caught promptly before they become compliance gaps.
