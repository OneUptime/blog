# How to Troubleshoot Application Failures Caused by Crypto Policies on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Crypto Policies, Troubleshooting, TLS, Security, Linux

Description: Learn how to diagnose and fix application failures caused by system-wide crypto policy changes on RHEL, including identifying rejected algorithms and creating targeted exceptions.

---

After changing the system-wide crypto policy on RHEL, some applications may fail to connect or authenticate. This happens when a service or client relies on an algorithm that the new policy disallows. Here is how to diagnose and resolve these issues.

## Identifying the Problem

The most common symptoms are TLS handshake failures, SSH connection refusals, or certificate validation errors.

```bash
# Check the current crypto policy
update-crypto-policies --show

# Look for crypto-related errors in the journal
sudo journalctl --since "1 hour ago" | grep -iE "ssl|tls|cipher|handshake|crypto"

# Check SSH daemon logs
sudo journalctl -u sshd --since "1 hour ago" | grep -i "error\|fail\|unable"

# Check web server logs
sudo journalctl -u httpd --since "1 hour ago" | grep -i "ssl\|tls"
```

## Diagnosing TLS Handshake Failures

```bash
# Test the connection with verbose output
openssl s_client -connect server:443 -debug < /dev/null 2>&1 | grep -A2 "error"

# Check which ciphers the server offers
openssl s_client -connect server:443 -cipher 'ALL' < /dev/null 2>&1 | grep "Cipher"

# Compare ciphers between policies
# Save current policy ciphers
openssl ciphers -v > /tmp/current_ciphers.txt
# Temporarily check what DEFAULT would allow
update-crypto-policies --show
```

## Diagnosing SSH Failures

```bash
# Test SSH with verbose output to see negotiation details
ssh -vvv user@server 2>&1 | grep -E "kex:|cipher:|mac:"

# Check what algorithms the SSH daemon offers
sshd -T | grep -E "^ciphers|^kexalgorithms|^macs"
```

## Creating a Targeted Exception

Instead of reverting the entire policy, create a module that allows just the needed algorithm:

```bash
# Example: application needs SHA-1 certificates
sudo tee /etc/crypto-policies/policies/modules/APP-COMPAT.pmod << 'EOF'
# Allow SHA-1 for certificate verification
hash = SHA1+
sign = RSA-SHA1+ ECDSA-SHA1+
EOF

sudo update-crypto-policies --set DEFAULT:APP-COMPAT
sudo systemctl restart sshd httpd
```

## Quick Rollback

If you need services working immediately while investigating:

```bash
# Temporarily revert to DEFAULT
sudo update-crypto-policies --set DEFAULT
sudo systemctl restart sshd httpd
```

Always prefer creating targeted modules over reverting to LEGACY. Document any exceptions you create, and revisit them when legacy systems are upgraded.
