# How to Troubleshoot Kerberos Ticket Issues on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Kerberos, Troubleshooting, Tickets, Linux

Description: A comprehensive troubleshooting guide for Kerberos ticket issues on RHEL, covering common errors, diagnostic tools, and step-by-step resolution procedures.

---

Kerberos ticket problems show up as vague authentication failures that can be caused by a dozen different things. The trick is knowing which diagnostic tools to use and what order to check things in. This guide is organized by symptom so you can jump directly to what you are seeing.

## Diagnostic Tools

Before diving into specific problems, here are the tools you need:

```bash
# List tickets in the credential cache
klist

# List tickets with flags and encryption types
klist -f -e

# List keytab entries
klist -kt /etc/krb5.keytab

# Get a ticket (test authentication)
kinit username@REALM

# Destroy all tickets
kdestroy -A

# Trace Kerberos operations (the most useful debug tool)
KRB5_TRACE=/dev/stderr kinit username@REALM

# Request a service ticket and show the result
kvno host/server.example.com@REALM
```

## Problem: "Cannot find KDC for requested realm"

This means the Kerberos client cannot locate a KDC for the realm.

### Check DNS SRV Records

```bash
# Look for Kerberos SRV records
dig _kerberos._tcp.EXAMPLE.COM SRV
dig _kerberos._udp.EXAMPLE.COM SRV

# Look for the KDC SRV record
dig _kerberos-master._tcp.EXAMPLE.COM SRV
```

### Check /etc/krb5.conf

```bash
# Verify the KDC is specified
grep -A5 "EXAMPLE.COM" /etc/krb5.conf

# If dns_lookup_kdc = false, the KDC must be explicitly listed
```

### Check Network Connectivity

```bash
# Verify the KDC is reachable on port 88
nc -zv kdc.example.com 88

# Check with both TCP and UDP
nc -zuv kdc.example.com 88
```

### Fix

Either add the KDC to `/etc/krb5.conf` or fix the DNS SRV records:

```ini
[realms]
  EXAMPLE.COM = {
    kdc = kdc.example.com
    admin_server = kdc.example.com
  }
```

Or enable DNS discovery:

```ini
[libdefaults]
  dns_lookup_kdc = true
```

## Problem: "Clock skew too great"

Kerberos requires clocks to be synchronized within 5 minutes (by default).

```bash
# Check the local time
timedatectl

# Check chrony sync status
chronyc tracking
chronyc sources

# Force an immediate time sync
sudo chronyc makestep

# If chrony is not running
sudo systemctl enable --now chronyd
```

If the system is consistently out of sync, configure chrony to use the KDC or AD DC as a time source:

```bash
sudo vi /etc/chrony.conf
# Add: server kdc.example.com iburst

sudo systemctl restart chronyd
```

## Problem: "Preauthentication failed"

This usually means the password is wrong or the account is locked.

```bash
# Try kinit with trace output to see the exact error
KRB5_TRACE=/dev/stderr kinit username@EXAMPLE.COM
```

### Possible Causes

- Wrong password
- Account locked in AD or IdM
- Account expired
- Password expired

### Check Account Status

For IdM:

```bash
kinit admin
ipa user-show username --all | grep -E "Account|Password|Locked"
```

For AD (from a Windows machine):

```powershell
Get-ADUser -Identity username -Properties LockedOut,Enabled,PasswordExpired
```

## Problem: "Key table entry not found"

The keytab does not contain the expected principal.

```bash
# List what is in the keytab
sudo klist -kt /etc/krb5.keytab

# Check if the expected principal is there
sudo klist -kt /etc/krb5.keytab | grep "host/"
```

### Fix

Re-generate or re-retrieve the keytab:

For IdM:

```bash
sudo ipa-getkeytab -s idm.example.com \
  -p host/$(hostname -f) \
  -k /etc/krb5.keytab
```

For a standalone KDC:

```bash
# On the KDC
kadmin.local: ktadd -k /tmp/host.keytab host/server.example.com
# Copy to the server
```

## Problem: "Ticket expired"

```bash
# Check ticket expiration
klist

# Renew the ticket (if renewable)
kinit -R

# If renewal fails, get a new ticket
kinit username@EXAMPLE.COM
```

### Adjust Ticket Lifetimes

If tickets expire too quickly:

```bash
# Request a longer ticket
kinit -l 48h username@EXAMPLE.COM

# Request a renewable ticket
kinit -r 7d username@EXAMPLE.COM
```

On the KDC side (for IdM):

```bash
# Adjust the ticket policy
ipa krbtpolicy-mod --maxlife=86400 --maxrenew=604800
```

## Problem: "Encryption type not supported"

Mismatch between the encryption types the client supports and what the KDC or keytab provides.

```bash
# Check what encryption types are in the keytab
sudo klist -kte /etc/krb5.keytab

# Check what encryption types the TGT uses
klist -e

# Enable trace to see which encryption type is being negotiated
KRB5_TRACE=/dev/stderr kinit username@EXAMPLE.COM
```

### Fix

Make sure the allowed encryption types match between client and KDC:

```ini
# In /etc/krb5.conf
[libdefaults]
  # Allow common encryption types
  permitted_enctypes = aes256-cts-hmac-sha1-96 aes128-cts-hmac-sha1-96
```

## Problem: "Server not found in Kerberos database"

The service principal does not exist in the KDC.

```bash
# Check what principal the client is trying to use
KRB5_TRACE=/dev/stderr ssh server.example.com 2>&1 | grep "Principal"

# Verify the principal exists
# For IdM:
ipa service-find

# For standalone KDC:
kadmin.local: listprincs | grep host/server
```

### Fix

Create the missing service principal:

```bash
# For IdM
ipa service-add host/server.example.com

# For standalone KDC
kadmin.local: addprinc -randkey host/server.example.com
kadmin.local: ktadd -k /tmp/server.keytab host/server.example.com
```

## Problem: Ticket Delegation Not Working

When SSH to a server and the ticket is not forwarded:

```bash
# Check if the ticket is forwardable
klist -f
# Look for the 'F' flag

# Get a forwardable ticket
kinit -f username@EXAMPLE.COM

# SSH with delegation
ssh -o GSSAPIDelegateCredentials=yes server.example.com

# On the remote server, check for the forwarded ticket
klist
```

Also verify in `/etc/krb5.conf`:

```ini
[libdefaults]
  forwardable = true
```

## Problem: Wrong Principal Name Used

Kerberos depends on DNS to construct principal names. If DNS is wrong, the wrong principal is used.

```bash
# Check what hostname the client resolves
host server.example.com

# Check reverse DNS
host 10.0.0.50

# If reverse DNS returns a different name, Kerberos uses that name
# Fix: either fix reverse DNS or disable rdns in krb5.conf
```

```ini
[libdefaults]
  rdns = false
```

## General Debugging Workflow

When you hit a Kerberos issue, follow this order:

1. **Check time sync**: `chronyc tracking`
2. **Check DNS**: `host` and `dig` for forward and reverse resolution
3. **Check connectivity**: `nc -zv kdc 88`
4. **Check the ticket**: `klist -f -e`
5. **Check the keytab**: `klist -kte /etc/krb5.keytab`
6. **Enable tracing**: `KRB5_TRACE=/dev/stderr kinit ...`
7. **Check logs**: `journalctl -u krb5kdc` (on the KDC)

This order catches the most common issues first (time and DNS) before moving to more obscure problems. Nine times out of ten, the problem is DNS or clock skew.
