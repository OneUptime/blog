# How to Set Up Integrity Measurement Architecture (IMA) on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, IMA, Security, Integrity, TPM

Description: Configure IMA on RHEL to measure and optionally appraise file integrity at runtime, providing a trusted computing foundation for your systems.

---

Integrity Measurement Architecture (IMA) is a Linux kernel subsystem that measures files as they are accessed. On RHEL, IMA can detect unauthorized modifications to executables, libraries, and configuration files.

## Check IMA Status

IMA is built into the RHEL kernel. Verify that `securityfs` is mounted and IMA is active:

```bash
# Check if IMA is enabled

dmesg | grep -i ima

# View current IMA measurements
sudo cat /sys/kernel/security/ima/ascii_runtime_measurements | head -10
```

Each line in the measurements log contains a hash of a file that was accessed, providing an audit trail.

## Enable IMA Appraisal Policy via Boot Parameters

To enable the default appraisal policy in fix mode, add kernel boot parameters:

```bash
# Edit the GRUB configuration
sudo grubby --update-kernel=ALL \
  --args="ima_policy=appraise_tcb ima_appraise=fix evm=fix"

# The "appraise_tcb" policy appraises files owned by root.
# "ima_appraise=fix" and "evm=fix" set extended attributes without blocking.
```

Reboot for the changes to take effect:

```bash
sudo reboot
```

## Verify the Policy is Active

```bash
# After reboot, check the active IMA policy
sudo cat /sys/kernel/security/ima/policy | head -20

# Check measurement count
sudo wc -l /sys/kernel/security/ima/ascii_runtime_measurements
```

## Signing Files for IMA Appraisal

In appraisal mode, IMA can verify file signatures. First, generate a signing key:

```bash
# Install the ima-evm-utils and attr packages
sudo dnf install -y ima-evm-utils attr

# Generate an IMA signing key for a lab system
sudo mkdir -p /etc/keys
openssl genrsa -out /etc/keys/privkey_ima.pem 2048
openssl rsa -pubout -in /etc/keys/privkey_ima.pem \
  -out /etc/keys/pubkey_ima.pem

# Sign a file with a key trusted by the kernel IMA keyring
sudo evmctl ima_sign --key /etc/keys/privkey_ima.pem /usr/bin/myapp

# Verify the signature is stored as an extended attribute
getfattr -m security.ima -d /usr/bin/myapp
```

The corresponding public key or certificate must be loaded into a trusted IMA keyring; otherwise, IMA cannot verify the signature during appraisal.

## Switching to Enforce Mode

Once all files are signed correctly:

```bash
# Change to enforce mode (blocks unsigned/modified files)
sudo grubby --update-kernel=ALL \
  --remove-args="ima_appraise=fix evm=fix" \
  --args="ima_appraise=enforce"
sudo reboot
```

Be cautious with enforce mode. Unsigned files can fail appraisal, which can break the system if not all files are properly signed.
