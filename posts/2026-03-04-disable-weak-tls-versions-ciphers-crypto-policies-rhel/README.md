# How to Disable Weak TLS Versions and Ciphers with Crypto Policies on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, TLS, Crypto Policies, Security, Ciphers, Linux

Description: Learn how to use RHEL crypto policies to disable weak TLS versions and ciphers system-wide, ensuring only strong encryption is used across all services.

---

Weak TLS versions (1.0 and 1.1) and ciphers (RC4, 3DES, CBC-mode ciphers) are known to have vulnerabilities. RHEL crypto policies let you disable them system-wide with a single command rather than editing individual service configurations.

## Check Current TLS and Cipher Settings

```bash
# See the current crypto policy
update-crypto-policies --show

# List all ciphers currently allowed by OpenSSL
openssl ciphers -v | sort

# Test what TLS versions your server accepts
openssl s_client -connect localhost:443 -tls1 < /dev/null 2>&1 | grep "Protocol"
openssl s_client -connect localhost:443 -tls1_1 < /dev/null 2>&1 | grep "Protocol"
openssl s_client -connect localhost:443 -tls1_2 < /dev/null 2>&1 | grep "Protocol"
```

## Disable Weak TLS Versions System-Wide

The simplest approach is to use the DEFAULT policy, which already disables TLS 1.0 and 1.1:

```bash
# DEFAULT policy requires TLS 1.2+ and disables weak ciphers
sudo update-crypto-policies --set DEFAULT
```

For even stricter settings, use FUTURE:

```bash
# FUTURE policy enforces TLS 1.2+ with stronger cipher requirements
sudo update-crypto-policies --set FUTURE
```

## Create a Custom Module to Disable Specific Ciphers

If you need to remove specific ciphers while staying on the DEFAULT policy:

```bash
# Create a module to disable CBC and other weak ciphers
sudo tee /etc/crypto-policies/policies/modules/NO-WEAK.pmod << 'EOF'
# Disable all CBC-mode ciphers
cipher = -AES-256-CBC -AES-128-CBC -3DES-CBC -CAMELLIA-256-CBC -CAMELLIA-128-CBC
# Enforce minimum TLS 1.2
protocol@TLS = -TLS1.0 -TLS1.1
# Disable RC4 entirely
cipher = -RC4
EOF

# Apply the custom module
sudo update-crypto-policies --set DEFAULT:NO-WEAK
```

## Verify the Changes

```bash
# Restart services
sudo systemctl restart sshd httpd

# Confirm weak TLS versions are rejected
openssl s_client -connect localhost:443 -tls1 < /dev/null 2>&1
# Should show a handshake failure

# List only the ciphers that are now permitted
openssl ciphers -v

# Check SSH ciphers in use
sshd -T | grep ciphers
```

## Audit for Weak Cipher Usage

```bash
# Scan your server with nmap to verify
nmap --script ssl-enum-ciphers -p 443 localhost
```

Using crypto policies to disable weak TLS versions and ciphers is cleaner and more maintainable than editing each service configuration file individually. The system-wide approach ensures no service accidentally falls back to insecure settings.
