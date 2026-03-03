# How to Use Static Passphrases for Disk Encryption in Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Disk Encryption, Static Passphrase, Security, LUKS2

Description: Learn how to configure static passphrase-based disk encryption in Talos Linux for explicit control over your encryption keys.

---

Static passphrases are one of the simplest and most direct ways to encrypt disks in Talos Linux. Unlike node ID keys that derive from hardware or TPM keys that depend on a security chip, static passphrases give you explicit control over the encryption key material. You choose the passphrase, you manage it, and you decide where it is stored. This guide explains how to configure static passphrase encryption in Talos, discusses security considerations, and shares practical patterns for managing passphrases in production.

## When to Use Static Passphrases

Static passphrases work well in several scenarios:

- **Development and testing** - when you want encryption enabled but do not need complex key management
- **Recovery keys** - as a backup unlock mechanism alongside other key types
- **Compliance requirements** - when your security policy requires explicitly managed encryption keys
- **Environments without TPM** - when hardware security modules are not available
- **Air-gapped deployments** - where external KMS services are unreachable

The trade-off is that you are responsible for keeping the passphrase secure. It appears in your machine configuration, so your configuration management pipeline needs to handle it carefully.

## Basic Static Passphrase Configuration

Here is how to configure static passphrase encryption for both system partitions:

```yaml
machine:
  systemDiskEncryption:
    state:
      provider: luks2
      keys:
        - static:
            passphrase: "my-strong-encryption-passphrase-2024"
          slot: 0
    ephemeral:
      provider: luks2
      keys:
        - static:
            passphrase: "my-strong-encryption-passphrase-2024"
          slot: 0
```

You can use the same passphrase for both partitions or different passphrases for each:

```yaml
machine:
  systemDiskEncryption:
    state:
      provider: luks2
      keys:
        - static:
            passphrase: "state-partition-secret-2024"
          slot: 0
    ephemeral:
      provider: luks2
      keys:
        - static:
            passphrase: "ephemeral-partition-secret-2024"
          slot: 0
```

Using different passphrases adds a layer of separation - compromising one passphrase does not automatically compromise the other partition.

## Choosing Strong Passphrases

The security of your encryption depends directly on the strength of your passphrase. Follow these guidelines:

- Use at least 32 characters
- Include a mix of uppercase, lowercase, numbers, and symbols
- Do not use dictionary words or common phrases
- Generate passphrases using a cryptographic random number generator

```bash
# Generate a random passphrase
openssl rand -base64 48
# Output: something like "k7Jm3Fq9+vX2nL8/pR5wZ0aY1bC6dE4gH=iK..."
```

Or use a passphrase generator:

```bash
# Generate a memorable but strong passphrase
# Using words from a dictionary
python3 -c "import secrets; words = open('/usr/share/dict/words').read().split(); print('-'.join(secrets.choice(words) for _ in range(6)))"
```

## Applying the Configuration

For new nodes:

```bash
# Apply config with static passphrase encryption during initial setup
talosctl apply-config --nodes 192.168.1.10 --file machine-config.yaml --insecure
```

For existing nodes (requires reprovisioning):

```bash
# Step 1: Drain the node
kubectl drain node01 --ignore-daemonsets --delete-emptydir-data

# Step 2: Reset the node
talosctl reset --nodes 192.168.1.10 --graceful

# Step 3: Apply new config with encryption
talosctl apply-config --nodes 192.168.1.10 --file encrypted-config.yaml --insecure

# Step 4: Wait for the node to come back and uncordon
kubectl uncordon node01
```

## Managing Passphrases Securely

The biggest challenge with static passphrases is keeping them secure throughout their lifecycle. Here are proven approaches:

### Using a Secrets Manager

Store your passphrases in a secrets manager and inject them into machine configs during deployment:

```bash
# Retrieve passphrase from HashiCorp Vault
PASSPHRASE=$(vault kv get -field=passphrase secret/talos/encryption)

# Generate machine config with the passphrase
envsubst < machine-config-template.yaml > machine-config.yaml

# Apply and clean up
talosctl apply-config --nodes 192.168.1.10 --file machine-config.yaml --insecure
rm machine-config.yaml
```

