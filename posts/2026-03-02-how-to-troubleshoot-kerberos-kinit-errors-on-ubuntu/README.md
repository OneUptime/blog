# How to Troubleshoot Kerberos 'kinit' Errors on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Kerberos, Troubleshooting, Authentication, kinit

Description: Diagnose and fix common kinit errors on Ubuntu, including clock skew, KDC unreachable, invalid credentials, and encryption type mismatches.

---

`kinit` is the entry point to Kerberos - it authenticates a user and obtains a Ticket Granting Ticket (TGT). When `kinit` fails, nothing downstream works: SSH authentication fails, service tickets cannot be obtained, and SSO breaks. Most `kinit` errors have specific causes and straightforward fixes.

## Checking Your Kerberos Configuration First

Before debugging specific errors, verify the configuration file:

```bash
# Show current Kerberos configuration
cat /etc/krb5.conf

# Verify realm and KDC are configured
grep -E "default_realm|kdc" /etc/krb5.conf

# Test basic KDC connectivity
nc -zv kdc.example.com 88
```

## Error: "kinit: Clock skew too great"

This is one of the most common Kerberos errors. Kerberos requires clocks to be within 5 minutes of each other. If they differ more than this, authentication is rejected to prevent replay attacks.

```text
kinit: Clock skew too great while getting initial credentials
```

**Diagnosis:**

```bash
# Check local time
date

# Check NTP sync status
timedatectl status

# Compare with the KDC's time (requires SSH access to KDC)
ssh admin@kdc.example.com date
```

**Fix:**

```bash
# Enable and start systemd-timesyncd (simpler)
sudo systemctl enable systemd-timesyncd
sudo systemctl start systemd-timesyncd
timedatectl set-ntp true

# Force immediate sync
sudo chronyc makestep
# or for timedatectl:
sudo systemctl restart systemd-timesyncd

# Verify sync
timedatectl show --value --property=NTPSynchronized
```

If your system cannot reach public NTP servers, configure it to use the KDC as an NTP source or an internal NTP server.

## Error: "kinit: Cannot find KDC for realm"

```text
kinit: Cannot find KDC for realm "EXAMPLE.COM" while getting initial credentials
```

The client cannot locate the KDC. This is either a `krb5.conf` misconfiguration or a network issue.

**Diagnosis:**

```bash
# Check krb5.conf realm definition
grep -A5 "EXAMPLE.COM" /etc/krb5.conf

# Test TCP connectivity to KDC port 88
nc -zv kdc.example.com 88

# Test UDP (Kerberos uses UDP for short exchanges)
nc -zuv kdc.example.com 88

# Check DNS resolution
host kdc.example.com
nslookup kdc.example.com

# If using DNS SRV records:
dig _kerberos._tcp.example.com SRV
dig _kerberos._udp.example.com SRV
```

**Fix:**

Ensure `krb5.conf` has the correct KDC address:

```ini
[realms]
    EXAMPLE.COM = {
        kdc = kdc.example.com
        admin_server = kdc.example.com
    }
```

If DNS is not working, add a hosts entry:

```bash
sudo nano /etc/hosts
# Add: 192.168.1.10  kdc.example.com
```

Check firewall rules on the KDC:

```bash
# On the KDC
sudo ufw status | grep 88
sudo ss -tlnup | grep 88
```

## Error: "kinit: Client not found in Kerberos database"

```text
kinit: Client 'jsmith@EXAMPLE.COM' not found in Kerberos database
```

The principal does not exist in the KDC.

**Diagnosis:**

```bash
# On the KDC, check if the principal exists
sudo kadmin.local -q "getprinc jsmith"

# List all principals
sudo kadmin.local -q "listprincs"
```

**Fix:**

```bash
# Create the missing principal
sudo kadmin.local -q "addprinc jsmith"
```

Also check the realm suffix - `kinit jsmith@EXAMPLE.COM` and `kinit jsmith@example.com` are different principals (realm is case-sensitive).

## Error: "kinit: Preauthentication failed"

```text
kinit: Preauthentication failed while getting initial credentials
```

The password is wrong, or the account requires pre-authentication but the wrong data was sent.

**Diagnosis:**

```bash
# Verbose kinit output
kinit -V jsmith

# Check principal flags on KDC
sudo kadmin.local -q "getprinc jsmith"
# Look for: REQUIRES_PRE_AUTH
```

**Fix:**

Reset the password:

```bash
sudo kadmin.local -q "cpw jsmith"
# Enter new password
```

If the account is locked (too many failed attempts):

