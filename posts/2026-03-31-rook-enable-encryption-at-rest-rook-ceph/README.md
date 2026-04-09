# How to Enable Encryption at Rest for Rook-Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Security, Encryption, Storage

Description: Enable encryption at rest for Rook-Ceph by configuring BlueStore OSD-level encryption with LUKS, integrating with KMS, and verifying encrypted OSDs in a Kubernetes cluster.

---

## Encryption at Rest in Ceph

Ceph BlueStore supports native encryption at the OSD level using dmcrypt/LUKS. Each OSD device is encrypted with a unique key stored in the Ceph monitor key-value store or an external KMS. When an OSD disk is removed from the cluster, its data cannot be read without the encryption key.

## Enabling OSD Encryption in Rook

Enable encryption in the CephCluster storage configuration:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  storage:
    storageClassDeviceSets:
      - name: set1
        count: 3
        encrypted: true
        volumeClaimTemplates:
          - metadata:
              name: data
            spec:
              resources:
                requests:
                  storage: 1Ti
              storageClassName: local-storage
              volumeMode: Block
              accessModes:
                - ReadWriteOnce
```

The `encrypted: true` flag tells Rook to use dmcrypt when initializing each OSD device.

## Verifying OSD Encryption

Check that OSDs are running with encryption enabled:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd metadata 0 | grep -i encrypt
```

Look for encryption-related fields in the output confirming that dmcrypt is active. You can also verify BlueStore is in use with `ceph osd metadata 0 | grep osd_objectstore`.

Check the OSD pod logs for encryption initialization:

```bash
kubectl -n rook-ceph logs \
  $(kubectl -n rook-ceph get pod -l app=rook-ceph-osd,ceph-osd-id=0 -o name) \
  | grep -i encrypt
```

## KMS Integration for Key Management

Store OSD encryption keys in HashiCorp Vault instead of the Ceph MON KV store:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  security:
    kms:
      connectionDetails:
        KMS_PROVIDER: vault
        VAULT_ADDR: https://vault.example.com:8200
        VAULT_BACKEND_PATH: rook/osd-keys
        VAULT_AUTH_METHOD: kubernetes
        VAULT_AUTH_KUBERNETES_ROLE: rook-ceph-osd
      tokenSecretName: rook-vault-kms-token
  storage:
    storageClassDeviceSets:
      - name: set1
        count: 3
        encrypted: true
```

## Vault Policy for OSD Keys

Create a Vault policy that allows Rook to manage OSD encryption keys:

```hcl
path "rook/osd-keys/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}
```

Apply the policy in Vault:

```bash
vault policy write rook-ceph-osd /tmp/rook-osd-policy.hcl

vault write auth/kubernetes/role/rook-ceph-osd \
  bound_service_account_names=rook-ceph-osd \
  bound_service_account_namespaces=rook-ceph \
  policies=rook-ceph-osd \
  ttl=24h
```

## CephFS and RBD Encryption with StorageClass

Enable per-volume encryption for RBD PVCs:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rbd-encrypted
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: replicapool
  imageFormat: "2"
  imageFeatures: layering
  encrypted: "true"
  encryptionKMSID: vault-kms
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
```

## Summary

Encryption at rest for Rook-Ceph operates at the OSD level using BlueStore dmcrypt, encrypting every write before it reaches the block device. Enabling it requires setting `encrypted: true` in the storageClassDeviceSets. For production deployments, integrating with Vault for key management keeps encryption keys out of the Ceph MON database and provides rotation capabilities.
