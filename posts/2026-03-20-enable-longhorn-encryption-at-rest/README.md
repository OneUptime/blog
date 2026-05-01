# How to Enable Longhorn Volume Encryption at Rest

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Kubernetes, Storage, Encryption, Security, Compliance

Description: Configure Longhorn's global encryption at rest settings and implement encryption policies to protect all volume data across your Kubernetes cluster.

## Introduction

Encryption at rest is a fundamental security requirement for many regulatory frameworks including HIPAA, PCI-DSS, SOC 2, and GDPR. Longhorn supports encryption at the volume level using LUKS (Linux Unified Key Setup). This guide covers how to enable global encryption defaults so that all newly created volumes are encrypted by default.

## Encryption Architecture

Longhorn's encryption at rest:
- Operates at the block device level (before the filesystem)
- Uses LUKS2 with AES-XTS cipher (industry standard)
- Key material is stored in Kubernetes Secrets
- Each encrypted volume can have its own key or share a common key

## Prerequisites

### Verify System Requirements

Run these checks on every Kubernetes node:

```bash
# Check cryptsetup is installed
cryptsetup --version

# Verify dm-crypt kernel module is available
modinfo dm_crypt

# Check dm-crypt is loaded
lsmod | grep dm_crypt

# Load if not already loaded
modprobe dm_crypt
```

If `dm_crypt` is not loaded automatically on boot, configure persistent module loading using your Linux distribution's supported mechanism.

## Setting Up a Global Encryption Secret

Create a cluster-wide encryption secret that all encrypted volumes will use:

```bash
# Generate a cryptographically strong passphrase
PASSPHRASE=$(openssl rand -base64 32)
echo "Generated passphrase (save this securely): $PASSPHRASE"

# Create the global encryption secret
kubectl create secret generic longhorn-encryption-global \
  -n longhorn-system \
  --from-literal=CRYPTO_KEY_VALUE="$PASSPHRASE" \
  --from-literal=CRYPTO_KEY_PROVIDER="secret" \
  --from-literal=CRYPTO_KEY_CIPHER="aes-xts-plain64" \
  --from-literal=CRYPTO_KEY_HASH="sha256" \
  --from-literal=CRYPTO_KEY_SIZE="256" \
  --from-literal=CRYPTO_PBKDF="argon2i"
```

## Create an Encrypted Default StorageClass

Set up an encrypted storage class and make it the cluster default:

```yaml
# storageclass-encrypted-default.yaml - Default encrypted storage class
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-encrypted
  annotations:
    # Make this the default storage class so all PVCs are encrypted by default
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: driver.longhorn.io
allowVolumeExpansion: true
reclaimPolicy: Delete
volumeBindingMode: Immediate
parameters:
  numberOfReplicas: "3"
  staleReplicaTimeout: "30"
  fsType: "ext4"
  # Enable LUKS encryption
  encrypted: "true"
  # Provisioner secret (used when creating the volume)
  csi.storage.k8s.io/provisioner-secret-name: "longhorn-encryption-global"
  csi.storage.k8s.io/provisioner-secret-namespace: "longhorn-system"
  # Node stage secret (used when mounting)
  csi.storage.k8s.io/node-stage-secret-name: "longhorn-encryption-global"
  csi.storage.k8s.io/node-stage-secret-namespace: "longhorn-system"
  # Node publish secret
  csi.storage.k8s.io/node-publish-secret-name: "longhorn-encryption-global"
  csi.storage.k8s.io/node-publish-secret-namespace: "longhorn-system"
  # Node expand secret (used for online expansion)
  csi.storage.k8s.io/node-expand-secret-name: "longhorn-encryption-global"
  csi.storage.k8s.io/node-expand-secret-namespace: "longhorn-system"
```

```bash
# If you already have a default StorageClass, remove its default annotation
kubectl patch storageclass <current-default-storageclass> \
  -p '{"metadata": {"annotations": {"storageclass.kubernetes.io/is-default-class": "false"}}}'

# Apply the new encrypted default class
kubectl apply -f storageclass-encrypted-default.yaml

# Verify it is now the default
kubectl get storageclass | grep "(default)"
```

