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

1. Talos locates or provisions the volume based on its volume configuration
2. The volume is formatted as a LUKS2 container using `cryptsetup` if it is empty and has no filesystem
3. The encryption key is derived or retrieved based on your key configuration
4. The LUKS2 container is opened (decrypted) and mapped as a device-mapper device
5. A filesystem (XFS by default) is created on the decrypted device
6. The filesystem is mounted at the appropriate mount point

All of this happens automatically during boot. You do not interact with `cryptsetup` directly.

## Configuring LUKS2 for the STATE Partition

The STATE partition holds your machine configuration, certificates, and other persistent secrets. Encrypting it protects these critical assets:

```yaml
apiVersion: v1alpha1
kind: VolumeConfig
name: STATE
encryption:
  provider: luks2
  keys:
    - nodeID: {}
      slot: 0
```

This is the simplest configuration. The encryption key is derived from the node UUID and partition label. This protects against data being recovered from a drive removed from the node, but it is not designed to protect against attacks where an attacker has physical access to the whole machine.

## Configuring LUKS2 for the EPHEMERAL Partition

The EPHEMERAL partition contains container images, pod data, and etcd state (on control plane nodes). Encrypting it protects workload data:

```yaml
apiVersion: v1alpha1
kind: VolumeConfig
name: EPHEMERAL
encryption:
  provider: luks2
  keys:
    - nodeID: {}
      slot: 0
```

## Encrypting Both Partitions

Most production deployments encrypt both STATE and EPHEMERAL:

```yaml
apiVersion: v1alpha1
kind: VolumeConfig
name: STATE
encryption:
  provider: luks2
  keys:
    - nodeID: {}
      slot: 0
---
apiVersion: v1alpha1
kind: VolumeConfig
name: EPHEMERAL
encryption:
  provider: luks2
  keys:
    - nodeID: {}
      slot: 0
```

You can use different keys for each partition if needed:

```yaml
apiVersion: v1alpha1
kind: VolumeConfig
name: STATE
encryption:
  provider: luks2
  keys:
    - tpm: {}
      slot: 0
---
apiVersion: v1alpha1
kind: VolumeConfig
name: EPHEMERAL
encryption:
  provider: luks2
  keys:
    - nodeID: {}
      slot: 0
```

In this example, STATE uses a TPM-backed key while EPHEMERAL uses node ID-based keys (since the data is more transient). Avoid static passphrases for STATE: Talos stores the STATE encryption configuration in the META partition in cleartext.

## Cipher and Key Size Options

LUKS2 in Talos defaults to AES-XTS with 256-bit keys, which is an excellent choice for most scenarios. But you can customize these settings:

```yaml
apiVersion: v1alpha1
kind: VolumeConfig
name: STATE
encryption:
  provider: luks2
  cipher: aes-xts-plain64
  keySize: 512
  blockSize: 4096
  keys:
    - nodeID: {}
      slot: 0
```

Note that for AES-XTS, a `keySize` of 512 means 256 bits for encryption and 256 bits for the tweak key. This is sometimes written as AES-256 in documentation.

Talos documents these cipher values for LUKS2 encryption:

- `aes-xts-plain64` - the standard choice, hardware-accelerated on modern CPUs
- `xchacha12,aes-adiantum-plain64` - Adiantum mode for hardware without fast AES
- `xchacha20,aes-adiantum-plain64` - Adiantum mode for hardware without fast AES

Unless you have specific compliance requirements, stick with `aes-xts-plain64`.

## Key Slots and Multiple Keys

LUKS2 supports up to 32 key slots. Each slot can hold a different key that unlocks the same encrypted volume. This is useful for several scenarios:

**Recovery keys:**

```yaml
apiVersion: v1alpha1
kind: VolumeConfig
name: EPHEMERAL
encryption:
  provider: luks2
  keys:
    - nodeID: {}
      slot: 0
    - static:
        passphrase: "emergency-recovery-key-store-safely"
      slot: 1
      lockToState: true
```

**Key rotation preparation:**

```yaml
apiVersion: v1alpha1
kind: VolumeConfig
name: EPHEMERAL
encryption:
  provider: luks2
  keys:
    - static:
        passphrase: "current-key-2026"
      slot: 0
      lockToState: true
    - static:
        passphrase: "new-key-2026"
      slot: 1
      lockToState: true
```

Apply the configuration with `talosctl apply-config --mode=reboot`, then remove the old key from slot 0 in a subsequent configuration update. Always keep at least one unchanged working key while rotating keys so Talos can manage the LUKS2 slots.

## Checking LUKS2 Status

After applying encryption configuration, verify it is working:

```bash
# Check volume encryption status

talosctl get volumestatus STATE --nodes 192.168.1.10 -o yaml
talosctl get volumestatus EPHEMERAL --nodes 192.168.1.10 -o yaml
```

The output will include the volume phase, location, size, and related status information. Encrypted volumes move through the `prepared` phase when the encrypted volume is opened before becoming `ready`.

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
talosctl read /proc/cpuinfo --nodes 192.168.1.10 | grep -m1 flags
# Look for "aes" in the flags list
```

## LUKS2 and Secure Boot

If you are using Secure Boot with Talos, LUKS2 encryption works alongside it. Secure Boot verifies the integrity of the boot chain (firmware to bootloader to kernel), while LUKS2 protects data at rest. Together, they provide a strong security posture:

- Secure Boot prevents unauthorized code from running
- LUKS2 prevents unauthorized data access
- TPM-backed keys can tie both together through measured boot

## Migrating to LUKS2 Encryption

If you have existing Talos nodes without encryption, you cannot simply add encryption to an existing partition in place. Empty partitions can be encrypted after staging the configuration and wiping the partition:

1. Drain the node of Kubernetes workloads
2. Apply the new machine configuration with encryption enabled using `--mode=staged`
3. Wipe the partition that will be encrypted
4. Reboot the node so Talos recreates the volume with LUKS2 encryption
5. Rejoin the node to the cluster

```bash
# Drain the node
kubectl drain node01 --ignore-daemonsets --delete-emptydir-data

# Stage the new config with encryption
talosctl apply-config --nodes 192.168.1.10 --file encrypted-config.yaml --mode=staged

# Wipe EPHEMERAL and reboot so it is encrypted on the next boot
talosctl reset --nodes 192.168.1.10 --system-labels-to-wipe EPHEMERAL --reboot=true
```

For STATE, wipe STATE first, let the node enter maintenance mode, then apply the encrypted configuration with `talosctl apply-config --insecure`. This is a rolling operation - do it one node at a time to maintain cluster availability.

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
