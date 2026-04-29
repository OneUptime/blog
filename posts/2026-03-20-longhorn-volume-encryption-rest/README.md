# How to Enable Longhorn Volume Encryption at Rest - Volume

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Encryption, Kubernetes, Storage, Security, LUKS, SUSE Rancher

Description: Learn how to enable Longhorn volume encryption at rest using LUKS to protect sensitive data stored in Longhorn persistent volumes on Kubernetes clusters.

---

Longhorn supports volume encryption at rest using LUKS (Linux Unified Key Setup). Ensure the `dm_crypt` kernel module is loaded and `cryptsetup` is installed on worker nodes before using encrypted volumes. Encryption protects data stored on disk from physical access threats and meets compliance requirements for sensitive workloads.

---

## How Longhorn Encryption Works

Longhorn uses the Linux kernel's `dm-crypt` module with LUKS to encrypt volume data at the block device level. Longhorn stores the passphrase in a Kubernetes Secret, which can be shared across volumes or specified per volume through StorageClass secret parameters.

---

## Step 1: Create an Encryption Key Secret

```yaml
# longhorn-crypto-secret.yaml

apiVersion: v1
kind: Secret
metadata:
  name: longhorn-crypto
  namespace: longhorn-system
stringData:
  # Passphrase stored as string data; Base64 encoding is not required
  CRYPTO_KEY_VALUE: "this-is-a-very-long-random-secret-key-replace-this"
  # Longhorn reads the passphrase from a Kubernetes Secret
  CRYPTO_KEY_PROVIDER: "secret"
  # Cipher specification used for LUKS
  CRYPTO_KEY_CIPHER: "aes-xts-plain64"
  # Passphrase hash used for cryptsetup open
  CRYPTO_KEY_HASH: "sha256"
  # Key size in bits
  CRYPTO_KEY_SIZE: "256"
  # PBKDF algorithm for the LUKS keyslot
  CRYPTO_PBKDF: "argon2i"
```

```bash
kubectl apply -f longhorn-crypto-secret.yaml
```

---

## Step 2: Create an Encrypted StorageClass

```yaml
# storageclass-encrypted.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-encrypted
provisioner: driver.longhorn.io
allowVolumeExpansion: true
parameters:
  numberOfReplicas: "3"
  staleReplicaTimeout: "2880"
  fromBackup: ""
  # Enable encryption
  encrypted: "true"
  # Reference the secret containing the crypto key
  csi.storage.k8s.io/provisioner-secret-name: longhorn-crypto
  csi.storage.k8s.io/provisioner-secret-namespace: longhorn-system
  csi.storage.k8s.io/node-publish-secret-name: longhorn-crypto
  csi.storage.k8s.io/node-publish-secret-namespace: longhorn-system
  csi.storage.k8s.io/node-stage-secret-name: longhorn-crypto
  csi.storage.k8s.io/node-stage-secret-namespace: longhorn-system
  csi.storage.k8s.io/node-expand-secret-name: longhorn-crypto
  csi.storage.k8s.io/node-expand-secret-namespace: longhorn-system
```

```bash
kubectl apply -f storageclass-encrypted.yaml
```

---

## Step 3: Create an Encrypted PVC

```yaml
# encrypted-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: encrypted-data
  namespace: my-app
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn-encrypted
  resources:
    requests:
      storage: 10Gi
```

---

## Step 4: Verify Encryption

After the PVC is bound and mounted, confirm encryption is active:

```bash
# List Longhorn volumes
kubectl get volumes.longhorn.io -n longhorn-system

# Confirm the Longhorn volume is marked as encrypted
kubectl get volumes.longhorn.io <volume-name> -n longhorn-system \
  -o jsonpath='{.spec.encrypted}{"\n"}'

# On the node where the volume is mounted, verify a crypt or LUKS device is present
lsblk -o NAME,TYPE,FSTYPE,MOUNTPOINT | grep -E 'crypt|crypto_LUKS'
```

---

## Rotating Encryption Keys

Longhorn's volume encryption documentation describes configuring a Secret and StorageClass for encrypted volumes, but it does not document in-place encryption key rotation for existing volumes. If you need a new key, create a new Secret and reference it from a StorageClass for newly provisioned volumes, then migrate data to a newly created encrypted volume instead of patching `CRYPTO_KEY_VALUE` in place.

---

## Best Practices

- Store encryption keys in an external secrets manager (HashiCorp Vault, AWS Secrets Manager) and use External Secrets Operator to sync them to Kubernetes.
- Use different encryption keys per environment (dev, staging, production).
- Test encrypted volume restore from backup before relying on it for production data.
- Encryption adds performance overhead - benchmark your workload before production deployment.
