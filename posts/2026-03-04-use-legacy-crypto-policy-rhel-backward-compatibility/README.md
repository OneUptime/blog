# How to Use the LEGACY Crypto Policy on RHEL for Backward Compatibility

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Crypto Policies, LEGACY, TLS, Compatibility, Linux

Description: Learn when and how to use the LEGACY crypto policy on RHEL to maintain backward compatibility with older systems and applications that require deprecated cryptographic algorithms.

---

The LEGACY crypto policy on RHEL enables older algorithms such as SHA-1, TLS 1.0, TLS 1.1, and smaller key sizes. You should only use this policy when you must interoperate with systems that do not support modern cryptography. It trades security strength for compatibility.

## When to Use the LEGACY Policy

- Connecting to legacy systems that only support TLS 1.0 or 1.1
- Working with older applications that require SHA-1 signed certificates
- Integrating with hardware that uses older firmware with limited crypto support
- Temporary workaround while upgrading legacy infrastructure

## Switching to the LEGACY Policy

```bash
# Check the current policy
update-crypto-policies --show

# Switch to LEGACY
sudo update-crypto-policies --set LEGACY

# Verify the change
update-crypto-policies --show
# Output: LEGACY
```

## Restarting Services

```bash
# Restart services to apply the new policy
sudo systemctl restart sshd
sudo systemctl restart httpd

# Check that services are running
sudo systemctl status sshd httpd
```

## What the LEGACY Policy Allows

```bash
# See the expanded list of ciphers now available
openssl ciphers -v | wc -l

# You will see TLS 1.0 and 1.1 are now permitted
openssl s_client -connect legacy-server:443 -tls1 < /dev/null 2>/dev/null | grep "Protocol"
```

Compared to DEFAULT, the LEGACY policy adds:
- TLS 1.0 and 1.1 support
- SHA-1 for signatures
- Minimum 1024-bit RSA/DH keys
- 3DES cipher support

## A Safer Alternative: Scoped Exceptions

Instead of switching the entire system to LEGACY, consider using a custom module to relax only specific settings:

```bash
# Create a module that allows SHA-1 but keeps everything else at DEFAULT
sudo tee /etc/crypto-policies/policies/modules/ALLOW-SHA1.pmod << 'EOF'
# Allow SHA-1 for signature verification only
hash = SHA1+
sign = RSA-SHA1+ ECDSA-SHA1+
EOF

# Apply DEFAULT with just the SHA-1 exception
sudo update-crypto-policies --set DEFAULT:ALLOW-SHA1
```

## Returning to DEFAULT

Once you have upgraded the legacy systems, switch back to a stronger policy:

```bash
sudo update-crypto-policies --set DEFAULT
sudo systemctl restart sshd httpd
```

The LEGACY policy should be treated as a temporary measure. Document why you enabled it and set a timeline for migrating back to DEFAULT or stronger.
