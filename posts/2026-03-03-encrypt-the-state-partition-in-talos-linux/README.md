# How to Encrypt the STATE Partition in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, STATE Partition, Disk Encryption, Security, Kubernetes

Description: Protect your Talos Linux machine configuration and secrets by encrypting the STATE partition with LUKS2 encryption.

---

The STATE partition in Talos Linux holds some of the most sensitive data on any node in your cluster. It stores the machine configuration, Kubernetes PKI material (certificates and private keys), and other persistent state that must survive reboots. If an attacker gets physical access to a disk and the STATE partition is unencrypted, they can extract cluster certificates, API server keys, and potentially gain full control over your Kubernetes cluster. Encrypting the STATE partition is one of the most impactful security measures you can take. This guide focuses specifically on STATE partition encryption.

## What the STATE Partition Contains

Before diving into the how, let us understand what we are protecting:

- **Machine configuration** - the full Talos machine config including secrets
- **Kubernetes CA certificates and keys** - used to sign all cluster certificates
- **etcd CA certificates and keys** - used for etcd member authentication
- **Service account signing keys** - used to sign Kubernetes service account tokens
- **Bootstrap data** - initial cluster formation data
- **Talos API certificates** - used for node-to-node and client-to-node communication

Every single one of these items is a high-value target. The Kubernetes CA key alone would let an attacker issue valid certificates for any identity in the cluster.

## Basic STATE Encryption Configuration

The simplest way to encrypt the STATE partition:

```yaml
machine:
  systemDiskEncryption:
    state:
      provider: luks2
      keys:
        - nodeID: {}
          slot: 0
```

This encrypts STATE using a key derived from the node's identity. Apply it during initial node setup:

```bash
talosctl apply-config --nodes 192.168.1.10 --file machine-config.yaml --insecure
```

## STATE Encryption with Multiple Key Types

For production, use multiple key slots for resilience:

```yaml
machine:
  systemDiskEncryption:
    state:
      provider: luks2
      keys:
        # Primary key - TPM for hardware-bound security
        - tpm: {}
          slot: 0
        # Recovery key - static passphrase stored in vault
        - static:
            passphrase: "state-recovery-key-2025"
          slot: 1
```

The TPM key provides the strongest protection during normal operation, while the static recovery key ensures you can still access the STATE partition if the TPM fails.

## STATE-Only Encryption

You might want to encrypt only the STATE partition and leave EPHEMERAL unencrypted. This makes sense when:

- Performance is critical and you want to minimize encryption overhead
- The EPHEMERAL data is not sensitive (no secrets stored in pods)
- You are primarily concerned about protecting cluster PKI material

```yaml
machine:
  systemDiskEncryption:
    state:
      provider: luks2
      keys:
        - nodeID: {}
          slot: 0
    # Note: no 'ephemeral' section means EPHEMERAL stays unencrypted
```

This is a valid approach, but consider that container images on EPHEMERAL might contain proprietary code, and pod logs might contain sensitive data. Full encryption of both partitions is generally recommended.

## Encryption During Cluster Bootstrap

When creating a new cluster, include STATE encryption from the start:

```bash
# Generate cluster configuration
talosctl gen config my-cluster https://192.168.1.100:6443

# Edit the generated configs to add encryption
# Then bootstrap the first control plane node
talosctl apply-config --nodes 192.168.1.10 --file controlplane.yaml --insecure

# Bootstrap the cluster
talosctl bootstrap --nodes 192.168.1.10
```

The encryption is configured before any sensitive data is written to the STATE partition, so nothing is ever stored unencrypted.

## Verifying STATE Encryption

After the node boots with encryption enabled, verify it:

```bash
# Check STATE volume status
talosctl get volumestatus STATE --nodes 192.168.1.10 -o yaml
```

The output should show encryption-related information:

```yaml
spec:
  phase: Ready
  location: /dev/sda5
  encryption:
    provider: luks2
  filesystem: xfs
  mountpoint: /system/state
```

You can also check the overall volume list:

```bash
talosctl get volumes --nodes 192.168.1.10
```

The STATE volume should appear as Ready with its encrypted backing device.

