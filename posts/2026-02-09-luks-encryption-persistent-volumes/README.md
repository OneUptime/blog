# How to Configure LUKS Encryption for Kubernetes Persistent Volumes at Rest

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Storage

Description: Learn how to implement LUKS encryption for Kubernetes persistent volumes to protect sensitive data at rest with strong cryptographic controls.

---

Data at rest encryption protects your persistent volumes from unauthorized access at the storage layer. Linux Unified Key Setup (LUKS) provides robust full-disk encryption that you can integrate with Kubernetes persistent volumes to ensure compliance and security.

## Understanding LUKS Encryption

LUKS creates an encrypted layer between the physical storage device and the filesystem. When you write data to a LUKS-encrypted volume, it automatically encrypts the data before writing to disk. Reading data transparently decrypts it using the configured key.

Unlike application-level encryption, LUKS encryption happens at the block device level. Your applications read and write data normally, unaware of the encryption layer beneath. This makes LUKS ideal for protecting databases, file stores, and other stateful applications without code changes.

## Prerequisites and Requirements

You need several components to implement LUKS encryption for Kubernetes volumes:

A CSI driver that supports LUKS encryption (such as TopoLVM, Longhorn, or custom drivers). The cryptsetup package installed on all Kubernetes nodes where encrypted volumes will mount. A secure key management system for storing and retrieving encryption keys.

First, ensure cryptsetup is available on your nodes:

```bash
# Check if cryptsetup is installed
ssh node01 "which cryptsetup"

# Install on Ubuntu/Debian nodes
ssh node01 "sudo apt-get update && sudo apt-get install -y cryptsetup"

# Install on RHEL/CentOS nodes
ssh node01 "sudo yum install -y cryptsetup"
```

## Setting Up a LUKS-Enabled StorageClass

Create a StorageClass that provisions encrypted volumes:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: encrypted-storage
provisioner: topolvm.io
parameters:
  # Enable LUKS encryption
  csi.storage.k8s.io/fstype: "ext4"
  topolvm.io/device-class: "ssd"
  encryption: "luks"
  # Encryption parameters
  encryptionCipher: "aes-xts-plain64"
  encryptionKeySize: "512"
  encryptionHash: "sha256"
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

The encryption parameters control the cryptographic algorithms. AES-XTS with 512-bit keys provides strong security suitable for most compliance requirements.

## Key Management with Kubernetes Secrets

Store LUKS encryption keys securely using Kubernetes Secrets:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: luks-encryption-key
  namespace: kube-system
type: Opaque
stringData:
  key: "your-base64-encoded-encryption-key"
```

Generate a strong encryption key:

```bash
# Generate a random 512-bit key
dd if=/dev/urandom bs=64 count=1 2>/dev/null | base64 -w 0 > luks-key.txt

# Create the secret
kubectl create secret generic luks-encryption-key \
  --from-file=key=luks-key.txt \
  -n kube-system

# Securely delete the key file
shred -vfz -n 10 luks-key.txt
```

## Creating an Encrypted PVC

Request an encrypted persistent volume by using the encrypted StorageClass:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: encrypted-database-pvc
  namespace: production
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
  storageClassName: encrypted-storage
```

When the CSI driver provisions this volume, it creates a LUKS-encrypted device and formats it with the specified filesystem.

## Deploying an Application with Encrypted Storage

Here's a PostgreSQL database using encrypted persistent storage:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-encrypted
  namespace: production
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:14
        env:
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: encrypted-storage
      resources:
        requests:
          storage: 100Gi
```

The database writes all data to the encrypted volume. At the storage layer, all data persists in encrypted form.

## Manual LUKS Volume Creation

For custom scenarios, you can manually create LUKS-encrypted volumes:

```bash
#!/bin/bash
# Manual LUKS volume creation script

DEVICE="/dev/sdb"
MAPPER_NAME="encrypted-volume"
MOUNT_POINT="/mnt/encrypted"
KEY_FILE="/etc/luks-keys/volume-key"

# Create LUKS container
echo "Creating LUKS container on $DEVICE"
cryptsetup luksFormat $DEVICE $KEY_FILE \
  --cipher aes-xts-plain64 \
  --key-size 512 \
  --hash sha256 \
  --use-random

