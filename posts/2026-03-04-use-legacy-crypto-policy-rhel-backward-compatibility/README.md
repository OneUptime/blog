# How to Use the LEGACY Crypto Policy on RHEL for Backward Compatibility

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Crypto Policies, LEGACY, TLS, Compatibility, Linux

Description: Learn when and how to use the LEGACY crypto policy on RHEL to maintain backward compatibility with older systems and applications that require deprecated cryptographic algorithms.

---

The LEGACY crypto policy on RHEL 8 enables older protocols and algorithms such as TLS 1.0, TLS 1.1, 3DES, RC4, DSA, and smaller key sizes. SHA-1 signatures are also allowed under LEGACY, but they are not unique to LEGACY on RHEL 8. You should only use this policy when you must interoperate with systems that do not support modern cryptography. It trades security strength for compatibility.

On RHEL 9 and RHEL 10, the LEGACY policy is stricter than it is on RHEL 8. Do not assume that enabling LEGACY on newer RHEL releases enables TLS 1.0, TLS 1.1, 3DES, or 1024-bit RSA/DH keys.

## When to Use the LEGACY Policy

- Connecting to legacy systems that only support TLS 1.0 or 1.1
- Working with older applications that require SHA-1 signatures and other LEGACY-only settings
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

## Rebooting or Restarting Services

```bash
# Reboot to fully apply the new policy
sudo reboot

# Or restart specific affected services if a full reboot is not possible
sudo systemctl restart sshd
sudo systemctl restart httpd

# Check that services are running
sudo systemctl status sshd httpd
```

## What the LEGACY Policy Allows

```bash
# See the expanded list of ciphers now available
openssl ciphers -v | wc -l

# On RHEL 8, TLS 1.0 is now permitted if the server also supports it
openssl s_client -connect legacy-server:443 -tls1 < /dev/null 2>/dev/null | grep "Protocol"
```

Compared to DEFAULT on RHEL 8, the LEGACY policy adds:
- TLS 1.0 and 1.1 support
- DSA and RC4 support
- Minimum 1024-bit RSA/DH keys
- 3DES cipher support

On RHEL 9, LEGACY does not enable TLS 1.1 or older, 3DES, or 1024-bit RSA/DH keys. On RHEL 10, LEGACY also no longer allows SHA-1 signatures in TLS contexts.

## A Safer Alternative: Scoped Exceptions

Instead of switching the entire system to LEGACY, consider using a narrower subpolicy to relax only specific settings:

```bash
# On RHEL 9, apply the built-in SHA1 subpolicy instead of switching to LEGACY
sudo update-crypto-policies --set DEFAULT:SHA1
```

## Returning to DEFAULT

Once you have upgraded the legacy systems, switch back to a stronger policy:

```bash
sudo update-crypto-policies --set DEFAULT
sudo reboot

# Or restart specific affected services if a full reboot is not possible
sudo systemctl restart sshd httpd
```

The LEGACY policy should be treated as a temporary measure. Document why you enabled it and set a timeline for migrating back to DEFAULT or stronger.