## Validating Encryption is Active

### Test with a PVC and Pod

```yaml
# encryption-test.yaml - Test that encryption is working
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: encryption-test-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
  # No storageClassName - will use default (longhorn-encrypted)
---
apiVersion: v1
kind: Pod
metadata:
  name: encryption-test-pod
spec:
  containers:
    - name: test
      image: busybox
      command:
        - sh
        - -c
        - |
          echo "Writing test data..."
          echo "sensitive data here" > /data/test.txt
          echo "Data written to encrypted volume"
          sleep 3600
      volumeMounts:
        - name: data
          mountPath: /data
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: encryption-test-pvc
```

```bash
kubectl apply -f encryption-test.yaml

# Wait for the test pod to become Ready
kubectl wait --for=condition=Ready pod/encryption-test-pod --timeout=120s

# Verify data is accessible through the pod
kubectl exec encryption-test-pod -- cat /data/test.txt

# Verify LUKS encryption is active on the underlying block device
# SSH to the node where the pod is running and check:
kubectl get pod encryption-test-pod -o wide  # Find the node

# On the node:
ls /dev/mapper/
cryptsetup status <volume-name>
```

### Verify Encryption at the Block Level

```bash
# SSH to the node hosting the volume
# Find the block device used by Longhorn
ls /dev/longhorn/

# Try to read raw data from the underlying Longhorn block device (should show garbled data)
dd if=/dev/longhorn/<volume-name> bs=512 count=1024 2>/dev/null | strings | head -20
# You should see no recognizable text data - confirming encryption works
```

## Compliance Scanning

For compliance audits, document your encryption configuration:

```bash
# Get all StorageClasses and their encryption status
kubectl get storageclass -o json | \
  jq -r '.items[] | "\(.metadata.name): encrypted=\(.parameters.encrypted // "false")"'

# Get all PVCs and verify they use encrypted storage classes
kubectl get pvc --all-namespaces \
  -o custom-columns="NAMESPACE:.metadata.namespace,NAME:.metadata.name,CLASS:.spec.storageClassName"
```

## Integrating with External Key Management (HashiCorp Vault)

For enterprise deployments, keep Longhorn pointed at a Kubernetes Secret, and use Vault to populate that Secret:

```yaml
# longhorn-crypto-secret.yaml - Secret format Longhorn reads
apiVersion: v1
kind: Secret
metadata:
  name: longhorn-encryption-global
  namespace: longhorn-system
stringData:
  CRYPTO_KEY_PROVIDER: "secret"
  CRYPTO_KEY_CIPHER: "aes-xts-plain64"
  CRYPTO_KEY_HASH: "sha256"
  CRYPTO_KEY_SIZE: "256"
  CRYPTO_PBKDF: "argon2i"
  CRYPTO_KEY_VALUE: ""  # Populated from Vault via External Secrets Operator
```

Use the External Secrets Operator to sync Vault secrets:

```yaml
# external-secret-crypto.yaml - Sync the encryption key from Vault
apiVersion: external-secrets.io/v1
kind: ExternalSecret
metadata:
  name: longhorn-crypto-from-vault
  namespace: longhorn-system
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: longhorn-encryption-global
    template:
      engineVersion: v2
      data:
        CRYPTO_KEY_PROVIDER: "secret"
        CRYPTO_KEY_CIPHER: "aes-xts-plain64"
        CRYPTO_KEY_HASH: "sha256"
        CRYPTO_KEY_SIZE: "256"
        CRYPTO_PBKDF: "argon2i"
        CRYPTO_KEY_VALUE: "{{ .passphrase }}"
  data:
    - secretKey: passphrase
      remoteRef:
        key: longhorn/encryption
        property: passphrase
```

## Conclusion

Enabling encryption at rest for Longhorn volumes is an essential security measure for regulatory compliance and data protection. By creating an encrypted default StorageClass, all new PVCs automatically get LUKS-encrypted storage without any application changes. For production environments, integrate with an external key management system to ensure key material is stored securely, rotated regularly, and backed up appropriately.
