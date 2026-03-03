# How to Configure Disk Encryption in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Disk Encryption, Security, LUKS, Kubernetes

Description: A comprehensive guide to configuring disk encryption in Talos Linux to protect sensitive data at rest on your Kubernetes nodes.

---

Data at rest encryption is a fundamental security requirement for many organizations. Whether you are running in a regulated industry, handling sensitive customer data, or simply following security best practices, encrypting the disks on your Kubernetes nodes prevents unauthorized access to data if physical media is compromised. Talos Linux provides built-in support for disk encryption using LUKS2, with multiple key management options. This guide covers the core concepts and walks you through configuring encryption for your Talos cluster.

## Why Encrypt Disks in Talos Linux?

Even though Talos Linux is already more secure than traditional Linux distributions (no SSH, no shell, immutable filesystem), disk encryption adds another layer of protection. Without encryption, anyone who gains physical access to a node's disk can read all stored data, including:

- Kubernetes secrets and configmaps stored in etcd
- Machine configuration including cluster certificates
- Container images that might contain proprietary code
- Application data stored in persistent volumes
- Pod logs that might contain sensitive information

Encryption ensures that this data is unreadable without the proper keys, even if the physical disk is removed from the server.

## Encryption Architecture in Talos

Talos uses LUKS2 (Linux Unified Key Setup version 2) for disk encryption. LUKS2 is the standard disk encryption format on Linux, providing strong cryptographic guarantees and good tooling support.

The encryption works at the partition level. You can choose which partitions to encrypt:

- **STATE** - contains machine configuration and secrets
- **EPHEMERAL** - contains runtime data including container images and pod data

You can encrypt one or both, depending on your security requirements.

## Key Management Options

Talos supports several key sources for disk encryption:

1. **Node ID** - derives keys from the node's unique identity (default for unattended operation)
2. **Static passphrase** - a user-provided passphrase stored in the machine config
3. **TPM (Trusted Platform Module)** - uses hardware-bound keys
4. **KMS (Key Management Service)** - retrieves keys from an external key management system

Each option has different security properties and operational characteristics. We will look at each one.

## Basic Encryption Configuration

Here is a minimal configuration that encrypts both STATE and EPHEMERAL using node ID-based keys:

```yaml
machine:
  systemDiskEncryption:
    state:
      provider: luks2
      keys:
        - nodeID: {}
          slot: 0
    ephemeral:
      provider: luks2
      keys:
        - nodeID: {}
          slot: 0
```

Apply this configuration when you first set up the node:

```bash
# Apply machine config with encryption enabled
talosctl apply-config --nodes 192.168.1.10 --file machine-config.yaml --insecure
```

The `--insecure` flag is needed during initial setup when the node does not yet have a trusted configuration.

## Using Static Passphrases

For environments where you want explicit control over the encryption passphrase:

```yaml
machine:
  systemDiskEncryption:
    state:
      provider: luks2
      keys:
        - static:
            passphrase: "your-strong-passphrase-here"
          slot: 0
    ephemeral:
      provider: luks2
      keys:
        - static:
            passphrase: "your-strong-passphrase-here"
          slot: 0
```

Important security note: the passphrase is stored in the machine configuration in plain text. Make sure your machine configs are stored securely and transmitted over encrypted channels. Consider using a secrets management tool to inject passphrases during deployment.

## TPM-Based Encryption

If your hardware has a TPM 2.0 chip, you can bind encryption keys to the hardware:

```yaml
machine:
  systemDiskEncryption:
    state:
      provider: luks2
      keys:
        - tpm: {}
          slot: 0
    ephemeral:
      provider: luks2
      keys:
        - tpm: {}
          slot: 0
```

TPM-based encryption ties the disk to the physical machine. The disk cannot be decrypted if moved to different hardware. This is ideal for bare-metal deployments where physical security is a concern.

## KMS-Based Encryption

For the most robust key management, integrate with an external KMS:

```yaml
machine:
  systemDiskEncryption:
    state:
      provider: luks2
      keys:
        - kms:
            endpoint: "https://kms.example.com/v1/keys/talos-state"
          slot: 0
    ephemeral:
      provider: luks2
      keys:
        - kms:
            endpoint: "https://kms.example.com/v1/keys/talos-ephemeral"
          slot: 0
```

KMS integration lets you manage keys centrally, rotate them through the KMS, and revoke access if needed. This is the recommended approach for production environments with strict compliance requirements.

## Multiple Key Slots

LUKS2 supports multiple key slots, meaning you can have multiple ways to unlock a partition. This is useful for key rotation and recovery:

```yaml
machine:
  systemDiskEncryption:
    state:
      provider: luks2
      keys:
        - nodeID: {}
          slot: 0
        - static:
            passphrase: "recovery-passphrase"
          slot: 1
```

Slot 0 holds the primary key (node ID in this case), and slot 1 holds a recovery passphrase. If the primary key becomes unavailable, the recovery passphrase can still unlock the partition.

## Cipher Configuration

By default, Talos uses AES-XTS with 256-bit keys. You can customize the cipher settings if needed:

```yaml
machine:
  systemDiskEncryption:
    state:
      provider: luks2
      cipher: aes-xts-plain64
      keySize: 256
      blockSize: 4096
      keys:
        - nodeID: {}
          slot: 0
```

Unless you have specific compliance requirements that mandate a particular cipher, the defaults are a good choice for both security and performance.

## Verifying Encryption Status

After applying the configuration, verify that encryption is active:

```bash
# Check volume status for encryption info
talosctl get volumes --nodes 192.168.1.10 -o yaml

# Look for encryption indicators in volume details
talosctl get volumestatus STATE --nodes 192.168.1.10 -o yaml
talosctl get volumestatus EPHEMERAL --nodes 192.168.1.10 -o yaml
```

Encrypted volumes will show LUKS2 as part of their configuration in the output.

## Performance Impact

Disk encryption does add some CPU overhead. On modern hardware with AES-NI instruction support (which is virtually all x86_64 processors from the last decade), the impact is minimal - typically less than 5% for most workloads.

To check if your nodes support hardware-accelerated AES:

```bash
# Check CPU features (through Talos resource API)
talosctl get cpuinfo --nodes 192.168.1.10 -o yaml
```

Look for `aes` in the CPU flags. If present, AES-NI is available and encryption performance will be excellent.

## Encryption and Upgrades

Talos upgrades work transparently with encrypted partitions. The upgrade process:

1. Decrypts partitions using the configured keys
2. Writes the upgrade to the BOOT partition
3. Reboots
4. The new system decrypts partitions again during boot

No special steps are needed for upgrading encrypted nodes.

## Encryption and Reset

When resetting an encrypted node, the behavior depends on which partitions you reset. Wiping an encrypted partition destroys the data irreversibly because the encryption makes recovery without the key impossible.

```bash
# Reset will destroy encrypted data permanently
talosctl reset --nodes 192.168.1.10 --system-labels-to-wipe STATE --system-labels-to-wipe EPHEMERAL
```

## Summary

Disk encryption in Talos Linux is straightforward to configure and provides strong protection for data at rest. Choose the key management approach that fits your security requirements, from simple node ID keys for development to KMS integration for production compliance. Apply encryption during initial node setup, verify it through the volume status API, and rest easy knowing that your Kubernetes cluster data is protected even against physical disk theft.
