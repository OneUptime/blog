# How to Use TPM-Based Disk Encryption in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, TPM, Disk Encryption, Hardware Security, Kubernetes

Description: Configure TPM-based disk encryption in Talos Linux to leverage hardware security modules for protecting data at rest on your nodes.

---

TPM-based disk encryption in Talos Linux ties your encryption keys to a hardware security module that is physically part of the server. This means the encrypted disk can only be unlocked on the specific machine where it was encrypted and when the TPM policy is satisfied. For bare-metal Kubernetes deployments where physical security matters, TPM encryption with SecureBoot is one of the strongest approaches available. This guide explains how TPM encryption works in Talos and how to set it up.

## What is a TPM?

A Trusted Platform Module (TPM) is a dedicated cryptographic processor that is built into the motherboard of most modern servers and many workstations. TPM 2.0 is the current standard and provides:

- **Secure key protection** - secrets can be sealed to the TPM and released only when the TPM policy is satisfied
- **Platform measurements** - the TPM records measurements of the boot chain (PCR values) that can be used to verify system integrity
- **Sealed secrets** - data can be sealed to specific platform states, so it is only accessible when the system boots in a known-good configuration
- **Random number generation** - hardware-based true random number generation

Talos Linux leverages TPM 2.0 for disk encryption by generating a random LUKS2 key and sealing it with the TPM.

## Prerequisites

Before configuring TPM encryption, verify that your hardware meets the requirements:

1. **TPM 2.0 chip** must be present and enabled in BIOS/UEFI firmware
2. SecureBoot should be enabled for the strongest TPM-backed protection
3. Talos Linux must be able to detect the TPM during boot

You can check for TPM availability on an existing Talos node:

```bash
# Check for TPM device

talosctl get hardwareinfo --nodes 192.168.1.10 -o yaml
```

Look for TPM-related information in the output. If the TPM is detected, you will see TPM version information.

## Configuring TPM Encryption

Current Talos releases configure system volume encryption with `VolumeConfig` documents. The machine configuration for TPM-based encryption is concise:

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
    - tpm: {}
      slot: 0
```

The `tpm: {}` object can be empty because Talos provides default TPM options. Talos handles the TPM interactions.

## How It Works Under the Hood

When Talos boots with TPM encryption configured, the following process occurs:

1. **First boot (provisioning):**
   - Talos creates the LUKS2 encrypted partition
   - A random encryption key is generated
   - The key is sealed with the TPM policy
   - The sealed key blob is stored in the LUKS2 header
   - The partition is formatted and mounted

2. **Subsequent boots:**
   - Talos reads the sealed key blob from the LUKS2 header
   - The TPM unseals the key only if the configured PCR policy is satisfied
   - The unsealed key decrypts the partition
   - Normal boot continues

The critical point is that the TPM only releases the key when the configured policy matches. With SecureBoot and the default Talos policy, this ties unlocking to the SecureBoot state and the signed boot measurements.

## PCR Values and Measured Boot

Platform Configuration Registers (PCRs) are special registers in the TPM that record measurements of the boot process. Each component in the boot chain (firmware, bootloader, kernel, initramfs) is measured and the hash is extended into the appropriate PCR.

Key PCRs used by Talos TPM disk encryption:

- **PCR 7** - SecureBoot state and enrolled SecureBoot keys. Talos binds to PCR 7 by default.
- **PCR 11** - Signed UKI and Talos boot phase measurements used for the TPM unlock policy.

When Talos seals the encryption key with the TPM, it binds the key to the configured PCR policy. By default, new Talos installations use PCR 7 plus the signed PCR 11 policy. You can configure additional PCRs with `tpm.options.pcrs`:

```yaml
apiVersion: v1alpha1
kind: VolumeConfig
name: STATE
encryption:
  provider: luks2
  keys:
    - tpm:
        options:
          pcrs: [0, 7]
      slot: 0
