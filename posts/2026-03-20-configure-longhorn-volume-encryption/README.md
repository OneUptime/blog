# How to Configure Longhorn Volume Encryption

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Kubernetes, Storage, Encryption, Security

Description: Learn how to configure encryption for Longhorn volumes using Kubernetes secrets and LUKS-based encryption to protect data at rest.

## Introduction

Longhorn supports volume encryption using Linux Unified Key Setup (LUKS), which encrypts the block device before the filesystem is created. Encrypted volumes ensure that data at rest cannot be read even if the underlying storage media is compromised. This guide explains how to set up and use Longhorn's volume encryption feature.

## How Longhorn Encryption Works

Longhorn uses the Linux `cryptsetup` utility with LUKS2 to encrypt volumes:

1. A Kubernetes Secret provides the encryption passphrase
2. Longhorn uses the passphrase to create a LUKS2 encrypted device
3. The filesystem is created on top of the encrypted device
4. The passphrase must be available when the volume is attached

## Prerequisites

- Longhorn v1.2.0 or later
- `cryptsetup` installed on all Kubernetes nodes
- `dm_crypt` kernel module loaded

### Verify Prerequisites

```bash
# Check cryptsetup is installed on each node

cryptsetup --version

# Ensure dm_crypt module is loaded
lsmod | grep dm_crypt

# Load the module if not loaded
modprobe dm_crypt

# Make it persistent across reboots
echo "dm_crypt" >> /etc/modules
```

## Step 1: Create an Encryption Secret

```yaml
# encryption-secret.yaml - Longhorn volume encryption passphrase
apiVersion: v1
kind: Secret
metadata:
  name: longhorn-crypto
  namespace: longhorn-system
stringData:
  # The encryption passphrase - use a strong random value in production
  CRYPTO_KEY_VALUE: "your-very-strong-encryption-passphrase-here"
  # Key provider (default is "secret")
  CRYPTO_KEY_PROVIDER: "secret"
  # LUKS cipher (aes-xts-plain64 is recommended)
  CRYPTO_KEY_CIPHER: "aes-xts-plain64"
  # Passphrase hash algorithm
  CRYPTO_KEY_HASH: "sha256"
  # Key size in bits (must be a multiple of 8; default is 256)
  CRYPTO_KEY_SIZE: "256"
  # PBKDF algorithm (default is argon2i)
  CRYPTO_PBKDF: "argon2i"
```

```bash
# Apply the secret
kubectl apply -f encryption-secret.yaml

# Or create from command line with a random passphrase
kubectl create secret generic longhorn-crypto \
  -n longhorn-system \
  --from-literal=CRYPTO_KEY_VALUE="$(openssl rand -base64 32)" \
  --from-literal=CRYPTO_KEY_PROVIDER="secret"
```

## Step 2: Create an Encrypted StorageClass

```yaml
# storageclass-encrypted.yaml - StorageClass with encryption enabled
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-encrypted
provisioner: driver.longhorn.io
allowVolumeExpansion: true
parameters:
  numberOfReplicas: "3"
  staleReplicaTimeout: "30"
  fsType: "ext4"
  # Enable encryption
  encrypted: "true"
  # Reference the encryption secret
  csi.storage.k8s.io/provisioner-secret-name: "longhorn-crypto"
  csi.storage.k8s.io/provisioner-secret-namespace: "longhorn-system"
  csi.storage.k8s.io/node-publish-secret-name: "longhorn-crypto"
  csi.storage.k8s.io/node-publish-secret-namespace: "longhorn-system"
  csi.storage.k8s.io/node-stage-secret-name: "longhorn-crypto"
  csi.storage.k8s.io/node-stage-secret-namespace: "longhorn-system"
```

```bash
kubectl apply -f storageclass-encrypted.yaml
```

## Step 3: Create an Encrypted PVC

```yaml
# encrypted-pvc.yaml - PVC that will be encrypted
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: encrypted-data
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  # Use the encrypted storage class
  storageClassName: longhorn-encrypted
  resources:
    requests:
      storage: 10Gi
```

```bash
kubectl apply -f encrypted-pvc.yaml
kubectl get pvc encrypted-data
```

## Step 4: Use the Encrypted Volume in a Pod

```yaml
# pod-encrypted.yaml - Pod using the encrypted volume
apiVersion: v1
kind: Pod
metadata:
  name: test-encryption
spec:
  containers:
    - name: app
      image: busybox
      command: ["sh", "-c", "echo 'secret data' > /data/secret.txt && sleep 3600"]
      volumeMounts:
        - name: encrypted-storage
          mountPath: /data
  volumes:
    - name: encrypted-storage
      persistentVolumeClaim:
        claimName: encrypted-data
```

```bash
kubectl apply -f pod-encrypted.yaml

# Verify data is written and readable
kubectl exec test-encryption -- cat /data/secret.txt
```

## Verify Encryption is Active

```bash
# SSH to the node where the volume is attached
# Find the device mapper device
ls /dev/mapper/ | grep longhorn

# Check that LUKS encryption is active
cryptsetup status /dev/mapper/<longhorn-device-name>

# Verify the encrypted block device
lsblk -f | grep crypt
```

## Using Per-Namespace Encryption Keys

For multi-tenant environments, use different encryption keys per namespace:

```yaml
# Namespace-specific secret
apiVersion: v1
kind: Secret
metadata:
  name: namespace-crypto-key
  namespace: sensitive-apps    # The namespace that uses this key
stringData:
  CRYPTO_KEY_VALUE: "namespace-specific-strong-passphrase"
  CRYPTO_KEY_PROVIDER: "secret"
```

```yaml
# StorageClass referencing namespace-specific secret
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-encrypted-ns
provisioner: driver.longhorn.io
parameters:
  encrypted: "true"
  # Reference secret from the PVC's namespace (use ${pvc.namespace} variable)
  csi.storage.k8s.io/provisioner-secret-name: "namespace-crypto-key"
  csi.storage.k8s.io/provisioner-secret-namespace: "${pvc.namespace}"
  csi.storage.k8s.io/node-stage-secret-name: "namespace-crypto-key"
  csi.storage.k8s.io/node-stage-secret-namespace: "${pvc.namespace}"
  csi.storage.k8s.io/node-publish-secret-name: "namespace-crypto-key"
  csi.storage.k8s.io/node-publish-secret-namespace: "${pvc.namespace}"
```

## Encryption Key Rotation

Rotating encryption keys for existing volumes requires:

1. Decrypting the volume with the old key
2. Re-encrypting with the new key
3. Updating the Kubernetes secret

> **Warning:** Key rotation for LUKS requires the volume to be accessible. Always test this procedure in a non-production environment first.

```bash
# Update the secret with a new key value
kubectl patch secret longhorn-crypto \
  -n longhorn-system \
  --type merge \
  -p '{"stringData": {"CRYPTO_KEY_VALUE": "new-strong-passphrase"}}'
```

## Conclusion

Longhorn's LUKS-based volume encryption provides strong data-at-rest protection for sensitive workloads. By creating encrypted StorageClasses backed by Kubernetes Secrets, you can ensure that persistent data is always encrypted on disk. For production environments, use strong randomly generated passphrases, store them securely (consider using external secret management like Vault), and ensure that encryption keys are backed up - without the key, encrypted data cannot be recovered.
