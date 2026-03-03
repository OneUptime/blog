# How to Use LUKS2 Encryption on Talos Linux Partitions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, LUKS2, Disk Encryption, Security, Linux

Description: A deep dive into LUKS2 encryption on Talos Linux partitions covering configuration, key management, cipher options, and best practices.

---

LUKS2 is the encryption standard that Talos Linux uses to protect data at rest. If you have worked with disk encryption on Linux before, LUKS is probably familiar - it has been the default full-disk encryption solution in the Linux ecosystem for years. Talos takes LUKS2 and integrates it directly into its machine configuration system, making it straightforward to enable encryption without any manual `cryptsetup` commands. This guide gets into the specifics of how LUKS2 works in Talos and how to configure it properly.

## LUKS2 Basics

LUKS stands for Linux Unified Key Setup. Version 2 (LUKS2) is the current standard and brings several improvements over LUKS1:

- **JSON metadata** - LUKS2 stores metadata in JSON format, which is more extensible and easier to work with
- **Better key derivation** - supports Argon2id, a memory-hard key derivation function that resists brute-force attacks
- **Integrity support** - optional authenticated encryption with integrity checking
- **Up to 32 key slots** - more flexibility for key rotation and recovery scenarios
- **Token support** - extensible token mechanism for integration with external systems

Talos leverages these LUKS2 features through its machine configuration, giving you access to enterprise-grade encryption without having to manage the low-level details.

## How LUKS2 Works in Talos

When you enable encryption for a partition in Talos, here is what happens during the boot process:

1. Talos creates the partition on the disk (if it does not exist)
2. The partition is formatted as a LUKS2 container using `cryptsetup`
3. The encryption key is derived or retrieved based on your key configuration
4. The LUKS2 container is opened (decrypted) and mapped as a device-mapper device
5. A filesystem (XFS by default) is created on the decrypted device
6. The filesystem is mounted at the appropriate mount point

All of this happens automatically during boot. You do not interact with `cryptsetup` directly.

## Configuring LUKS2 for the STATE Partition

The STATE partition holds your machine configuration, certificates, and other persistent secrets. Encrypting it protects these critical assets:

```yaml
machine:
  systemDiskEncryption:
    state:
      provider: luks2
      keys:
        - nodeID: {}
          slot: 0
```

This is the simplest configuration. The encryption key is derived from the node's unique identity, which means the disk can only be decrypted on the same node.

## Configuring LUKS2 for the EPHEMERAL Partition

The EPHEMERAL partition contains container images, pod data, and etcd state (on control plane nodes). Encrypting it protects workload data:

```yaml
machine:
  systemDiskEncryption:
    ephemeral:
      provider: luks2
      keys:
        - nodeID: {}
          slot: 0
```

## Encrypting Both Partitions

Most production deployments encrypt both STATE and EPHEMERAL:

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

You can use different keys for each partition if needed:

```yaml
machine:
  systemDiskEncryption:
    state:
      provider: luks2
      keys:
        - static:
            passphrase: "state-partition-passphrase"
          slot: 0
    ephemeral:
      provider: luks2
      keys:
        - nodeID: {}
          slot: 0
```

In this example, STATE uses a static passphrase (for tighter control over secrets) while EPHEMERAL uses node ID-based keys (since the data is more transient).

## Cipher and Key Size Options

LUKS2 in Talos defaults to AES-XTS with 256-bit keys, which is an excellent choice for most scenarios. But you can customize these settings:

```yaml
machine:
  systemDiskEncryption:
    state:
      provider: luks2
      cipher: aes-xts-plain64
      keySize: 512
      blockSize: 4096
      keys:
        - nodeID: {}
          slot: 0
```

Note that for AES-XTS, a `keySize` of 512 means 256 bits for encryption and 256 bits for the tweak key. This is sometimes written as AES-256 in documentation.

Available ciphers typically include:

- `aes-xts-plain64` - the standard choice, hardware-accelerated on modern CPUs
- `aes-cbc-essiv:sha256` - older but still secure
- `serpent-xts-plain64` - alternative to AES, slower but different algorithm
- `twofish-xts-plain64` - another AES alternative

Unless you have specific compliance requirements, stick with `aes-xts-plain64`.

## Key Slots and Multiple Keys

