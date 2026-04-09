# How to Set Up Encryption Key Rotation with Rook CSI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CSI, Encryption, Security

Description: Learn how to rotate encryption keys for LUKS-encrypted RBD volumes managed by Rook CSI using the CSI-Addons EncryptionKeyRotation resource.

---

## Why Rotate Encryption Keys

Rook CSI supports LUKS encryption for RBD block volumes, where each volume is encrypted with a key stored in a Kubernetes Secret or an external KMS like Vault. Periodic key rotation is a security best practice and may be required for compliance (PCI-DSS, HIPAA). With CSI-Addons, key rotation can be triggered as a Kubernetes operation without unmounting the volume or interrupting workloads.

## Prerequisites

Encrypted RBD volumes must already exist using the Rook CSI encryption feature. Check that the StorageClass used for the PVC has encryption enabled:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-block-encrypted
provisioner: rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: replicapool
  encrypted: "true"
  encryptionKMSID: vault-kms
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
```

## Creating an EncryptionKeyRotationJob

Use the CSI-Addons `EncryptionKeyRotationJob` CRD to trigger a rotation:

```yaml
apiVersion: csiaddons.openshift.io/v1alpha1
kind: EncryptionKeyRotationJob
metadata:
  name: rotate-key-my-pvc
  namespace: my-app
spec:
  target:
    persistentVolumeClaim: my-encrypted-pvc
  backOffLimit: 6
  retryDeadlineSeconds: 600
```

Apply it:

```bash
kubectl apply -f key-rotation-job.yaml
```

## Monitoring Key Rotation Progress

Check the status of the rotation job:

```bash
kubectl get encryptionkeyrotationjob rotate-key-my-pvc -n my-app
```

Output when complete:

```text
NAME                    RESULT      AGE
rotate-key-my-pvc       Succeeded   2m
```

If the job fails, inspect the conditions:

```bash
kubectl describe encryptionkeyrotationjob rotate-key-my-pvc -n my-app
```

## How Key Rotation Works

When the `EncryptionKeyRotationJob` runs:

1. The CSI-Addons sidecar contacts the KMS (Vault, Kubernetes Secret) to generate or retrieve a new encryption key
2. The new key is added to a free LUKS key slot on the RBD image via `cryptsetup luksAddKey`, then the old key slot is removed via `cryptsetup luksKillSlot`
3. The KMS is updated with the new key reference
4. The operation is performed online while the volume is mounted, without interrupting the workload

This is possible because LUKS supports multiple key slots, allowing key replacement without re-encrypting the entire volume data.

## Scheduling Recurring Key Rotation

For compliance requirements, create a `ReclaimSpaceCronJob`-style scheduled rotation using `EncryptionKeyRotationCronJob`:

```yaml
apiVersion: csiaddons.openshift.io/v1alpha1
kind: EncryptionKeyRotationCronJob
metadata:
  name: rotate-key-monthly
  namespace: my-app
spec:
  schedule: "0 1 1 * *"
  jobSpec:
    target:
      persistentVolumeClaim: my-encrypted-pvc
    backOffLimit: 3
    retryDeadlineSeconds: 900
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
```

This rotates the encryption key on the first of every month at 01:00.

## Summary

Encryption key rotation for Rook CSI LUKS volumes is handled by the CSI-Addons `EncryptionKeyRotationJob` resource. It performs live LUKS key slot replacement via the KMS without unmounting the volume. Create a one-time job for immediate rotation or an `EncryptionKeyRotationCronJob` for scheduled rotation to meet compliance requirements. The operation is non-disruptive to running workloads.
