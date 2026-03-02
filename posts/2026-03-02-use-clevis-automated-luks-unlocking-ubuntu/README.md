# How to Use Clevis for Automated LUKS Unlocking on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Encryption, LUKS, Clevis

Description: Configure Clevis on Ubuntu to automate LUKS disk unlocking using TPM2, Tang network servers, or secret sharing policies, eliminating manual passphrase entry at boot.

---

Clevis is a pluggable, automated decryption framework for LUKS volumes. It works by binding a LUKS key slot to an external secret source - a TPM2 chip, a Tang network server, or a threshold combination of both - so that the system can unlock its encrypted disks automatically without a human entering a passphrase.

The framework uses the concept of "pins" - plugins that implement different binding mechanisms. The available pins are:

- **tpm2** - binds to the system's TPM2 chip; disk unlocks automatically on the same hardware but not if the disk is moved
- **tang** - binds to a network Tang server; disk unlocks when the server is reachable
- **sss** - Shamir Secret Sharing; combines multiple pins with a threshold policy

This guide covers installing Clevis and configuring each binding type on Ubuntu.

## Installing Clevis

```bash
sudo apt update
sudo apt install clevis clevis-luks clevis-initramfs clevis-tpm2 -y
```

The `clevis-initramfs` package includes hooks that embed Clevis into the initramfs, enabling it to unlock volumes before the root filesystem mounts.

Rebuild the initramfs after installation:

```bash
sudo update-initramfs -u -k all
```

## Listing Clevis Bindings on a Device

Before or after setup, check what bindings exist on a LUKS device:

```bash
# List all Clevis bindings on /dev/sda3
sudo clevis luks list -d /dev/sda3
```

Output shows bound pins and their key slot numbers:

```
1: tang '{"url":"http://tang.internal:7500"}'
2: tpm2 '{"hash":"sha256","key":"ecc"}'
```

## Using the TPM2 Pin

The TPM2 pin seals the LUKS key material inside the system's Trusted Platform Module. The sealed key is only released when the TPM's Platform Configuration Registers (PCRs) match their values at the time of sealing.

### Requirements

Verify your system has a TPM2 chip:

```bash
ls /dev/tpm* 2>/dev/null
cat /sys/class/tpm/tpm0/tpm_version_major
```

Install TPM2 tools:

```bash
sudo apt install tpm2-tools -y
```

### Binding to TPM2

```bash
# Basic TPM2 binding using default PCR policy
sudo clevis luks bind -d /dev/sda3 tpm2 '{"pcr_ids":"7"}'
```

PCR 7 reflects Secure Boot policy state. Common PCR choices:

| PCR | Contents |
|-----|----------|
| 0 | BIOS firmware |
| 1 | BIOS configuration |
| 7 | Secure Boot state |
| 8 | Boot manager |
| 14 | UEFI drivers and applications |

Using multiple PCRs binds the key more tightly to the specific boot state, but also means any firmware or boot configuration change will break unlocking:

```bash
# Bind to PCR 7 and PCR 14 combined
sudo clevis luks bind -d /dev/sda3 tpm2 '{"pcr_ids":"7,14"}'
```

After a failed unlock (e.g., after a firmware update), fall back to the LUKS passphrase, then re-bind:

```bash
# Remove old binding
sudo clevis luks unbind -d /dev/sda3 -s 2

# Re-bind with current PCR values
sudo clevis luks bind -d /dev/sda3 tpm2 '{"pcr_ids":"7"}'
```

### Testing TPM2 Binding

```bash
sudo clevis decrypt < /path/to/jwe-file
# Or test by attempting to unlock
sudo clevis luks unlock -d /dev/sda3 -n test_vol
sudo cryptsetup close test_vol
```

## Using the Tang Pin

The Tang pin binds unlocking to network presence rather than hardware state. This is covered in detail in a separate guide, but the key commands are:

```bash
# Bind to a Tang server
sudo clevis luks bind -d /dev/sda3 tang '{"url":"http://tang.internal:7500"}'

# Verify the advertised thumbprint matches the Tang server's key
# The enrollment process shows the thumbprint and asks you to confirm
```

