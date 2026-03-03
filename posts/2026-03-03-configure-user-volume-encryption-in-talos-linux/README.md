# How to Configure User Volume Encryption in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Encryption, Disk Encryption, Kubernetes, Security

Description: Learn how to configure user volume encryption in Talos Linux to protect data at rest on your Kubernetes cluster nodes.

---

Protecting data at rest is a fundamental security requirement for any production Kubernetes cluster. Talos Linux provides built-in support for encrypting its system partitions using LUKS2, ensuring that data stored on disk is unreadable without the correct encryption keys. This guide covers how to configure volume encryption in Talos Linux, the different key management options available, and best practices for production deployments.

## Understanding Talos Partitions

Before diving into encryption configuration, it helps to understand how Talos Linux organizes its disk partitions. A Talos node has several partitions, but two are particularly important for encryption:

- **STATE** - Stores the machine configuration and other persistent state data. This includes certificates, keys, and the Talos configuration itself.
- **EPHEMERAL** - Stores Kubernetes data including pod logs, container images, and etcd data (on control plane nodes). This partition is wiped on reinstall but persists across reboots.

Both of these partitions can contain sensitive information, so encrypting them is highly recommended for production environments.

## Basic Encryption Configuration

The simplest way to enable disk encryption is with a static passphrase. While this is not the most secure option for production, it is useful for understanding the basics:

```yaml
# machine-config-basic-encryption.yaml
# Enable basic disk encryption with a static passphrase
machine:
  systemDiskEncryption:
    ephemeral:
      provider: luks2
      keys:
        - slot: 0
          static:
            passphrase: "a-strong-random-passphrase-here"
    state:
      provider: luks2
      keys:
        - slot: 0
          static:
            passphrase: "another-strong-random-passphrase"
```

Generate and apply this configuration:

```bash
# Generate Talos configuration with encryption patches
talosctl gen config my-cluster https://cluster-endpoint:6443 \
  --config-patch @machine-config-basic-encryption.yaml

# Apply to a node
talosctl apply-config --nodes <node-ip> --file controlplane.yaml
```

## Using Node-Unique Encryption Keys

For better security, you can derive encryption keys from node-specific information. This ensures that each node has a unique encryption key:

```yaml
# machine-config-node-id-encryption.yaml
# Use node ID as the basis for encryption keys
machine:
  systemDiskEncryption:
    ephemeral:
      provider: luks2
      keys:
        - slot: 0
          nodeID: {}
    state:
      provider: luks2
      keys:
        - slot: 0
          nodeID: {}
```

The `nodeID` key source generates an encryption key based on the node's unique hardware identifiers. This is more secure than a static passphrase because the key is tied to the specific hardware, but it does not provide the same level of protection as TPM-sealed keys.

## TPM-Sealed Encryption

For production environments, TPM-sealed encryption provides the strongest guarantees. The encryption key is stored in the TPM hardware and can only be retrieved when the system boots in the expected configuration:

```yaml
# machine-config-tpm-encryption.yaml
# Use TPM-sealed encryption keys for maximum security
machine:
  systemDiskEncryption:
    ephemeral:
      provider: luks2
      keys:
        - slot: 0
          tpm: {}
    state:
      provider: luks2
      keys:
        - slot: 0
          tpm: {}
```

This requires TPM 2.0 hardware to be present and enabled on the node. See the TPM guide for more details on hardware requirements.

## Combining Multiple Key Slots

LUKS2 supports multiple key slots, which means you can have both a primary key and a recovery key. This is essential for production deployments where you need a fallback if the primary key source becomes unavailable:

```yaml
# machine-config-multi-key-encryption.yaml
# Use TPM as primary with static recovery key as backup
machine:
  systemDiskEncryption:
    ephemeral:
      provider: luks2
      keys:
        - slot: 0
          tpm: {}
        - slot: 1
          static:
            passphrase: "emergency-recovery-passphrase-store-securely"
    state:
      provider: luks2
      keys:
        - slot: 0
          tpm: {}
        - slot: 1
          static:
            passphrase: "emergency-recovery-passphrase-store-securely"
```

The recovery passphrase should be stored in a secure, offline location. You might use a hardware security module, a sealed envelope in a safe, or a secrets management system that is separate from the Talos cluster itself.

## Configuring LUKS2 Cipher Options