# Open the LUKS container
echo "Opening LUKS container"
cryptsetup luksOpen $DEVICE $MAPPER_NAME --key-file $KEY_FILE

# Create filesystem
echo "Creating ext4 filesystem"
mkfs.ext4 /dev/mapper/$MAPPER_NAME

# Mount the volume
mkdir -p $MOUNT_POINT
mount /dev/mapper/$MAPPER_NAME $MOUNT_POINT

echo "Encrypted volume ready at $MOUNT_POINT"
```

## Implementing a Custom CSI Driver with LUKS

For advanced use cases, implement LUKS encryption in a custom CSI driver:

```go
package main

import (
    "context"
    "fmt"
    "os/exec"
)

// CreateVolume handles volume provisioning with LUKS encryption
func (d *Driver) CreateVolume(ctx context.Context, req *csi.CreateVolumeRequest) (*csi.CreateVolumeResponse, error) {
    // Provision underlying block device
    devicePath, err := d.provisionBlockDevice(req.GetCapacityRange().GetRequiredBytes())
    if err != nil {
        return nil, fmt.Errorf("failed to provision device: %v", err)
    }

    // Get encryption key from Kubernetes secret
    key, err := d.getEncryptionKey(ctx)
    if err != nil {
        return nil, fmt.Errorf("failed to get encryption key: %v", err)
    }

    // Create LUKS container
    if err := d.luksFormat(devicePath, key); err != nil {
        return nil, fmt.Errorf("failed to format LUKS: %v", err)
    }

    // Open LUKS device
    mapperName := fmt.Sprintf("luks-%s", req.GetName())
    if err := d.luksOpen(devicePath, mapperName, key); err != nil {
        return nil, fmt.Errorf("failed to open LUKS: %v", err)
    }

    // Create filesystem on encrypted device
    mapperPath := fmt.Sprintf("/dev/mapper/%s", mapperName)
    if err := d.makeFilesystem(mapperPath, "ext4"); err != nil {
        return nil, fmt.Errorf("failed to create filesystem: %v", err)
    }

    return &csi.CreateVolumeResponse{
        Volume: &csi.Volume{
            VolumeId:      req.GetName(),
            CapacityBytes: req.GetCapacityRange().GetRequiredBytes(),
        },
    }, nil
}

// luksFormat creates a LUKS encrypted container
func (d *Driver) luksFormat(device string, key []byte) error {
    cmd := exec.Command("cryptsetup", "luksFormat",
        "--cipher", "aes-xts-plain64",
        "--key-size", "512",
        "--hash", "sha256",
        "--key-file", "-",
        device,
    )
    cmd.Stdin = bytes.NewReader(key)

    if output, err := cmd.CombinedOutput(); err != nil {
        return fmt.Errorf("luksFormat failed: %v, output: %s", err, output)
    }
    return nil
}

// luksOpen opens an encrypted LUKS device
func (d *Driver) luksOpen(device, name string, key []byte) error {
    cmd := exec.Command("cryptsetup", "luksOpen",
        "--key-file", "-",
        device,
        name,
    )
    cmd.Stdin = bytes.NewReader(key)

    if output, err := cmd.CombinedOutput(); err != nil {
        return fmt.Errorf("luksOpen failed: %v, output: %s", err, output)
    }
    return nil
}
```

## Integrating with HashiCorp Vault

Use Vault for secure key management instead of Kubernetes Secrets:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: csi-driver
  namespace: kube-system
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: csi-vault-config
  namespace: kube-system
data:
  vault-addr: "https://vault.example.com:8200"
  vault-role: "csi-encryption"
  vault-path: "secret/data/encryption-keys"
```

Configure the CSI driver to retrieve keys from Vault:

```go
import (
    vault "github.com/hashicorp/vault/api"
)

func (d *Driver) getEncryptionKeyFromVault(volumeID string) ([]byte, error) {
    config := vault.DefaultConfig()
    config.Address = d.vaultAddr

    client, err := vault.NewClient(config)
    if err != nil {
        return nil, err
    }

    // Authenticate using Kubernetes service account
    client.SetToken(d.getVaultToken())

    // Read encryption key
    secret, err := client.Logical().Read(
        fmt.Sprintf("%s/%s", d.vaultPath, volumeID),
    )
    if err != nil {
        return nil, err
    }

    keyData, ok := secret.Data["key"].(string)
    if !ok {
        return nil, fmt.Errorf("key not found in vault")
    }

    return []byte(keyData), nil
}
```