```

Binding to more PCRs can increase protection, but it also makes unlocks more sensitive to legitimate firmware or platform changes.

## Handling Upgrades with TPM Encryption

Talos upgrades change boot assets such as the kernel and initramfs. With SecureBoot and TPM encryption, the new UKI must contain a PCR policy signed by the same PCR signing key, and the configured PCR states must still match.

The upgrade process with TPM encryption:

1. New Talos image is downloaded
2. The encryption key is unsealed with the current TPM policy
3. The upgrade is applied
4. On the next boot, Talos unlocks the disk if the signed PCR policy and configured PCR states match

This is handled automatically for normal upgrades. If you build custom SecureBoot assets, preserve the UKI signing key and PCR signing key so upgraded nodes can still boot and unlock encrypted partitions.

```bash
# Upgrade a TPM-encrypted node (same as any node)
talosctl upgrade --nodes 192.168.1.10 --image ghcr.io/siderolabs/installer:v1.13.2
```

## Adding Recovery Keys

TPM keys should be paired with a recovery plan. Be careful with static fallback keys: Talos stores `STATE` volume encryption configuration in the cleartext `META` partition, so a static passphrase for `STATE` weakens the protection. Static fallback keys are safer for non-`STATE` volumes when the `STATE` volume itself is encrypted:

```yaml
apiVersion: v1alpha1
kind: VolumeConfig
name: EPHEMERAL
encryption:
  provider: luks2
  keys:
    - tpm: {}
      slot: 0
      lockToState: true
    - static:
        passphrase: "tpm-recovery-passphrase-store-securely"
      slot: 1
      lockToState: true
```

The recovery passphrase in slot 1 provides a fallback for that volume. Store it securely, and use backups or a tested node recovery process for `STATE`.

## TPM vs Other Key Types

**TPM vs Node ID:**
- TPM is stronger when used with SecureBoot because the key release is bound to TPM policy and boot state
- Node ID derives the key from identifiers that are accessible to software
- TPM provides measured boot integration that node ID cannot
- TPM requires specific hardware; node ID works everywhere

**TPM vs Static Passphrase:**
- TPM is fully automated; no passphrase management needed
- Static passphrases are simpler to set up but require careful management
- TPM is hardware-bound; passphrases are portable
- Use static passphrases carefully for non-`STATE` recovery keys alongside TPM

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
- This can happen if the update changes one of the PCR values you bind to, especially PCR 7 SecureBoot state
- Use a recovery key if you configured one for the affected volume
- Review your `tpm.options.pcrs` policy before applying firmware and SecureBoot database updates

**TPM not detected:**
- Check BIOS/UEFI settings for TPM enable/disable options
- Some systems require enabling a specific TPM mode (discrete vs firmware TPM)
- Verify the TPM chip is physically present on the motherboard

## Security Considerations

TPM-based encryption provides strong security guarantees, but be aware of some nuances:

1. **TPM is not invincible.** While difficult, TPM chips can potentially be attacked through physical means (decapping, side-channel attacks). For the highest security requirements, combine TPM with additional measures.

2. **Firmware TPM (fTPM) vs Discrete TPM (dTPM).** Firmware TPM runs inside the CPU and is generally considered less secure than a discrete TPM chip. If your threat model includes sophisticated hardware attacks, prefer discrete TPM.

3. **PCR policy granularity.** The tighter you bind PCR values, the more secure the seal, but the more brittle it becomes against legitimate changes. Talos defaults to PCR 7 plus the signed PCR 11 policy, and you can configure additional PCRs when your environment needs them.

4. **Reused hardware.** If you are reusing a server and TPM enrollment behaves unexpectedly, clearing the TPM through BIOS/UEFI firmware can remove previous state.

## Summary

TPM-based disk encryption in Talos Linux provides hardware-rooted security for your encrypted partitions. The encryption key is generated by Talos and sealed with the TPM, making it inaccessible without the correct hardware and TPM policy state. Configuration is minimal - just add `tpm: {}` to your key configuration. Pair TPM keys with a tested recovery plan, and test your setup thoroughly before deploying to production. For bare-metal Kubernetes clusters handling sensitive data, TPM encryption with SecureBoot is one of the best options available for protecting data at rest.
