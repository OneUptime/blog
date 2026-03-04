# How to Switch RHEL to the FUTURE Crypto Policy for Stronger Security

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Crypto Policies, FUTURE, TLS, Security, Linux

Description: Learn how to switch RHEL to the FUTURE crypto policy to enforce stronger cryptographic algorithms and prepare your systems for upcoming security requirements.

---

The FUTURE crypto policy on RHEL enforces stricter cryptographic standards than the DEFAULT policy. It requires TLS 1.2 or higher, 2048-bit minimum RSA keys (3072-bit recommended), and disables older algorithms like SHA-1 for signatures. This is useful when you want to proactively harden your systems.

## What the FUTURE Policy Enforces

- Minimum TLS version: 1.2
- Minimum RSA key size: 3072 bits
- Minimum DH parameter size: 3072 bits
- No SHA-1 for digital signatures
- No RC4, DES, or 3DES ciphers
- No DSA keys

## Switching to the FUTURE Policy

```bash
# Check the current policy first
update-crypto-policies --show

# Switch to FUTURE
sudo update-crypto-policies --set FUTURE

# Verify the switch
update-crypto-policies --show
# Output: FUTURE
```

## Restarting Services

After changing the policy, restart services that use cryptographic libraries:

```bash
# Restart common services that rely on crypto
sudo systemctl restart sshd
sudo systemctl restart httpd
sudo systemctl restart nginx
sudo systemctl restart postfix

# Or simply reboot to ensure all services pick up the change
sudo systemctl reboot
```

## Testing the Policy

Verify that only strong ciphers are available:

```bash
# Check available OpenSSL ciphers under the FUTURE policy
openssl ciphers -v | wc -l

# Test a TLS connection to confirm minimum version
openssl s_client -connect localhost:443 < /dev/null 2>/dev/null | grep "Protocol"
# Should show TLSv1.2 or TLSv1.3

# Verify SSH no longer offers weak key exchange algorithms
ssh -vv localhost 2>&1 | grep "kex:"
```

## Handling Compatibility Issues

Some older clients or services may fail to connect after switching to FUTURE. Check logs for errors:

```bash
# Check SSH connection failures
sudo journalctl -u sshd --since "1 hour ago" | grep -i "error\|fail"

# Check web server TLS errors
sudo journalctl -u httpd --since "1 hour ago" | grep -i "ssl\|tls"
```

If specific applications break, consider using a custom policy module to selectively allow an algorithm instead of reverting the entire policy. The FUTURE policy is a solid step toward stronger security posture across your RHEL systems.
