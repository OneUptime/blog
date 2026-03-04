# How to Set Up Integrity Measurement Architecture (IMA) for Runtime Integrity on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, IMA, Security, Runtime Integrity, TPM

Description: Configure IMA on RHEL for continuous runtime file integrity checking, using the kernel's built-in measurement and appraisal subsystem to detect unauthorized changes.

---

IMA provides continuous runtime integrity verification at the kernel level. Unlike file integrity monitoring tools that run periodically, IMA checks files every time they are accessed.

## Understanding IMA Modes

IMA has three main modes:
- **Measurement**: Records hashes of accessed files in a measurement log
- **Appraisal**: Verifies files against stored reference hashes before allowing access
- **Audit**: Logs integrity violations to the audit system

## Enable IMA Measurement with TCB Policy

```bash
# Add IMA boot parameters
sudo grubby --update-kernel=ALL \
  --args="ima_policy=tcb ima_hash=sha256"

# Reboot to activate
sudo reboot
```

After reboot, verify IMA is running:

```bash
# Check IMA measurements are being collected
sudo head -5 /sys/kernel/security/ima/ascii_runtime_measurements

# Each line shows:
# PCR_number hash_algorithm:hash filename_hint filename
# Example:
# 10 sha256:abc123... /usr/bin/bash boot_aggregate
```

## Set Up IMA Appraisal

Appraisal mode verifies file integrity before allowing execution:

```bash
# First, label all files with their current hashes (fix mode)
sudo grubby --update-kernel=ALL \
  --args="ima_policy=appraise_tcb ima_appraise=fix"

sudo reboot

# After reboot in fix mode, access files to set their hashes
# Run common commands to label their binaries
find /usr/bin /usr/sbin /usr/lib64 -type f -exec head -c 1 {} \; 2>/dev/null

# Check that security.ima extended attributes are being set
getfattr -m security.ima -d /usr/bin/ls
```

## Create a Custom IMA Policy

```bash
# Write a custom policy file
sudo tee /etc/ima/ima-policy << 'POLICY'
# Measure all executables
measure func=BPRM_CHECK
# Measure shared libraries
measure func=FILE_MMAP mask=MAY_EXEC
# Measure files opened by root
measure func=FILE_CHECK uid=0
# Appraise all executables
appraise func=BPRM_CHECK
# Appraise shared libraries
appraise func=FILE_MMAP mask=MAY_EXEC
POLICY

# Load the policy at boot by adding to the kernel parameters
sudo grubby --update-kernel=ALL \
  --args="ima_policy=/etc/ima/ima-policy"
```

## Monitor IMA Violations

```bash
# Search for IMA violations in the audit log
sudo ausearch -m INTEGRITY_DATA -ts recent

# Watch for violations in real time
sudo tail -f /var/log/audit/audit.log | grep integrity
```

## IMA with TPM

If a TPM (Trusted Platform Module) is present, IMA measurements are extended into the TPM PCR registers:

```bash
# Check if TPM is available
ls /dev/tpm*

# Read TPM PCR values
sudo tpm2_pcrread sha256:10
```

The TPM stores a running hash of all measurements, providing a hardware-rooted chain of trust that cannot be tampered with by software.

Start with measurement mode to understand what IMA tracks before enabling appraisal, which can prevent files from being accessed if they fail verification.
