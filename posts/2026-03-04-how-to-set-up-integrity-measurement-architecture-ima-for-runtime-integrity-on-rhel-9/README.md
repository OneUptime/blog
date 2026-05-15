# How to Set Up IMA for Runtime Integrity on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Security

Description: Step-by-step guide on set up integrity measurement architecture (ima) for runtime integrity on rhel 9 with practical examples and commands.

---

IMA provides runtime integrity verification on RHEL 9 by measuring files before access and, when appraisal is enabled, comparing them against known-good values.

## Overview

IMA operates at the kernel level, creating measurement lists of file hashes that can be verified against a policy. This detects unauthorized changes to system files at runtime.

## Enable IMA

Add kernel boot parameters:

```bash
sudo grubby --update-kernel=ALL \
  --args="ima_policy=appraise_tcb ima_hash=sha256 ima_appraise=fix"
```

Reboot:

```bash
sudo reboot
```

## Verify IMA is Active

```bash
sudo dmesg | grep -i ima
cat /sys/kernel/security/ima/ascii_runtime_measurements | wc -l
```

## Create a Custom IMA Policy

```bash
sudo tee /etc/ima/ima-policy <<EOF
# Measure all executed files

measure func=BPRM_CHECK mask=MAY_EXEC
# Measure shared libraries
measure func=MMAP_CHECK mask=MAY_EXEC
# Measure files opened for read by root
measure func=FILE_CHECK mask=MAY_READ uid=0
# Measure kernel modules
measure func=MODULE_CHECK
# Measure firmware
measure func=FIRMWARE_CHECK
# Appraise all executed files
appraise func=BPRM_CHECK mask=MAY_EXEC
EOF
```

## Load the Policy

```bash
sudo tee /sys/kernel/security/ima/policy < /etc/ima/ima-policy > /dev/null
```

## Sign Files for IMA Appraisal

Install the IMA/EVM utilities:

```bash
sudo dnf install -y ima-evm-utils
```

Generate a signing key:

```bash
sudo mkdir -p /etc/keys/ima
sudo openssl genrsa -out /etc/keys/ima-privkey.pem 2048
sudo openssl req -new -x509 -key /etc/keys/ima-privkey.pem \
  -outform DER -out /etc/keys/ima/ima.der \
  -subj "/CN=Local IMA signing key/"
sudo keyctl padd asymmetric Local-IMA %:.ima < /etc/keys/ima/ima.der
```

Sign system binaries:

```bash
sudo evmctl ima_sign --key /etc/keys/ima-privkey.pem /usr/bin/bash
sudo evmctl ima_sign --key /etc/keys/ima-privkey.pem /usr/bin/ls
```

## View Measurements

```bash
sudo cat /sys/kernel/security/ima/ascii_runtime_measurements | tail -20
```

## Monitor IMA Violations

```bash
sudo ausearch -m INTEGRITY_DATA -ts today
sudo ausearch -m INTEGRITY_STATUS -ts today
```

## Conclusion

IMA on RHEL 9 provides kernel-enforced runtime integrity by measuring and appraising files before they are accessed. Combined with file signing and TPM, it creates a strong defense against unauthorized system modifications.
