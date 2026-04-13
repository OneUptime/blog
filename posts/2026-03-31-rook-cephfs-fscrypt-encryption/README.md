# How to Configure CephFS fscrypt Encryption with Rook CSI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Encryption, Storage, Kubernetes

Description: Learn how to enable CephFS fscrypt encryption in Rook CSI to protect data at rest on a per-directory basis using Linux kernel encryption.

---

## What is CephFS fscrypt?

CephFS fscrypt is a Linux kernel feature that provides file-system-level encryption for CephFS volumes. Unlike block-level encryption (LUKS), fscrypt encrypts individual directories and files, allowing granular control over which data is encrypted. Rook CSI integrates this capability so Kubernetes workloads can use encrypted CephFS volumes transparently.

## Prerequisites

Before configuring fscrypt, ensure the following conditions are met:

- Rook version 1.15 or later
- Linux kernel 6.6 or later on all nodes
- CephFS kernel client loaded (`ceph` module)
- `CONFIG_FS_ENCRYPTION=y` enabled in the kernel

Check kernel support on your nodes:

```bash
cat /proc/filesystems | grep ceph
grep CONFIG_FS_ENCRYPTION /boot/config-$(uname -r)
```

## Enable fscrypt in the StorageClass

To enable fscrypt encryption, set the `encryptionKMSID` parameter and the `encrypted` flag in your CephFS StorageClass:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-cephfs-encrypted
provisioner: rook-ceph.cephfs.csi.ceph.com
parameters:
  clusterID: rook-ceph
  fsName: myfs
  pool: myfs-replicated
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-cephfs-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-cephfs-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
  encrypted: "true"
  encryptionKMSID: secrets-metadata-kms
reclaimPolicy: Delete
allowVolumeExpansion: true
mountOptions:
  - debug
```

## Configure the KMS Backend

fscrypt requires a Key Management Service (KMS) to store encryption keys. The simplest option is the `secrets-metadata` KMS, which stores keys as Kubernetes Secrets. Add this configuration to the `rook-ceph-csi-kms-config` ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-ceph-csi-kms-config
  namespace: rook-ceph
data:
  config.json: |-
    {
      "secrets-metadata-kms": {
        "encryptionKMSType": "metadata",
        "secretName": "cephfs-encryption-keys",
        "secretNamespace": "rook-ceph"
      }
    }
```

## Create and Test an Encrypted PVC

Once the StorageClass is ready, create a PersistentVolumeClaim:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: cephfs-encrypted-pvc
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 5Gi
  storageClassName: rook-cephfs-encrypted
```

Deploy a test pod to write and read data:

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: fscrypt-test
spec:
  containers:
  - name: test
    image: busybox
    command: ["sh", "-c", "echo 'encrypted data' > /mnt/data/test.txt && cat /mnt/data/test.txt"]
    volumeMounts:
    - mountPath: /mnt/data
      name: data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: cephfs-encrypted-pvc
EOF
```

## Verify Encryption is Active

After the pod runs, check the CSI node plugin logs to confirm encryption was applied:

```bash
kubectl logs -n rook-ceph -l app=csi-cephfsplugin -c csi-cephfsplugin | grep -i fscrypt
```

You should see log entries indicating the encryption policy was set on the volume directory. The OSDs store the encrypted file data, while the MDS stores encrypted metadata such as filenames and directory entries. Neither the MDS nor OSDs are aware of the encryption - only clients with the correct key can decrypt the contents.

## Summary

CephFS fscrypt encryption in Rook CSI provides directory-level data protection using the Linux kernel's fscrypt framework. By configuring the `encrypted: "true"` parameter in the StorageClass alongside a KMS backend, teams can enforce encryption for sensitive workloads running on shared CephFS volumes without modifying application code.