## Key Rotation Strategy

Implement periodic key rotation for compliance:

```bash
#!/bin/bash
# LUKS key rotation script

DEVICE="/dev/mapper/encrypted-volume"
OLD_KEY_FILE="/etc/luks-keys/old-key"
NEW_KEY_FILE="/etc/luks-keys/new-key"

# Generate new key
dd if=/dev/urandom bs=64 count=1 2>/dev/null > $NEW_KEY_FILE

# Add new key to LUKS header (key slot 1)
cryptsetup luksAddKey $DEVICE $NEW_KEY_FILE --key-file $OLD_KEY_FILE

# Remove old key (key slot 0)
cryptsetup luksRemoveKey $DEVICE --key-file $OLD_KEY_FILE

# Update key in Kubernetes secret or Vault
kubectl create secret generic luks-encryption-key \
  --from-file=key=$NEW_KEY_FILE \
  --dry-run=client -o yaml | kubectl apply -f -

# Securely delete key files
shred -vfz -n 10 $OLD_KEY_FILE $NEW_KEY_FILE
```

## Monitoring Encrypted Volumes

Check LUKS encryption status:

```bash
# Check if device is LUKS encrypted
cryptsetup isLuks /dev/sdb && echo "Encrypted" || echo "Not encrypted"

# Get LUKS header information
cryptsetup luksDump /dev/sdb

# List active encrypted devices
dmsetup ls --target crypt

# Check encryption status of mounted volumes
lsblk -o NAME,TYPE,FSTYPE,SIZE,MOUNTPOINT,UUID
```

Create a monitoring script:

```bash
#!/bin/bash
# Monitor LUKS volume health

for device in $(dmsetup ls --target crypt | awk '{print $1}'); do
    status=$(cryptsetup status $device)

    if ! echo "$status" | grep -q "is active"; then
        echo "WARNING: Device $device is not active"
    fi

    # Check for any errors in device mapper
    if dmsetup status $device | grep -q "error"; then
        echo "ERROR: Device $device has errors"
    fi
done
```

## Performance Considerations

LUKS encryption adds computational overhead. Modern CPUs with AES-NI instructions minimize this impact:

```bash
# Check for AES-NI support
grep -m 1 aes /proc/cpuinfo

# Benchmark encrypted vs unencrypted performance
# Unencrypted
fio --name=test --ioengine=libaio --direct=1 --bs=4k --rw=randwrite \
    --size=1G --numjobs=4 --runtime=60 --time_based --group_reporting \
    --filename=/mnt/unencrypted/testfile

# Encrypted
fio --name=test --ioengine=libaio --direct=1 --bs=4k --rw=randwrite \
    --size=1G --numjobs=4 --runtime=60 --time_based --group_reporting \
    --filename=/mnt/encrypted/testfile
```

With AES-NI, expect 5-10% performance overhead for most workloads.

## Disaster Recovery

Back up LUKS headers to recover encrypted volumes:

```bash
# Backup LUKS header
cryptsetup luksHeaderBackup /dev/sdb --header-backup-file /backup/sdb-luks-header.img

# Restore LUKS header
cryptsetup luksHeaderRestore /dev/sdb --header-backup-file /backup/sdb-luks-header.img
```

Store header backups securely separate from encryption keys.

## Best Practices

Use hardware security modules (HSMs) or trusted platform modules (TPMs) for key storage in high-security environments. These devices provide tamper-resistant key storage.

Implement proper key lifecycle management including generation, rotation, and destruction. Document key management procedures in your security runbooks.

Test disaster recovery procedures regularly. Verify you can recover encrypted volumes using your backup keys and headers.

Monitor encryption overhead and adjust resources accordingly. Encrypted volumes may require additional CPU allocation.

## Conclusion

LUKS encryption provides strong data-at-rest protection for Kubernetes persistent volumes. By integrating LUKS with CSI drivers and proper key management, you protect sensitive data from unauthorized access while maintaining transparent operation for applications. Implement encryption as part of a defense-in-depth security strategy for production Kubernetes clusters.
