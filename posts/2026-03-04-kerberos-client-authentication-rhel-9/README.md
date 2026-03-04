# How to Set Up Kerberos Client Authentication on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Kerberos, Client, Authentication, Linux

Description: A practical guide to configuring RHEL 9 systems as Kerberos clients, covering krb5.conf setup, ticket management, keytab configuration, and PAM integration.

---

Configuring a RHEL 9 system as a Kerberos client means setting it up to authenticate users and services against a Kerberos KDC. Whether your KDC is a standalone MIT Kerberos server, FreeIPA, or Active Directory, the client-side configuration follows the same pattern. This guide covers the full setup.

## Step 1 - Install Kerberos Client Packages

```bash
# Install the Kerberos client workstation tools
sudo dnf install krb5-workstation -y

# This provides: kinit, klist, kdestroy, kvno, and other tools
```

## Step 2 - Configure krb5.conf

The central configuration file for Kerberos clients is `/etc/krb5.conf`.

```bash
sudo vi /etc/krb5.conf
```

```ini
[libdefaults]
  default_realm = EXAMPLE.COM
  dns_lookup_realm = true
  dns_lookup_kdc = true
  ticket_lifetime = 24h
  renew_lifetime = 7d
  forwardable = true
  rdns = false
  default_ccache_name = KCM:

[realms]
  EXAMPLE.COM = {
    kdc = kdc.example.com
    admin_server = kdc.example.com
  }

[domain_realm]
  .example.com = EXAMPLE.COM
  example.com = EXAMPLE.COM
```

If DNS SRV records are properly configured for your realm, you can simplify this to just the `[libdefaults]` section with `dns_lookup_kdc = true`.

## Step 3 - Test Basic Authentication

```bash
# Get a Kerberos ticket
kinit jsmith@EXAMPLE.COM

# List tickets in the cache
klist

# Check ticket flags
klist -f

# Get a ticket with a specific lifetime
kinit -l 12h jsmith@EXAMPLE.COM

# Get a renewable ticket
kinit -r 7d jsmith@EXAMPLE.COM
```

## Step 4 - Set Up the Host Keytab

For services to authenticate using Kerberos, the host needs a keytab file containing the host principal's key.

```bash
# Request a keytab from the KDC admin
# (This is done by the KDC administrator)
# On the KDC:
# kadmin.local: addprinc -randkey host/client.example.com
# kadmin.local: ktadd -k /tmp/client.keytab host/client.example.com

# Copy the keytab to the client
sudo scp admin@kdc.example.com:/tmp/client.keytab /etc/krb5.keytab

# Set proper permissions
sudo chmod 600 /etc/krb5.keytab
sudo chown root:root /etc/krb5.keytab

# Verify the keytab
sudo klist -kt /etc/krb5.keytab
```

If using FreeIPA, the keytab is created automatically during `ipa-client-install`.

## Step 5 - Configure PAM for Kerberos

To use Kerberos for system login (console, SSH, etc.), configure PAM.

The easiest way is through authselect with SSSD:

```bash
# Install SSSD
sudo dnf install sssd -y

# Configure SSSD for Kerberos authentication
sudo vi /etc/sssd/sssd.conf
```

```ini
[sssd]
services = nss, pam
domains = example
config_file_version = 2

[domain/example]
id_provider = files
auth_provider = krb5
krb5_server = kdc.example.com
krb5_realm = EXAMPLE.COM
krb5_keytab = /etc/krb5.keytab
cache_credentials = True
```

```bash
sudo chmod 600 /etc/sssd/sssd.conf
sudo authselect select sssd --force
sudo systemctl enable --now sssd
```

Alternatively, for direct PAM/Kerberos integration without SSSD:

```bash
# Install pam_krb5
sudo dnf install pam_krb5 -y
```

Note: SSSD is the recommended approach on RHEL 9 for most scenarios.

## Step 6 - Manage Kerberos Tickets

### Renew a Ticket

```bash
# Renew the current ticket
kinit -R

# Check the new expiration
klist
```

### Destroy Tickets

```bash
# Destroy the current ticket cache
kdestroy

# Destroy all ticket caches
kdestroy -A
```

### Request a Service Ticket

```bash
# Request a service ticket for a specific service
kvno host/server.example.com@EXAMPLE.COM

# The service ticket now appears in klist
klist
```

### Forward a Ticket

When you SSH to a server and want your credentials to follow you:

```bash
# SSH with ticket forwarding
ssh -o GSSAPIDelegateCredentials=yes server.example.com

# On the remote server, verify you have a forwarded ticket
klist
```

## Step 7 - Configure the KCM Credential Cache

RHEL 9 supports the KCM (Kerberos Credential Manager) cache, which is managed by sssd-kcm. This provides persistent credential storage that survives logouts.

```bash
# Install sssd-kcm
sudo dnf install sssd-kcm -y

# Enable the KCM socket
sudo systemctl enable --now sssd-kcm.socket
```

Verify KCM is being used:

```bash
# Check the credential cache type
klist
# The output should show "KCM:1000" or similar
```

## Troubleshooting

### Cannot Find KDC

```bash
# Check DNS SRV records
dig _kerberos._tcp.example.com SRV
dig _kerberos._udp.example.com SRV

# Check if the KDC is reachable
nc -zv kdc.example.com 88
```

### Clock Skew Too Great

```bash
# Check the time difference
timedatectl

# Force time sync
sudo chronyc makestep
```

### Keytab Issues

```bash
# Verify the keytab is valid
sudo klist -kte /etc/krb5.keytab

# Test authentication with the keytab
sudo kinit -k -t /etc/krb5.keytab host/client.example.com
```

### Trace Kerberos Operations

```bash
# Enable tracing for detailed debugging
KRB5_TRACE=/dev/stderr kinit jsmith@EXAMPLE.COM
```

### Check Encryption Types

```bash
# List supported encryption types
klist -e

# Check the keytab encryption types
klist -kte /etc/krb5.keytab
```

## Multiple Realms

If your system needs to authenticate against multiple Kerberos realms:

```ini
[libdefaults]
  default_realm = EXAMPLE.COM

[realms]
  EXAMPLE.COM = {
    kdc = kdc.example.com
  }
  OTHER.COM = {
    kdc = kdc.other.com
  }

[domain_realm]
  .example.com = EXAMPLE.COM
  .other.com = OTHER.COM
```

```bash
# Get a ticket for a non-default realm
kinit jsmith@OTHER.COM
```

Kerberos client configuration on RHEL 9 is straightforward. The main things to get right are the realm name in krb5.conf, DNS or explicit KDC addresses, time synchronization, and the keytab for service authentication. Once those are in place, ticket-based SSO just works.
