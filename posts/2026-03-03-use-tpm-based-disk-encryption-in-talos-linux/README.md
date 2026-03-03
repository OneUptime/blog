# How to Use TPM-Based Disk Encryption in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, TPM, Disk Encryption, Hardware Security, Kubernetes

Description: Configure TPM-based disk encryption in Talos Linux to leverage hardware security modules for protecting data at rest on your nodes.

---

TPM-based disk encryption in Talos Linux ties your encryption keys to a hardware security module that is physically part of the server. This means the encrypted disk can only be unlocked on the specific machine where it was encrypted, using cryptographic operations that happen inside the TPM chip itself. For bare-metal Kubernetes deployments where physical security matters, TPM encryption is one of the strongest approaches available. This guide explains how TPM encryption works in Talos and how to set it up.

## What is a TPM?

A Trusted Platform Module (TPM) is a dedicated cryptographic processor that is built into the motherboard of most modern servers and many workstations. TPM 2.0 is the current standard and provides:

- **Secure key storage** - encryption keys are generated and stored inside the TPM chip, never exposed in system memory
- **Platform measurements** - the TPM records measurements of the boot chain (PCR values) that can be used to verify system integrity
- **Sealed secrets** - data can be sealed to specific platform states, so it is only accessible when the system boots in a known-good configuration
- **Random number generation** - hardware-based true random number generation

Talos Linux leverages TPM 2.0 for disk encryption by sealing LUKS2 keys to the TPM. The key never leaves the chip in plain form.

## Prerequisites

Before configuring TPM encryption, verify that your hardware meets the requirements:

1. **TPM 2.0 chip** must be present and enabled in BIOS/UEFI firmware
2. The TPM must be in a clear state (not owned by another OS)
3. Talos Linux must be able to detect the TPM during boot

You can check for TPM availability on an existing Talos node:

```bash
# Check for TPM device
talosctl get hardwareinfo --nodes 192.168.1.10 -o yaml
```

Look for TPM-related information in the output. If the TPM is detected, you will see TPM version information.

## Configuring TPM Encryption

The machine configuration for TPM-based encryption is concise:

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

Like node ID keys, the `tpm: {}` object is empty because the TPM configuration is automatic. Talos handles all the interactions with the TPM chip.

## How It Works Under the Hood

When Talos boots with TPM encryption configured, the following process occurs:

1. **First boot (provisioning):**
   - Talos creates the LUKS2 encrypted partition
   - A random encryption key is generated
   - The key is sealed to the TPM using the current PCR values
   - The sealed key blob is stored in the LUKS2 header
   - The partition is formatted and mounted

2. **Subsequent boots:**
   - Talos reads the sealed key blob from the LUKS2 header
   - The TPM unseals the key only if the current PCR values match those at sealing time
   - The unsealed key decrypts the partition
   - Normal boot continues

The critical point is that the TPM only releases the key when the platform state matches. If someone tampers with the boot chain, the PCR values will be different and the TPM will refuse to unseal the key.

## PCR Values and Measured Boot

Platform Configuration Registers (PCRs) are special registers in the TPM that record measurements of the boot process. Each component in the boot chain (firmware, bootloader, kernel, initramfs) is measured and the hash is extended into the appropriate PCR.

Key PCRs used by Talos:

- **PCR 0** - UEFI firmware measurements
- **PCR 4** - Boot manager and boot loader measurements
- **PCR 7** - Secure Boot state
- **PCR 11** - Often used for kernel and initramfs measurements

When Talos seals the encryption key to the TPM, it binds the key to specific PCR values. This means:

- If the firmware is updated, PCR 0 changes
- If the bootloader is modified, PCR 4 changes
- If the kernel or initramfs changes, the relevant PCRs change

Any of these changes will prevent the TPM from unsealing the key until the seal is updated.

## Handling Upgrades with TPM Encryption

Talos upgrades change the kernel and initramfs, which changes PCR values. Talos handles this by re-sealing the encryption key to the new PCR values after a successful upgrade.

The upgrade process with TPM encryption:

1. New Talos image is downloaded
2. The encryption key is unsealed with current PCR values
3. The upgrade is applied
4. On the next boot, Talos re-measures and re-seals the key to the new PCR values

This is handled automatically. You do not need to do anything special when upgrading nodes that use TPM encryption.

```bash
# Upgrade a TPM-encrypted node (same as any node)
talosctl upgrade --nodes 192.168.1.10 --image ghcr.io/siderolabs/installer:v1.8.0
```

## Adding Recovery Keys

TPM keys should always be paired with a recovery mechanism. If the TPM fails or the motherboard is replaced, you need another way to access the encrypted data:

```yaml
machine:
  systemDiskEncryption:
    state:
      provider: luks2
      keys:
        - tpm: {}
          slot: 0
        - static:
            passphrase: "tpm-recovery-passphrase-store-securely"
          slot: 1
    ephemeral:
      provider: luks2
      keys:
        - tpm: {}
          slot: 0
        - static:
            passphrase: "tpm-recovery-passphrase-store-securely"
          slot: 1
```

The recovery passphrase in slot 1 provides a fallback. Store it securely - this is your lifeline if the TPM becomes unavailable.

## TPM vs Other Key Types

**TPM vs Node ID:**
- TPM is more secure because the key never exists in system memory in plain form
- Node ID derives the key from identifiers that are accessible to software
- TPM provides measured boot integration that node ID cannot
- TPM requires specific hardware; node ID works everywhere

**TPM vs Static Passphrase:**
- TPM is fully automated; no passphrase management needed
- Static passphrases are simpler to set up but require careful management
- TPM is hardware-bound; passphrases are portable
- Use static passphrases as recovery keys alongside TPM

**TPM vs KMS:**
- Both provide strong security
- TPM works offline; KMS requires network access
- KMS provides centralized management; TPM is node-local
- KMS allows remote key revocation; TPM does not

## Troubleshooting TPM Encryption

**Node fails to boot after enabling TPM encryption:**
- Verify the TPM is enabled in BIOS/UEFI
- Check that the TPM is version 2.0 (Talos does not support TPM 1.2)
- Ensure the TPM is cleared and not owned by another system

```bash
# Check TPM-related logs
talosctl logs machined --nodes 192.168.1.10 | grep -i "tpm\|encrypt"
```

**TPM fails to unseal after firmware update:**
- This is expected because firmware updates change PCR values
- Use the recovery key to unlock the partitions
- Talos will re-seal to the new PCR values on the next successful boot

**TPM not detected:**
- Check BIOS/UEFI settings for TPM enable/disable options
- Some systems require enabling a specific TPM mode (discrete vs firmware TPM)
- Verify the TPM chip is physically present on the motherboard

## Security Considerations

TPM-based encryption provides strong security guarantees, but be aware of some nuances:

1. **TPM is not invincible.** While difficult, TPM chips can potentially be attacked through physical means (decapping, side-channel attacks). For the highest security requirements, combine TPM with additional measures.

2. **Firmware TPM (fTPM) vs Discrete TPM (dTPM).** Firmware TPM runs inside the CPU and is generally considered less secure than a discrete TPM chip. If your threat model includes sophisticated hardware attacks, prefer discrete TPM.

3. **PCR policy granularity.** The tighter you bind PCR values, the more secure the seal, but the more brittle it becomes against legitimate changes. Talos balances this automatically.

4. **TPM ownership.** Make sure the TPM is not already owned by a previous operating system. A factory reset of the TPM (through BIOS/UEFI) clears any previous ownership.

## Summary

TPM-based disk encryption in Talos Linux provides hardware-rooted security for your encrypted partitions. The encryption key is generated and sealed inside the TPM chip, making it inaccessible without the correct hardware in the correct state. Configuration is minimal - just add `tpm: {}` to your key configuration. Always pair TPM keys with recovery passphrases, and test your setup thoroughly before deploying to production. For bare-metal Kubernetes clusters handling sensitive data, TPM encryption is one of the best options available for protecting data at rest.