LUKS2 supports up to 32 key slots. Each slot can hold a different key that unlocks the same encrypted volume. This is useful for several scenarios:

**Recovery keys:**

```yaml
machine:
  systemDiskEncryption:
    state:
      provider: luks2
      keys:
        - nodeID: {}
          slot: 0
        - static:
            passphrase: "emergency-recovery-key-store-safely"
          slot: 1
```

**Key rotation preparation:**

```yaml
machine:
  systemDiskEncryption:
    state:
      provider: luks2
      keys:
        - static:
            passphrase: "current-key-2024"
          slot: 0
        - static:
            passphrase: "new-key-2025"
          slot: 1
```

After confirming the new key works, you can remove the old key from slot 0 in a subsequent configuration update.

## Checking LUKS2 Status

After applying encryption configuration, verify it is working:

```bash
# Check volume encryption status
talosctl get volumestatus STATE --nodes 192.168.1.10 -o yaml
talosctl get volumestatus EPHEMERAL --nodes 192.168.1.10 -o yaml
```

The output will include details about the encryption layer, including the LUKS2 header information.

You can also check through the block device resources:

```bash
# View block device details including encryption
talosctl get blockdevices --nodes 192.168.1.10 -o yaml
```

Encrypted devices will show the LUKS2 container information in their resource data.

## Performance Considerations

LUKS2 encryption with AES-XTS on modern hardware is remarkably fast. Benchmarks typically show:

- **Sequential read/write:** less than 5% overhead with AES-NI
- **Random IOPS:** less than 3% overhead for 4K random I/O
- **CPU usage:** minimal, since AES-NI offloads crypto to dedicated CPU instructions

On older hardware without AES-NI, the overhead is much higher (20-40%). Always verify that your nodes support hardware-accelerated AES before enabling encryption in performance-sensitive environments.

```bash
# Check for AES-NI support
talosctl get cpuinfo --nodes 192.168.1.10 -o yaml
# Look for "aes" in the flags list
```

## LUKS2 and Secure Boot

If you are using Secure Boot with Talos, LUKS2 encryption works alongside it. Secure Boot verifies the integrity of the boot chain (firmware to bootloader to kernel), while LUKS2 protects data at rest. Together, they provide a strong security posture:

- Secure Boot prevents unauthorized code from running
- LUKS2 prevents unauthorized data access
- TPM-backed keys can tie both together through measured boot

## Migrating to LUKS2 Encryption

If you have existing Talos nodes without encryption, you cannot simply add encryption to an existing partition. The process requires reprovisioning:

1. Drain the node of Kubernetes workloads
2. Reset the node (wipes STATE and EPHEMERAL)
3. Apply the new machine configuration with encryption enabled
4. The node recreates partitions with LUKS2 encryption
5. Rejoin the node to the cluster

```bash
# Drain the node
kubectl drain node01 --ignore-daemonsets --delete-emptydir-data

# Reset the node
talosctl reset --nodes 192.168.1.10 --graceful

# Apply new config with encryption
talosctl apply-config --nodes 192.168.1.10 --file encrypted-config.yaml --insecure
```

This is a rolling operation - do it one node at a time to maintain cluster availability.

## Troubleshooting LUKS2 Issues

Common issues and their solutions:

**Volume stuck in "Waiting" state:** The encryption key might not be available. Check that the key source (TPM, KMS, etc.) is accessible.

**Boot failure after enabling encryption:** Verify the machine configuration is correct. A typo in the cipher name or invalid key configuration prevents the volume from being opened.

**Performance degradation:** Check for AES-NI support. Without hardware acceleration, encryption overhead is significant.

```bash
# Check for encryption-related errors in logs
talosctl logs machined --nodes 192.168.1.10 | grep -i "encrypt\|luks\|crypt"
```

## Summary

LUKS2 is a battle-tested encryption standard, and Talos Linux makes it easy to use. Configure encryption in your machine config, choose the right key management approach for your environment, and Talos handles the rest. The performance impact is negligible on modern hardware, and the security benefits are substantial. Whether you are encrypting just the STATE partition for secrets protection or both STATE and EPHEMERAL for full data-at-rest coverage, LUKS2 in Talos gives you the tools to meet your compliance and security requirements.