## STATE Encryption on Control Plane vs Worker Nodes

Both control plane and worker nodes have STATE partitions, but the content differs:

**Control plane STATE contains:**
- Full cluster PKI (CA keys, API server keys, etcd keys)
- Machine configuration with control plane configuration
- Bootstrap manifests

**Worker STATE contains:**
- Machine configuration with worker configuration
- Node-specific certificates (kubelet client cert, etc.)
- Bootstrap token

Control plane STATE is more sensitive because it contains the root CA keys. Compromising a control plane STATE partition is more damaging than compromising a worker STATE partition.

For this reason, consider using stronger encryption for control plane nodes:

```yaml
# Control plane - TPM + KMS + recovery
machine:
  type: controlplane
  systemDiskEncryption:
    state:
      provider: luks2
      keys:
        - tpm: {}
          slot: 0
        - kms:
            endpoint: "https://kms.example.com/v1/keys/cp-state"
          slot: 1
        - static:
            passphrase: "cp-state-recovery-passphrase"
          slot: 2
```

```yaml
# Worker - node ID + recovery
machine:
  type: worker
  systemDiskEncryption:
    state:
      provider: luks2
      keys:
        - nodeID: {}
          slot: 0
        - static:
            passphrase: "worker-state-recovery-passphrase"
          slot: 1
```

## Cipher Options for STATE

The default cipher (AES-XTS-plain64 with 256-bit key) works well for the STATE partition. Since STATE is small (typically around 100MB), even without hardware acceleration the performance impact is negligible:

```yaml
machine:
  systemDiskEncryption:
    state:
      provider: luks2
      cipher: aes-xts-plain64
      keySize: 512  # 256-bit AES with 256-bit tweak
      keys:
        - nodeID: {}
          slot: 0
```

For the STATE partition specifically, performance is rarely a concern. The data is read once at boot and written infrequently (only when the machine config changes). Feel free to use the strongest cipher settings available.

## Backup Considerations

Encrypting STATE has implications for backup and recovery:

- **Machine config backup:** Always maintain an external backup of your machine configurations. If the STATE partition is corrupted and encrypted, you cannot recover the config from the disk without the encryption key.
- **PKI backup:** Keep cluster PKI material backed up in a secure external location (vault, encrypted storage).
- **Recovery keys:** Store recovery passphrases in a separate system from the nodes themselves.

```bash
# Export and backup the machine config
talosctl get machineconfig --nodes 192.168.1.10 -o yaml > backup-config.yaml

# Encrypt the backup
gpg --encrypt --recipient admin@example.com backup-config.yaml
```

## Disaster Recovery with Encrypted STATE

If a node's STATE partition becomes corrupted or the disk fails:

1. **If you have a backup config:** Apply it to the replacement node
2. **If you have a recovery key:** Boot the node, provide the recovery key
3. **If neither is available:** The node must be reprovisioned from scratch, which means new certificates and re-joining the cluster

For control plane nodes, losing the STATE partition without a backup is serious because it contains the cluster CA. This is why external backups of PKI material are critical.

## Monitoring STATE Health

Monitor the STATE partition to catch issues early:

```bash
# Regular health check
talosctl get volumestatus STATE --nodes 192.168.1.10

# Check for errors in logs
talosctl logs machined --nodes 192.168.1.10 | grep -i "state\|encrypt"
```

Set up automated monitoring:

```yaml
# Prometheus alert for STATE partition issues
- alert: TalosStatePartitionUnhealthy
  expr: talos_volume_status{volume="STATE", phase!="Ready"} == 1
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "STATE partition is not in Ready phase on {{ $labels.node }}"
```

## Summary

The STATE partition is the crown jewel of security on a Talos Linux node. It holds the keys to your Kubernetes cluster - literally, in the form of CA certificates and private keys. Encrypting it protects against physical disk theft, improper media disposal, and unauthorized access to decommissioned hardware. Use the strongest key management approach your environment supports, always configure recovery keys, and maintain external backups of your machine configurations and PKI material. STATE encryption should be considered mandatory for any production Talos Linux deployment.