Your template would reference the environment variable:

```yaml
machine:
  systemDiskEncryption:
    state:
      provider: luks2
      keys:
        - static:
            passphrase: "${PASSPHRASE}"
          slot: 0
```

### Using SOPS for Config Encryption

Mozilla SOPS lets you encrypt sensitive fields in YAML files:

```bash
# Encrypt the machine config
sops --encrypt --in-place machine-config.yaml

# Decrypt when needed for deployment
sops --decrypt machine-config.yaml | talosctl apply-config --nodes 192.168.1.10 --file /dev/stdin --insecure
```

### Separate Secrets from Configuration

Keep the base machine configuration separate from encryption secrets:

```bash
# Base config without secrets
talosctl gen config my-cluster https://192.168.1.100:6443

# Encryption patch file (stored separately, encrypted at rest)
# encryption-patch.yaml
machine:
  systemDiskEncryption:
    state:
      provider: luks2
      keys:
        - static:
            passphrase: "the-actual-passphrase"
          slot: 0

# Apply with patch
talosctl apply-config --nodes 192.168.1.10 \
  --file worker.yaml \
  --config-patch @encryption-patch.yaml \
  --insecure
```

## Per-Node vs Cluster-Wide Passphrases

You have two strategies for passphrase scope:

**Same passphrase for all nodes:**
- Simpler to manage
- If compromised, all nodes are affected
- Works well for smaller clusters

**Unique passphrase per node:**
- More secure - compromising one node does not affect others
- More complex to manage
- Better for large or high-security environments

For per-node passphrases:

```bash
# Generate and apply unique passphrases
for node in node01 node02 node03; do
  PASSPHRASE=$(openssl rand -base64 48)
  # Store in vault
  vault kv put "secret/talos/encryption/${node}" passphrase="${PASSPHRASE}"
  # Generate node-specific config
  sed "s/PASSPHRASE_PLACEHOLDER/${PASSPHRASE}/" template.yaml > "${node}-config.yaml"
done
```

## Rotating Passphrases

LUKS2 key slots make passphrase rotation possible without downtime:

**Step 1:** Add the new passphrase to an empty slot:

```yaml
machine:
  systemDiskEncryption:
    state:
      provider: luks2
      keys:
        - static:
            passphrase: "old-passphrase-2024"
          slot: 0
        - static:
            passphrase: "new-passphrase-2025"
          slot: 1
```

**Step 2:** Apply this configuration. The node can now unlock with either passphrase.

**Step 3:** Once verified, switch to the new passphrase as primary:

```yaml
machine:
  systemDiskEncryption:
    state:
      provider: luks2
      keys:
        - static:
            passphrase: "new-passphrase-2025"
          slot: 0
```

**Step 4:** Apply again. The old passphrase in slot 0 is replaced with the new one, and slot 1 is freed.

## Combining Static Passphrases with Other Key Types

Static passphrases work well as recovery keys alongside other primary key types:

```yaml
machine:
  systemDiskEncryption:
    state:
      provider: luks2
      keys:
        # Primary: TPM-based key for automated boot
        - tpm: {}
          slot: 0
        # Recovery: static passphrase in case of TPM failure
        - static:
            passphrase: "emergency-recovery-passphrase"
          slot: 1
```

This gives you the security benefits of TPM-based keys with the reliability of a passphrase backup.

## Verifying Encryption

After applying the configuration, confirm encryption is active:

```bash
# Check volume encryption status
talosctl get volumestatus STATE --nodes 192.168.1.10 -o yaml
talosctl get volumestatus EPHEMERAL --nodes 192.168.1.10 -o yaml
```

Look for LUKS2 indicators in the output.

## Summary

Static passphrases in Talos Linux give you direct, explicit control over disk encryption keys. The configuration is simple, but the responsibility for securing the passphrase falls on you. Use a secrets manager, encrypt your configuration files, and rotate passphrases regularly. For production environments, consider using static passphrases as recovery keys alongside more automated key management approaches like TPM or KMS. Whatever approach you take, the important thing is that your data is encrypted and your keys are managed properly.
