# How to Rotate Disk Encryption Keys in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Key Rotation, Disk Encryption, Security, LUKS2

Description: Step-by-step guide to rotating disk encryption keys in Talos Linux using LUKS2 key slots for zero-downtime key management.

---

Key rotation is a fundamental security practice. Even the strongest encryption key becomes a liability if it has been in use for too long, potentially exposed, or shared with someone who no longer needs access. Talos Linux supports disk encryption key rotation through LUKS2 key slots, allowing you to transition from one key to another without downtime or data loss. This guide explains the key rotation process, covers the different scenarios you might encounter, and provides practical steps for rotating keys safely.

## Why Rotate Encryption Keys?

There are several reasons to rotate disk encryption keys:

- **Compliance requirements** - many security frameworks (PCI-DSS, SOC 2, HIPAA) require periodic key rotation
- **Personnel changes** - when team members who knew the encryption passphrases leave the organization
- **Suspected compromise** - if there is any chance that a key has been exposed
- **Best practice** - regular rotation limits the window of exposure if a key is eventually compromised
- **Audit findings** - security audits often flag long-lived encryption keys

## How LUKS2 Key Slots Enable Rotation

LUKS2 supports up to 32 key slots. Each slot can independently unlock the encrypted partition. The actual data encryption key (the master key) is stored in the LUKS2 header, encrypted with the key in each active slot. This means:

- Multiple keys can unlock the same partition simultaneously
- You can add a new key without removing the old one
- Once the new key is verified, you can safely remove the old key
- The underlying data encryption key does not change during key slot rotation

This last point is important. Key slot rotation changes the authentication key (what you use to unlock the partition), not the data encryption key (what actually encrypts the data). If you need to change the actual data encryption key, that requires re-encrypting the entire partition.

## Rotation Process Overview

The general approach for key rotation in Talos Linux:

1. Add the new key to an unused key slot
2. Verify the new key works
3. Remove the old key from its slot
4. Update documentation and secrets management

## Rotating Static Passphrases

This is the most common rotation scenario. You have a static passphrase and want to change it.

**Step 1: Add the new passphrase to a second slot**

Update the machine configuration to include both the old and new passphrases:

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
    ephemeral:
      provider: luks2
      keys:
        - static:
            passphrase: "old-passphrase-2024"
          slot: 0
        - static:
            passphrase: "new-passphrase-2025"
          slot: 1
```

Apply to the node:

```bash
talosctl apply-config --nodes 192.168.1.10 --file config-both-keys.yaml
```

At this point, the partition can be unlocked with either passphrase.

**Step 2: Verify the new key works**

Verify the configuration was applied and the node is healthy:

```bash
# Check node status
talosctl get volumestatus STATE --nodes 192.168.1.10 -o yaml
talosctl get volumestatus EPHEMERAL --nodes 192.168.1.10 -o yaml

# Verify the node is functional
kubectl get nodes
```

**Step 3: Remove the old passphrase**

Update the configuration to only include the new passphrase:

```yaml
machine:
  systemDiskEncryption:
    state:
      provider: luks2
      keys:
        - static:
            passphrase: "new-passphrase-2025"
          slot: 0
    ephemeral:
      provider: luks2
      keys:
        - static:
            passphrase: "new-passphrase-2025"
          slot: 0
```

Apply the updated configuration:

```bash
talosctl apply-config --nodes 192.168.1.10 --file config-new-key.yaml
```

The old passphrase is now removed from slot 0, and the new passphrase is in slot 0.

## Rolling Rotation Across a Cluster

For a multi-node cluster, rotate keys one node at a time:

```bash
#!/bin/bash
# Rolling key rotation script
NODES="192.168.1.10 192.168.1.11 192.168.1.12"

for node in $NODES; do
  echo "Rotating keys on $node..."

  # Step 1: Drain the node
  NODE_NAME=$(kubectl get nodes -o wide | grep "$node" | awk '{print $1}')
  kubectl drain "$NODE_NAME" --ignore-daemonsets --delete-emptydir-data

  # Step 2: Apply config with both old and new keys
  talosctl apply-config --nodes "$node" --file config-both-keys.yaml

  # Step 3: Wait for node to be ready
  sleep 30
  kubectl wait --for=condition=Ready "node/$NODE_NAME" --timeout=300s

  # Step 4: Apply config with only new key
  talosctl apply-config --nodes "$node" --file config-new-key.yaml

  # Step 5: Wait and uncordon
  sleep 10
  kubectl uncordon "$NODE_NAME"

  echo "Key rotation complete on $node"
  echo "---"
