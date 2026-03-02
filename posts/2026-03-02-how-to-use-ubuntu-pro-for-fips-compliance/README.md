# How to Use Ubuntu Pro for FIPS Compliance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, FIPS, Ubuntu Pro, Compliance, Security

Description: A guide to enabling FIPS 140 certified cryptographic modules on Ubuntu using Ubuntu Pro, covering installation, verification, and operational considerations for compliance environments.

---

FIPS 140 is a US federal standard for cryptographic modules, required by many government, defense, and financial organizations. Ubuntu Pro provides FIPS 140-2 and FIPS 140-3 certified cryptographic modules for Ubuntu LTS releases. Enabling FIPS on Ubuntu is done through the `pro` command, but there are operational implications that need to be understood before you flip the switch.

## What FIPS on Ubuntu Actually Means

Enabling FIPS via Ubuntu Pro does several things:

1. Replaces standard cryptographic libraries (OpenSSL, libgcrypt, strongSwan, etc.) with FIPS-validated versions
2. Configures the system to use only FIPS-approved algorithms
3. Adds the FIPS kernel module that enables FIPS mode in the kernel
4. Sets configuration that causes services to use FIPS-compliant algorithm selection

The FIPS modules from Canonical have been validated by NIST-accredited labs. The validation certificate numbers are available on Canonical's documentation pages.

## Pre-FIPS Checklist

Before enabling FIPS, understand the implications:

- **Requires reboot**: The system must be rebooted after enabling FIPS
- **Algorithm restrictions**: Some algorithms no longer available (MD5, SHA-1 in some contexts, RC4, etc.)
- **Performance impact**: FIPS-validated modules may be slower than standard ones
- **Irreversibility**: While technically reversible, going back is operationally complex and not recommended in production
- **Application compatibility**: Some applications may break if they depend on non-FIPS algorithms

Test FIPS in a non-production environment first.

## Ubuntu Pro and FIPS Prerequisites

```bash
# Verify Ubuntu Pro is attached
pro status | grep "Machine is"
# Should show: Machine is attached to 'Ubuntu Pro'

# If not attached, attach first
sudo pro attach <your-token>

# Check available FIPS services
pro status --all | grep -E "fips"
# Shows: fips and fips-updates availability
```

## Understanding fips vs fips-updates

Ubuntu Pro offers two FIPS-related services:

- **fips**: The certified, unchanging FIPS modules. Exactly what was validated. No security updates.
- **fips-updates**: FIPS modules with security patches applied. The updates may affect the validated state but maintain security.

For strict FIPS compliance audits, `fips` is required. For environments where security is the primary concern and strict validation status is secondary, `fips-updates` is the better choice since it receives security fixes.

```bash
# View the description of each
pro status --all | grep -A2 fips
```

## Enabling FIPS

```bash
# Enable FIPS (NOT fips-updates - strictly validated)
sudo pro enable fips

# The tool will warn you about the reboot requirement and implications
# Type 'y' to confirm

# Example output:
# This will install the FIPS packages. To stay in a FIPS-compliant
# state, you must ensure no other packages with the same name are
# installed.
#
# A reboot will be required to complete the installation of FIPS.
# Type 'y' to acknowledge.
# y
# Installing FIPS packages...
# FIPS enabled. Please reboot for the FIPS kernel to be loaded.
```

Or enable fips-updates instead:

```bash
sudo pro enable fips-updates
```

## Reboot and Verification

```bash
# Reboot the system
sudo reboot

# After reboot, verify FIPS mode is active
# The kernel should report FIPS mode enabled
cat /proc/sys/crypto/fips_enabled
# Should return: 1

# Verify using pro
pro status | grep fips

# Check OpenSSL is in FIPS mode
openssl md5 /etc/hostname
# In FIPS mode, MD5 should be disabled:
# Error setting digest
# 139...error:060800A3:digital envelope routines:EVP_DigestInit_ex:disabled for FIPS
```

## Verifying FIPS Module Status

```bash
# Check which FIPS modules are installed
dpkg -l | grep fips

# Verify the OpenSSL FIPS provider
openssl version
openssl list -providers

# Check fips_enabled sysctl
sysctl crypto.fips_enabled
# Should return: crypto.fips_enabled = 1

# Verify kernel FIPS mode at boot (check kernel command line)
cat /proc/cmdline | grep fips
# Should contain: fips=1
```

## Testing FIPS-Approved Operations