```bash
# Check for lockout
sudo kadmin.local -q "getprinc jsmith"
# Look for: LOCKED_OUT

# Clear the lockout
sudo kadmin.local -q "modprinc -unlock jsmith"
```

## Error: "kinit: KDC has no support for encryption type"

```text
kinit: KDC has no support for encryption type while getting initial credentials
```

The client is requesting an encryption type the KDC does not support, or vice versa.

**Diagnosis:**

```bash
# Check what encryption types the KDC supports
sudo kadmin.local -q "getprinc krbtgt/EXAMPLE.COM"
# Look at: Key: vno X, aes256-cts-hmac-sha1-96, ...

# Check client's configured encryption types
grep -E "enctypes|supported_enctypes" /etc/krb5.conf
```

**Fix:**

Update `krb5.conf` to match the KDC's supported types:

```ini
[libdefaults]
    default_tkt_enctypes = aes256-cts-hmac-sha1-96 aes128-cts-hmac-sha1-96
    default_tgs_enctypes = aes256-cts-hmac-sha1-96 aes128-cts-hmac-sha1-96
    permitted_enctypes = aes256-cts-hmac-sha1-96 aes128-cts-hmac-sha1-96
```

If you have old DES-encrypted principals, update them:

```bash
# Update krbtgt principal to use modern encryption
sudo kadmin.local -q "cpw -randkey krbtgt/EXAMPLE.COM"
sudo kadmin.local -q "cpw -randkey krbtgt/EXAMPLE.COM"
# Run twice to update both keys
```

## Error: "kinit: Ticket expired"

```text
kinit: Ticket expired while renewing credentials
```

The TGT has passed its maximum renewable lifetime and cannot be renewed.

**Fix:**

```bash
# Destroy the expired ticket and get a new one
kdestroy
kinit jsmith
```

To avoid this, configure longer renewable lifetimes in `kdc.conf`:

```ini
[realms]
    EXAMPLE.COM = {
        max_life = 24h
        max_renewable_life = 7d
    }
```

And on clients, set `renew_lifetime = 7d` in `krb5.conf`.

## Error: "kinit: Resource temporarily unavailable"

The KDC is overloaded or a connection limit was hit.

```bash
# Check KDC process status
sudo systemctl status krb5-kdc

# Check for error messages
sudo journalctl -u krb5-kdc -n 50

# Check connections
sudo ss -s | grep -i established
```

## Enabling Verbose kinit Output

For any error not immediately obvious, run kinit with increased verbosity:

```bash
# Basic verbose
kinit -V jsmith

# Set KRB5_TRACE for detailed trace output
KRB5_TRACE=/dev/stderr kinit jsmith 2>&1 | less
```

The trace output shows every step of the authentication exchange and precisely where it fails.

## Debugging with MIT Kerberos Utilities

```bash
# Verify a keytab file
klist -k /etc/krb5.keytab

# Get a service ticket and verify
kinit jsmith
kvno host/server.example.com

# Test GSSAPI authentication
gss-client server.example.com host < /dev/null
```

## Common Issues with Active Directory

When `kinit` is used against Active Directory (not MIT KDC), additional issues arise:

```bash
# Check if AD requires specific DNS
# AD Kerberos requires the computer's hostname to be in DNS

# Check AD domain controller is reachable
nc -zv dc.corp.example.com 88

# Test with explicit realm
kinit jsmith@CORP.EXAMPLE.COM

# AD may require password change on first login
# kinit may show: kinit: Password has expired
# Change it with:
kpasswd
```

## Checking Kerberos Log Files

```bash
# MIT KDC log
sudo tail -f /var/log/krb5kdc.log

# kadmind log
sudo tail -f /var/log/kadmind.log

# Authentication attempts
sudo tail -f /var/log/auth.log | grep -i kerberos
```

## Quick Reference: Error to Fix

| Error | Most Likely Cause | Quick Fix |
|-------|-----------------|-----------|
| Clock skew too great | NTP not synchronized | `sudo chronyc makestep` |
| Cannot find KDC | Wrong KDC address in krb5.conf | Fix `[realms]` section |
| Client not found | Principal does not exist | `kadmin.local -q "addprinc user"` |
| Preauthentication failed | Wrong password | Reset with `kadmin.local -q "cpw user"` |
| No support for encryption type | Encryption mismatch | Update `permitted_enctypes` |
| Ticket expired | Renewal lifetime exceeded | `kdestroy && kinit` |

Kerberos errors are usually very specific. The error message combined with `KRB5_TRACE` output is almost always enough to pinpoint the exact cause.