Talos uses sensible defaults for LUKS2 encryption, but you can customize the cipher settings if your organization has specific requirements:

```yaml
# machine-config-custom-cipher.yaml
# Custom LUKS2 cipher configuration
machine:
  systemDiskEncryption:
    ephemeral:
      provider: luks2
      cipher: aes-xts-plain64
      keySize: 512
      blockSize: 4096
      keys:
        - slot: 0
          tpm: {}
    state:
      provider: luks2
      cipher: aes-xts-plain64
      keySize: 512
      blockSize: 4096
      keys:
        - slot: 0
          tpm: {}
```

The default cipher (aes-xts-plain64 with 256-bit key) is appropriate for most use cases. A 512-bit key size with XTS mode means 256 bits of effective security, which meets current industry standards.

## Applying Encryption to Existing Nodes

If you have existing Talos nodes that are not encrypted, you will need to reinstall them to enable encryption. Encryption must be configured at installation time because it changes the partition layout.

```bash
# Step 1: Drain the node
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data

# Step 2: Reset the node
talosctl reset --nodes <node-ip> --graceful

# Step 3: Apply new configuration with encryption
talosctl apply-config --nodes <node-ip> --file controlplane-encrypted.yaml --insecure

# Step 4: Wait for the node to rejoin the cluster
talosctl health --nodes <node-ip>

# Step 5: Uncordon the node
kubectl uncordon <node-name>
```

For control plane nodes, you should do this one node at a time to maintain cluster availability. Make sure etcd is healthy between each node migration:

```bash
# Check etcd health before proceeding to the next node
talosctl etcd status --nodes <remaining-control-plane-ip>
```

## Verifying Encryption Status

After enabling encryption, verify that it is active:

```bash
# Check the encryption status on a node
talosctl get volumestatus --nodes <node-ip>

# Look for LUKS-encrypted devices
talosctl list /dev/mapper/ --nodes <node-ip>

# Check dmesg for encryption-related messages
talosctl dmesg --nodes <node-ip> | grep -i "luks\|crypt\|encrypt"
```

## Performance Considerations

Disk encryption adds a small amount of CPU overhead for every I/O operation. On modern hardware with AES-NI instruction support (which is present on virtually all x86_64 processors from the last decade), this overhead is minimal, typically less than 2-3%.

You can verify that your nodes have hardware AES acceleration:

```bash
# Check for AES-NI support
talosctl read /proc/cpuinfo --nodes <node-ip> | grep -i aes
```

If you are running on hardware without AES acceleration (rare in production environments), you may want to benchmark the performance impact before deploying encryption.

## Encryption and etcd

On control plane nodes, etcd data lives on the EPHEMERAL partition. When you encrypt this partition, etcd data is automatically encrypted at rest. However, you should also enable etcd's built-in encryption for Kubernetes secrets:

```yaml
# machine-config-etcd-secret-encryption.yaml
# Enable both disk encryption and Kubernetes secret encryption
machine:
  systemDiskEncryption:
    ephemeral:
      provider: luks2
      keys:
        - slot: 0
          tpm: {}
    state:
      provider: luks2
      keys:
        - slot: 0
          tpm: {}
cluster:
  secretboxEncryptionSecret: "your-base64-encoded-32-byte-key"
```

This gives you defense in depth: even if someone manages to read the encrypted disk, they still cannot read Kubernetes secrets without the additional encryption key.

## Backup and Disaster Recovery

With encrypted volumes, your backup and disaster recovery procedures need to account for the encryption keys:

1. **Document your key management strategy** and store recovery keys securely
2. **Test recovery procedures** regularly to make sure you can actually unlock encrypted volumes when needed
3. **Keep machine configurations backed up** since they contain the encryption settings
4. **Plan for hardware failure** since TPM-sealed keys are tied to specific hardware

```bash
# Back up the Talos machine configuration (contains encryption settings)
talosctl get machineconfig --nodes <node-ip> -o yaml > machine-config-backup.yaml

# Store this backup securely - it contains sensitive information
```

## Conclusion

Volume encryption in Talos Linux is straightforward to configure and provides strong protection for data at rest. Whether you use static keys for development, node-derived keys for moderate security, or TPM-sealed keys for production, the configuration follows the same pattern. The key is to plan your key management strategy before deploying encryption, ensure you have recovery keys stored securely, and test your disaster recovery procedures before you need them.
