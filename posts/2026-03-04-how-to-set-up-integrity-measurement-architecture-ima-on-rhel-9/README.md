# How to Set Up Integrity Measurement Architecture (IMA) on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Security

Description: Step-by-step guide on set up integrity measurement architecture (ima) on RHEL with practical examples and commands.

---

Integrity Measurement Architecture (IMA) on RHEL provides runtime integrity verification by measuring files before they are accessed. This guide covers setting up IMA for system security.

## Prerequisites

- RHEL with a kernel that supports IMA (default)
- TPM 2.0 hardware (recommended but not required)
- Root access

## Verify IMA Support

Check that IMA is enabled in the kernel:

```bash
sudo dmesg | grep -i ima
cat /sys/kernel/security/ima/ascii_runtime_measurements | head -5
```

## Understand IMA Modes

IMA operates in several modes:

- **Measurement** - Records file hashes in the IMA log
- **Appraisal** - Verifies file signatures before allowing access
- **Audit** - Logs integrity violations to the audit log

## Enable IMA Measurement

Add kernel boot parameters through GRUB:

```bash
sudo grubby --update-kernel=ALL \
  --args="ima_policy=tcb ima_hash=sha256"
```

Reboot to apply:

```bash
sudo reboot
```

## Verify IMA Measurements

After rebooting, check the measurement log:

```bash
sudo cat /sys/kernel/security/ima/ascii_runtime_measurements | head -20
```

Each line contains the PCR register, template hash, template name, file hash, and file path.

## Configure a Custom IMA Policy

Create a custom policy file:

```bash
sudo tee /etc/ima/ima-policy <<EOF
# Measure all executables
measure func=BPRM_CHECK
# Measure shared libraries
measure func=FILE_MMAP mask=MAY_EXEC
# Measure files opened by root
measure func=FILE_CHECK uid=0
# Measure kernel modules
measure func=MODULE_CHECK
# Measure firmware
measure func=FIRMWARE_CHECK
EOF
```

Load the custom policy:

```bash
sudo cat /etc/ima/ima-policy > /sys/kernel/security/ima/policy
```

## Enable IMA Appraisal

IMA appraisal verifies file signatures. First, generate signing keys:

```bash
# Generate a private key for signing
openssl genrsa -out /etc/keys/privkey.pem 2048
openssl rsa -in /etc/keys/privkey.pem -pubout -out /etc/keys/pubkey.pem
```

Sign files with evmctl:

```bash
sudo dnf install -y ima-evm-utils

sudo evmctl sign --key /etc/keys/privkey.pem /usr/bin/bash
```

Enable appraisal in the boot parameters:

```bash
sudo grubby --update-kernel=ALL \
  --args="ima_appraise=enforce"
```

## Integrate IMA with TPM 2.0

If you have a TPM, IMA measurements can be extended to TPM PCR registers:

```bash
# Verify TPM is available
sudo tpm2_pcrread sha256:10

# IMA automatically extends PCR 10 with measurements
sudo cat /sys/kernel/security/ima/ascii_runtime_measurements | wc -l
```

## Monitor IMA Events with auditd

```bash
sudo auditctl -w /sys/kernel/security/ima/ -p r -k ima_events
sudo ausearch -k ima_events
```

## Conclusion

IMA on RHEL provides a kernel-level integrity measurement framework. Combined with TPM 2.0, it creates a chain of trust from boot through runtime, verifying that executables, libraries, and kernel modules have not been tampered with.

