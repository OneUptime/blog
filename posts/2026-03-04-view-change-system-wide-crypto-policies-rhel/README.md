# How to View and Change System-Wide Crypto Policies on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Crypto Policies, TLS, Security, Encryption, Linux

Description: Learn how to view, change, and manage system-wide cryptographic policies on RHEL to control which ciphers, protocols, and key sizes are permitted across all applications.

---

RHEL provides system-wide crypto policies that let you control the minimum security standards for supported cryptographic back ends (OpenSSL, GnuTLS, NSS, etc.) from a single location. This reduces the need to configure each application individually, as long as the application uses the system-provided configuration and does not override the policy.

## Viewing the Current Policy

```bash
# Display the currently active crypto policy

update-crypto-policies --show

# This will output one of: DEFAULT, LEGACY, FUTURE, FIPS, or a custom policy
```

## Available Built-in Policies

RHEL ships with four predefined policies:

- **DEFAULT** - Balanced security suitable for most workloads
- **LEGACY** - Permits older algorithms for backward compatibility (e.g., SHA-1, TLS 1.0)
- **FUTURE** - Stricter settings anticipating near-future security requirements
- **FIPS** - Applies restrictions aligned with FIPS 140 requirements. Full FIPS mode requires configuring RHEL for FIPS mode, not just setting this policy.

## Changing the Crypto Policy

```bash
# Switch to the FUTURE policy for stronger security
sudo update-crypto-policies --set FUTURE

# Restart the system for the change to fully take effect.
# At minimum, restart affected long-running services.
sudo systemctl restart sshd
sudo systemctl restart httpd
```

## Checking What a Policy Allows

You can inspect the details of the active policy:

```bash
# Show the active policy name
update-crypto-policies --show

# Inspect the effective policy settings after wildcard expansion
cat /etc/crypto-policies/state/CURRENT.pol

# Check that the generated backend files match the configured policy
update-crypto-policies --check
```

## Verifying the Policy is Applied

After switching policies, verify that applications respect the new settings:

```bash
# Test an SSL connection to verify TLS version and cipher
openssl s_client -connect localhost:443 -tls1_2 < /dev/null 2>/dev/null | grep "Protocol\|Cipher"

# Check which policy back ends were generated
ls /etc/crypto-policies/back-ends/
```

## Reverting to Default

```bash
# Revert back to the default policy if needed
sudo update-crypto-policies --set DEFAULT

# Restart the system for the change to fully take effect.
# At minimum, restart affected long-running services.
sudo systemctl restart sshd
```

System-wide crypto policies simplify security management on RHEL. Instead of editing configuration files for each service, you set one policy and supported applications that use the system defaults follow it. This makes auditing and compliance significantly easier to manage across your fleet.
