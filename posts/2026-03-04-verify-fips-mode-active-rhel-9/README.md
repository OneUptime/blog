# How to Verify FIPS Mode Is Active on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, FIPS, Verification, Security, Linux

Description: Multiple methods to verify that FIPS mode is properly enabled and functioning on RHEL, covering kernel, OpenSSL, SSH, and application-level checks.

---

Enabling FIPS mode is one thing. Proving it is actually working is another. Auditors do not take your word for it. They want evidence. This guide covers every verification method I know, from basic kernel checks to testing that non-FIPS algorithms are actually rejected.

## Quick Verification Checks

### Check the fips-mode-setup tool

```bash
# The primary method to check FIPS status
fips-mode-setup --check
# Expected output: FIPS mode is enabled.
```

### Check the kernel parameter

```bash
# Verify the kernel has FIPS enabled
cat /proc/sys/crypto/fips_enabled
# Expected output: 1

# Check it was passed as a boot parameter
grep -o 'fips=[01]' /proc/cmdline
# Expected output: fips=1
```

### Check the crypto policy

```bash
# Verify the system-wide crypto policy is set to FIPS
update-crypto-policies --show
# Expected output: FIPS
```

```mermaid
flowchart TD
    A[FIPS Verification] --> B[Kernel Level]
    A --> C[Crypto Policy]
    A --> D[OpenSSL]
    A --> E[SSH]
    A --> F[Application Level]
    B --> B1[/proc/sys/crypto/fips_enabled]
    B --> B2[/proc/cmdline]
    C --> C1[update-crypto-policies --show]
    D --> D1[FIPS Provider Active]
    D --> D2[Non-FIPS Algorithms Rejected]
    E --> E1[FIPS Ciphers Only]
    F --> F1[Java/Python/etc.]
```

## Deep Verification: OpenSSL

### Check that the FIPS provider is loaded

```bash
# List OpenSSL providers
openssl list -providers

# Expected output should include:
#   fips
#     name: OpenSSL FIPS Provider
#     status: active
```

### Verify non-FIPS algorithms are rejected

```bash
# Try to use MD5 (not FIPS-approved) - should fail
openssl dgst -md5 /etc/hostname 2>&1
# Expected: Error or disabled message

# Try SHA-256 (FIPS-approved) - should work
openssl dgst -sha256 /etc/hostname
# Expected: SHA2-256(...)= <hash>

# Try SHA-512 (FIPS-approved) - should work
openssl dgst -sha512 /etc/hostname
# Expected: SHA2-512(...)= <hash>
```

### Test TLS connections

```bash
# List available ciphers (should only show FIPS-approved)
openssl ciphers -v 'ALL' 2>/dev/null | wc -l

# Try to connect with a non-FIPS cipher (should fail)
openssl s_client -connect example.com:443 -cipher RC4-SHA 2>&1 | head -5
# Expected: Error - no matching cipher

# Connect with a FIPS-approved cipher (should work)
openssl s_client -connect example.com:443 -tls1_2 2>&1 | head -10
```

## Deep Verification: SSH

### Check available SSH ciphers

```bash
# List SSH ciphers available in FIPS mode
ssh -Q cipher
# Should only show FIPS-approved ciphers like:
# aes128-ctr, aes192-ctr, aes256-ctr
# aes128-gcm@openssh.com, aes256-gcm@openssh.com

# List SSH MACs
ssh -Q mac
# Should show FIPS-approved MACs like:
# hmac-sha2-256, hmac-sha2-512

# List SSH key exchange algorithms
ssh -Q kex
```

### Verify SSH host key algorithms

```bash
# Check what key types the SSH server is using
for key in /etc/ssh/ssh_host_*_key; do
    echo "$(basename $key): $(ssh-keygen -l -f $key)"
done

# DSA keys should not be present (not FIPS-approved for signing in FIPS 140-3)
ls /etc/ssh/ssh_host_dsa_key 2>/dev/null && echo "WARNING: DSA key found" || echo "OK: No DSA key"
```

## Deep Verification: Kernel Crypto

### Check kernel crypto modules

```bash
# List loaded crypto modules and their FIPS status
cat /proc/crypto | grep -E "^name|^module|^fips" | paste - - - | head -20

# Check that FIPS self-tests passed at boot
journalctl -b -k | grep -i fips
```