For production Tang deployments, always verify the thumbprint to prevent man-in-the-middle attacks during enrollment.

## Using the SSS Pin (Threshold Policy)

The SSS (Shamir Secret Sharing) pin lets you create flexible policies combining multiple pins. The key is split into shares across multiple pins, and a threshold number of them must cooperate to reconstruct it.

### Require Any One of Two Tang Servers

```bash
# Threshold of 1 means either Tang server can unlock
sudo clevis luks bind -d /dev/sda3 sss '{
  "t": 1,
  "pins": {
    "tang": [
      {"url": "http://tang1.internal:7500"},
      {"url": "http://tang2.internal:7500"}
    ]
  }
}'
```

### Require Both TPM2 and Tang Server

For maximum security, require both local hardware integrity and network presence:

```bash
# Threshold of 2 means both must succeed
sudo clevis luks bind -d /dev/sda3 sss '{
  "t": 2,
  "pins": {
    "tpm2": [{"pcr_ids": "7"}],
    "tang": [{"url": "http://tang.internal:7500"}]
  }
}'
```

This prevents unlocking if:
- The disk is removed and placed in different hardware (TPM check fails)
- The disk is taken off the trusted network (Tang unreachable)

### Require Any One of Tang or TPM2

For a more flexible policy where either mechanism works:

```bash
# Either the TPM or the Tang server can unlock
sudo clevis luks bind -d /dev/sda3 sss '{
  "t": 1,
  "pins": {
    "tpm2": [{"pcr_ids": "7"}],
    "tang": [{"url": "http://tang.internal:7500"}]
  }
}'
```

## Removing a Clevis Binding

```bash
# List bindings and their slot numbers
sudo clevis luks list -d /dev/sda3

# Remove binding from slot 1
sudo clevis luks unbind -d /dev/sda3 -s 1
```

This removes the key slot associated with the Clevis binding. The raw LUKS passphrase in other slots remains intact.

## Editing a Binding

There is no in-place edit - you unbind and re-bind:

```bash
# Remove old binding
sudo clevis luks unbind -d /dev/sda3 -s 1

# Add updated binding
sudo clevis luks bind -d /dev/sda3 tang '{"url":"http://tang-new.internal:7500"}'
```

## Ensuring Recovery Access

Never rely solely on Clevis. Always maintain a recovery passphrase:

```bash
# Add a recovery passphrase to slot 7
sudo cryptsetup luksAddKey --key-slot 7 /dev/sda3
# Enter an existing passphrase or use a key file to authorize
```

When Tang is unreachable or the TPM fails, the system falls back to prompting for this passphrase at the initramfs prompt.

## Viewing Clevis Tokens (LUKS2)

LUKS2 uses a token metadata area to store Clevis configuration:

```bash
# View all tokens
sudo cryptsetup luksDump /dev/sda3 | grep -A10 "Tokens:"
```

Clevis stores its binding information as LUKS tokens, which is why it requires LUKS2 for full functionality (though some pins work with LUKS1).

## Debugging Boot-Time Unlocking

If Clevis fails to unlock during boot, the system drops to an initramfs prompt. At that prompt:

```bash
# Try to manually trigger Clevis
clevis luks unlock -d /dev/sda3 -n root_vol

# Check network connectivity (required for Tang)
ip addr show
ping tang.internal

# Check TPM availability
ls /dev/tpm*

# Fall back to manual unlock
cryptsetup luksOpen /dev/sda3 root_vol
# Enter passphrase when prompted
```

After booting, investigate and fix the binding:

```bash
# Check journald for Clevis errors
sudo journalctl -b | grep -i clevis
```

## Summary

Clevis provides a modular framework for automating LUKS unlocking through TPM2 hardware binding, Tang network servers, or threshold combinations of both. The `tpm2` pin is suitable for securing data against disk theft without relying on a network server. The `tang` pin enforces that the server must be on a trusted network to boot. The `sss` pin lets you build nuanced policies that require multiple conditions simultaneously. In all cases, maintain a recovery passphrase in a separate key slot so you retain access when automated mechanisms fail.
