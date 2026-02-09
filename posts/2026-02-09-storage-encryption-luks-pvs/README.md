# How to Configure Storage Encryption at Rest with LUKS for Kubernetes PVs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, Security

Description: Implement LUKS-based encryption at rest for Kubernetes persistent volumes, securing sensitive data on disk with transparent encryption and key management integration.

---

LUKS provides Linux-native encryption at rest by encrypting block devices before filesystem creation. When integrated with Kubernetes persistent volumes, LUKS ensures data remains encrypted on physical storage media while appearing transparent to applications. This protects against data theft from stolen disks, unauthorized physical access, or improper disk disposal.

This guide demonstrates implementing LUKS encryption for Kubernetes volumes using manual setup, CSI driver integration, and automated key management with solutions like HashiCorp Vault.

## Understanding LUKS Architecture

LUKS operates at the block device layer, sitting between raw storage and the filesystem. When you write data, LUKS encrypts it using strong cryptographic algorithms before writing to the underlying device. On reads, it decrypts data transparently using the encryption key.

The LUKS header stores cryptographic metadata including the encryption algorithm, key derivation function, and encrypted master key. You unlock a LUKS volume by providing a passphrase or key file that decrypts the master key stored in the header.

For Kubernetes integration, the challenge involves automating key management while maintaining security. Keys must be available when volumes mount but protected from unauthorized access.

## Installing LUKS Tools

Install cryptsetup on all worker nodes.

```bash
# On Ubuntu 22.04 or 24.04
sudo apt-get update
sudo apt-get install -y cryptsetup cryptsetup-bin

# Verify installation
cryptsetup --version

# Load kernel module
sudo modprobe dm-crypt
sudo modprobe dm-mod

# Ensure modules load on boot
echo "dm-crypt" | sudo tee -a /etc/modules
echo "dm-mod" | sudo tee -a /etc/modules
```

## Creating Manually Encrypted Volumes

For testing, manually create a LUKS-encrypted volume.

```bash
# Create a test file to act as a block device
sudo dd if=/dev/zero of=/var/lib/test-disk.img bs=1M count=1024

# Set up loop device
sudo losetup /dev/loop0 /var/lib/test-disk.img

# Format with LUKS
echo "changeme" | sudo cryptsetup luksFormat /dev/loop0 -

# Open LUKS device
echo "changeme" | sudo cryptsetup luksOpen /dev/loop0 encrypted-test -

# Create filesystem
sudo mkfs.ext4 /dev/mapper/encrypted-test

# Mount
sudo mkdir -p /mnt/encrypted-test
sudo mount /dev/mapper/encrypted-test /mnt/encrypted-test

# Test write
echo "Encrypted data" | sudo tee /mnt/encrypted-test/test.txt

# Verify
sudo cat /mnt/encrypted-test/test.txt
```

## Implementing LUKS CSI Driver

Deploy a CSI driver that supports LUKS encryption. This example uses a custom wrapper around the local-path provisioner.

```yaml
# luks-csi-driver.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: luks-keys
  namespace: kube-system
data:
  master.key: |
    # Base64 encoded master key
    <base64-key-here>
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: luks-csi-node
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: luks-csi-node
  template:
    metadata:
      labels:
        app: luks-csi-node
    spec:
      hostNetwork: true
      hostPID: true
      containers:
      - name: node-driver
        image: k8s.gcr.io/sig-storage/local-volume-provisioner:v2.5.0
        securityContext:
          privileged: true
        volumeMounts:
        - name: keys
          mountPath: /etc/luks-keys
          readOnly: true
        - name: pods-mount-dir
          mountPath: /var/lib/kubelet/pods
          mountPropagation: Bidirectional
        - name: csi-socket
          mountPath: /csi
        env:
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
      volumes:
      - name: keys
        secret:
          secretName: luks-keys
      - name: pods-mount-dir
        hostPath:
          path: /var/lib/kubelet/pods
          type: Directory
      - name: csi-socket
        hostPath:
          path: /var/lib/kubelet/plugins/luks.csi.k8s.io
          type: DirectoryOrCreate
```

This is a simplified example. Production deployments should use dedicated LUKS CSI drivers like the dm-crypt CSI driver or storage solutions with native encryption support.

## Using Storage Solutions with Native Encryption

Many CSI drivers support native encryption that uses LUKS internally.

Example with Longhorn:

```yaml
# longhorn-encrypted-storageclass.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-encrypted
provisioner: driver.longhorn.io
allowVolumeExpansion: true
reclaimPolicy: Delete
volumeBindingMode: Immediate
parameters:
  numberOfReplicas: "3"
  staleReplicaTimeout: "2880"
  encrypted: "true"
  # Reference to secret containing encryption key
  csi.storage.k8s.io/node-publish-secret-name: longhorn-encryption-key
  csi.storage.k8s.io/node-publish-secret-namespace: longhorn-system
```

Create the encryption key secret:

```bash
# Generate random encryption key
openssl rand -base64 32 > encryption.key

# Create secret
kubectl create secret generic longhorn-encryption-key \
  --from-file=CRYPTO_KEY_VALUE=encryption.key \
  -n longhorn-system

# Apply storage class
kubectl apply -f longhorn-encrypted-storageclass.yaml
```

Create encrypted PVC:

```yaml
# encrypted-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: encrypted-volume
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn-encrypted
  resources:
    requests:
      storage: 10Gi
```

## Integrating with HashiCorp Vault

Use Vault for centralized key management.

```bash
# Enable Vault KV secrets engine
vault secrets enable -path=luks-keys kv-v2

# Store encryption key
vault kv put luks-keys/default key=$(openssl rand -base64 32)

# Create policy
vault policy write luks-reader - <<EOF
path "luks-keys/data/*" {
  capabilities = ["read"]
}
EOF

# Enable Kubernetes auth
vault auth enable kubernetes

vault write auth/kubernetes/config \
  kubernetes_host="https://kubernetes.default.svc:443" \
  kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt
```

Configure CSI driver to fetch keys from Vault:

```yaml
# vault-csi-provider.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: csi-driver-luks
  namespace: kube-system
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: vault-csi-provider-config
  namespace: kube-system
data:
  config.yaml: |
    vault:
      address: "http://vault.vault-system.svc:8200"
      authMethod: "kubernetes"
      role: "csi-driver"
      secretPath: "luks-keys/data/default"
```

## Monitoring Encrypted Volumes

Track LUKS device status and encryption overhead.

```bash
# Check LUKS status on nodes
sudo cryptsetup status /dev/mapper/luks-*

# Monitor encryption performance impact
sudo iostat -x 1 10

# Check for encryption-related errors
sudo journalctl -u kubelet | grep -i luks
sudo dmesg | grep -i dm-crypt
```

Create alerts for encryption failures:

```yaml
# prometheus-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: luks-encryption-alerts
spec:
  groups:
  - name: encryption
    rules:
    - alert: LUKSDeviceFailure
      expr: |
        node_disk_info{device=~"dm-.*"} == 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "LUKS device failed on {{ $labels.instance }}"
```

## Rotating Encryption Keys

Implement key rotation for LUKS volumes.

```bash
# Add new key to LUKS header
echo "new_passphrase" | sudo cryptsetup luksAddKey /dev/sdb -

# Verify multiple keys exist
sudo cryptsetup luksDump /dev/sdb | grep "Key Slot"

# Remove old key
echo "old_passphrase" | sudo cryptsetup luksRemoveKey /dev/sdb -

# For automated rotation with CSI
kubectl patch storageclass longhorn-encrypted \
  -p '{"parameters":{"csi.storage.k8s.io/node-publish-secret-name":"longhorn-encryption-key-v2"}}'
```

## Performance Considerations

LUKS encryption adds CPU overhead. Benchmark encrypted vs. unencrypted volumes:

```bash
# Install fio
kubectl run fio --image=ljishen/fio --rm -it -- bash

# Test unencrypted volume
fio --name=baseline --ioengine=libaio --iodepth=32 --rw=randwrite --bs=4k --direct=1 --size=1G --directory=/unencrypted

# Test encrypted volume
fio --name=encrypted --ioengine=libaio --iodepth=32 --rw=randwrite --bs=4k --direct=1 --size=1G --directory=/encrypted
```

Modern CPUs with AES-NI instructions experience minimal overhead (typically under 5%).

LUKS encryption provides robust data-at-rest protection for Kubernetes persistent volumes with minimal performance impact on modern hardware. By integrating LUKS with CSI drivers and centralized key management through solutions like Vault, you implement enterprise-grade encryption that protects sensitive data while maintaining operational simplicity. The combination of transparent encryption and automated key lifecycle management ensures compliance with data protection regulations.