### Verify kernel module integrity

```bash
# Check if the crypto module integrity check passed
dmesg | grep -i "fips"
# Look for messages like: "alg: self-tests for ... passed"
```

## Verification Script

Create a comprehensive verification script:

```bash
cat > /usr/local/bin/verify-fips.sh << 'SCRIPT'
#!/bin/bash
# Comprehensive FIPS mode verification script

echo "========================================"
echo "FIPS Mode Verification Report"
echo "Host: $(hostname)"
echo "Date: $(date)"
echo "========================================"
echo ""

# Check 1: fips-mode-setup
echo "1. fips-mode-setup status:"
fips-mode-setup --check 2>&1
echo ""

# Check 2: Kernel parameter
echo "2. Kernel FIPS flag:"
FIPS_KERNEL=$(cat /proc/sys/crypto/fips_enabled)
echo "   /proc/sys/crypto/fips_enabled = $FIPS_KERNEL"
[ "$FIPS_KERNEL" = "1" ] && echo "   PASS" || echo "   FAIL"
echo ""

# Check 3: Boot parameter
echo "3. Boot parameter:"
FIPS_BOOT=$(grep -o 'fips=[01]' /proc/cmdline)
echo "   $FIPS_BOOT"
[ "$FIPS_BOOT" = "fips=1" ] && echo "   PASS" || echo "   FAIL"
echo ""

# Check 4: Crypto policy
echo "4. Crypto policy:"
POLICY=$(update-crypto-policies --show)
echo "   Policy: $POLICY"
echo "$POLICY" | grep -q "FIPS" && echo "   PASS" || echo "   FAIL"
echo ""

# Check 5: OpenSSL FIPS provider
echo "5. OpenSSL FIPS provider:"
openssl list -providers 2>/dev/null | grep -q "fips" && echo "   PASS - FIPS provider active" || echo "   FAIL - FIPS provider not found"
echo ""

# Check 6: MD5 rejection
echo "6. MD5 rejection test:"
openssl dgst -md5 /etc/hostname 2>/dev/null
if [ $? -ne 0 ]; then
    echo "   PASS - MD5 correctly rejected"
else
    echo "   FAIL - MD5 should be disabled"
fi
echo ""

# Check 7: SHA-256 acceptance
echo "7. SHA-256 acceptance test:"
openssl dgst -sha256 /etc/hostname > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   PASS - SHA-256 works"
else
    echo "   FAIL - SHA-256 should work in FIPS mode"
fi
echo ""

echo "========================================"
echo "Verification complete."
SCRIPT
chmod +x /usr/local/bin/verify-fips.sh
```

Run the script:

```bash
/usr/local/bin/verify-fips.sh
```

## Generate Audit Evidence

For auditors, capture the verification output:

```bash
# Create an evidence file
/usr/local/bin/verify-fips.sh > /var/log/compliance/fips-verification-$(date +%Y%m%d).txt

# Include system information
echo "" >> /var/log/compliance/fips-verification-$(date +%Y%m%d).txt
echo "System Information:" >> /var/log/compliance/fips-verification-$(date +%Y%m%d).txt
uname -a >> /var/log/compliance/fips-verification-$(date +%Y%m%d).txt
cat /etc/redhat-release >> /var/log/compliance/fips-verification-$(date +%Y%m%d).txt
rpm -qa | grep -E "openssl|crypto" >> /var/log/compliance/fips-verification-$(date +%Y%m%d).txt
```

## Common Issues

### FIPS says enabled but checks fail

```bash
# If fips-mode-setup --check says enabled but /proc/sys/crypto/fips_enabled is 0
# The system needs a reboot
# Check if there is a pending reboot
fips-mode-setup --check
cat /proc/sys/crypto/fips_enabled
# If they disagree, reboot the system
```

### OpenSSL FIPS provider not found

```bash
# Verify the FIPS provider module exists
ls -la /usr/lib64/ossl-modules/fips.so

# Check OpenSSL configuration
cat /etc/pki/tls/openssl.cnf | grep -i fips
```

FIPS verification is something you should automate and run regularly. Compliance is not a point-in-time check, it is continuous. Run the verification script daily, archive the results, and flag any changes immediately.