```bash
# These should work in FIPS mode (FIPS-approved algorithms)
# AES-256 encryption
openssl enc -aes-256-cbc -in /tmp/test.txt -out /tmp/test.enc -k "testpassword" -pbkdf2
echo "AES-256 works: OK"

# SHA-256 hashing
echo "test" | openssl dgst -sha256
echo "SHA-256 works: OK"

# RSA key generation (2048+ bit)
openssl genrsa 2048 > /dev/null 2>&1 && echo "RSA-2048 works: OK"

# These should FAIL in FIPS mode (non-approved algorithms)
# MD5
openssl md5 /etc/hostname && echo "MD5 works (unexpected in FIPS mode)" || echo "MD5 blocked: expected"

# DES
openssl enc -des-ecb -in /tmp/test.txt -out /tmp/test.enc -k "testpassword" 2>&1 | \
    head -1 || echo "DES blocked: expected"
```

## SSH Configuration for FIPS

SSH must be configured to use only FIPS-approved algorithms:

```bash
# /etc/ssh/sshd_config - FIPS-compliant settings
# Ubuntu's FIPS OpenSSH package sets these automatically, but verify:

sudo tee /etc/ssh/sshd_config.d/fips.conf <<'EOF'
# FIPS-compliant SSH ciphers
Ciphers aes128-ctr,aes192-ctr,aes256-ctr,aes128-cbc,aes192-cbc,aes256-cbc

# FIPS-compliant MACs
MACs hmac-sha2-256,hmac-sha2-512,hmac-sha1

# FIPS-compliant key exchange
KexAlgorithms ecdh-sha2-nistp256,ecdh-sha2-nistp384,ecdh-sha2-nistp521,diffie-hellman-group-exchange-sha256

# FIPS-compliant host key algorithms
HostKeyAlgorithms ecdsa-sha2-nistp256,ecdsa-sha2-nistp384,ecdsa-sha2-nistp521,ssh-rsa
EOF

sudo sshd -t  # Validate config
sudo systemctl reload sshd
```

## Package Pinning to Prevent FIPS Module Replacement

FIPS modules must not be replaced by standard packages:

```bash
# Pin the FIPS packages to prevent accidental replacement
sudo apt-mark hold openssl libssl*

# Or use apt pinning
sudo tee /etc/apt/preferences.d/fips-pin <<'EOF'
Package: openssl
Pin: release a=focal-security
Pin-Priority: 1001

Package: libssl1.1
Pin: release a=focal-security
Pin-Priority: 1001
EOF
```

## Monitoring FIPS Status

```bash
#!/bin/bash
# fips_monitor.sh - Verify FIPS mode is active

check_fips() {
    local errors=0

    # Check kernel FIPS mode
    if [ "$(cat /proc/sys/crypto/fips_enabled 2>/dev/null)" != "1" ]; then
        echo "ERROR: Kernel FIPS mode not enabled"
        errors=$((errors + 1))
    else
        echo "OK: Kernel FIPS mode enabled"
    fi

    # Check pro status
    if pro status 2>/dev/null | grep -q "fips.*enabled"; then
        echo "OK: Ubuntu Pro FIPS service enabled"
    else
        echo "WARNING: Ubuntu Pro FIPS service not showing as enabled"
        errors=$((errors + 1))
    fi

    # Test that MD5 is blocked (it should be in FIPS mode)
    if openssl md5 /etc/hostname &>/dev/null; then
        echo "ERROR: MD5 is allowed - FIPS mode may not be active"
        errors=$((errors + 1))
    else
        echo "OK: MD5 is blocked (FIPS enforcement active)"
    fi

    return $errors
}

check_fips
```

## Disabling FIPS (Not Recommended)

```bash
# Technical steps to disable (use only in test environments)
sudo pro disable fips

# Must reboot
sudo reboot

# Verify after reboot
cat /proc/sys/crypto/fips_enabled
# Should return: 0
```

Disabling FIPS on a production system requires careful planning - services configured for FIPS algorithms will need their configuration reviewed, and the transition period may leave the system in a mixed state.

## Audit and Compliance Documentation

```bash
# Generate compliance evidence
sudo tee /var/compliance/fips_status_$(date +%Y%m%d).txt <<EOF
FIPS Compliance Status Report
Date: $(date -u)
Hostname: $(hostname -f)

Kernel FIPS Mode: $(cat /proc/sys/crypto/fips_enabled)
Kernel Version: $(uname -r)
Ubuntu Version: $(lsb_release -ds)

Ubuntu Pro FIPS Status:
$(pro status | grep fips)

Installed FIPS Packages:
$(dpkg -l | grep fips)

OpenSSL Version:
$(openssl version)

OpenSSL Providers:
$(openssl list -providers 2>/dev/null || echo "N/A")
EOF

echo "Report generated: /var/compliance/fips_status_$(date +%Y%m%d).txt"
```

FIPS compliance is not just about flipping a switch - it requires application-level testing, policy updates for allowed algorithms, and ongoing monitoring to ensure the FIPS state is not inadvertently changed. The Ubuntu Pro integration makes the technical enablement straightforward, but the operational and application impact requires dedicated planning.