done
```

## Rotating Between Key Types

You can also rotate between different key types. For example, migrating from static passphrases to TPM-based keys:

**Step 1: Add TPM key alongside existing passphrase**

```yaml
machine:
  systemDiskEncryption:
    state:
      provider: luks2
      keys:
        - static:
            passphrase: "current-passphrase"
          slot: 0
        - tpm: {}
          slot: 1
    ephemeral:
      provider: luks2
      keys:
        - static:
            passphrase: "current-passphrase"
          slot: 0
        - tpm: {}
          slot: 1
```

**Step 2: Verify TPM key works by rebooting**

```bash
# Reboot the node to test TPM key
talosctl reboot --nodes 192.168.1.10
```

**Step 3: Switch to TPM as primary, keep passphrase as recovery**

```yaml
machine:
  systemDiskEncryption:
    state:
      provider: luks2
      keys:
        - tpm: {}
          slot: 0
        - static:
            passphrase: "recovery-passphrase"
          slot: 1
    ephemeral:
      provider: luks2
      keys:
        - tpm: {}
          slot: 0
        - static:
            passphrase: "recovery-passphrase"
          slot: 1
```

## Automating Key Rotation

For large clusters, automate key rotation using CI/CD pipelines:

```yaml
# GitOps-friendly key rotation workflow
# .github/workflows/rotate-keys.yml
name: Rotate Talos Encryption Keys
on:
  schedule:
    - cron: '0 2 1 */3 *'  # Quarterly rotation
  workflow_dispatch:

jobs:
  rotate:
    runs-on: self-hosted
    steps:
      - name: Generate new passphrase
        run: |
          NEW_PASSPHRASE=$(openssl rand -base64 48)
          echo "::add-mask::${NEW_PASSPHRASE}"
          echo "NEW_PASSPHRASE=${NEW_PASSPHRASE}" >> $GITHUB_ENV

      - name: Store new passphrase in vault
        run: |
          vault kv put secret/talos/encryption passphrase="${NEW_PASSPHRASE}"

      - name: Generate configs and rotate
        run: |
          ./scripts/rotate-encryption-keys.sh
```

## Verifying Rotation Success

After rotation, confirm everything is working:

```bash
# Check all volumes are ready
talosctl get volumes --nodes 192.168.1.10

# Verify the machine config shows the correct keys
talosctl get machineconfig --nodes 192.168.1.10 -o yaml

# Test a reboot to confirm the new key unlocks partitions
talosctl reboot --nodes 192.168.1.10

# After reboot, verify the node is healthy
kubectl get nodes -o wide
```

## Emergency Key Rotation

If you suspect a key has been compromised, rotate immediately:

1. Do not wait for a maintenance window
2. Add a new key to all nodes as quickly as possible
3. Then remove the old key from all nodes
4. If using a KMS, revoke the compromised key at the KMS level

```bash
# Emergency rotation - add new key to all nodes simultaneously
for node in $ALL_NODES; do
  talosctl apply-config --nodes "$node" --file config-emergency.yaml &
done
wait

# Then remove old key
for node in $ALL_NODES; do
  talosctl apply-config --nodes "$node" --file config-new-only.yaml &
done
wait
```

## Best Practices

1. **Rotate on a schedule.** Quarterly rotation is a good baseline for most environments.

2. **Always verify before removing the old key.** Test that the new key works (including a reboot) before removing the old one.

3. **Keep rotation logs.** Record when keys were rotated, which nodes were affected, and who performed the rotation.

4. **Automate when possible.** Manual key rotation is error-prone, especially in large clusters.

5. **Have a rollback plan.** If the new key does not work, you need the old key to recover. Never delete the old key until the new key is fully verified.

6. **Rotate recovery keys too.** If you rotate primary keys, also update recovery passphrases.

## Summary

Key rotation in Talos Linux leverages LUKS2's multi-slot key architecture to provide smooth, zero-downtime transitions between encryption keys. The process is straightforward: add the new key, verify it works, remove the old key. For production clusters, automate the rotation process and include it in your regular security maintenance schedule. Whether you are rotating static passphrases, migrating between key types, or responding to a security incident, the key slot mechanism gives you the flexibility to manage encryption keys safely.
