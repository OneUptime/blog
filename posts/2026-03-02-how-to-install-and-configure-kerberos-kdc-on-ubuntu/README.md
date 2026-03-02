# How to Install and Configure Kerberos KDC on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Kerberos, Authentication, Security, KDC

Description: Install and configure a Kerberos Key Distribution Center (KDC) on Ubuntu Server for network authentication and single sign-on capabilities.

---

Kerberos is a network authentication protocol that uses tickets rather than passwords. When a user authenticates, the Key Distribution Center (KDC) issues a Ticket Granting Ticket (TGT), which is then used to obtain service tickets for individual services. The password never travels over the network, making Kerberos significantly more secure than password-based authentication for enterprise environments.

MIT Kerberos is the standard implementation on Ubuntu. This guide walks through setting up a complete KDC, creating a realm, and issuing your first tickets.

## Kerberos Terminology

Before starting, understand these key terms:

- **Realm** - the administrative domain, written in uppercase (e.g., `EXAMPLE.COM`)
- **Principal** - an identity in Kerberos, written as `name@REALM` or `service/host@REALM`
- **KDC** - the authentication server that issues tickets
- **TGT** - Ticket Granting Ticket, obtained after initial login
- **Service ticket** - ticket authorizing access to a specific service
- **Keytab** - a file containing encrypted principal credentials, used by services

## Prerequisites

- Ubuntu 22.04 or 24.04 server
- A resolvable hostname (DNS must work - Kerberos is sensitive to hostname resolution)
- NTP/chronyd running (Kerberos requires clocks synchronized within 5 minutes)
- Root/sudo access

## Step 1: Configure DNS and Hostname

Kerberos requires working forward and reverse DNS resolution:

```bash
# Set your hostname
sudo hostnamectl set-hostname kdc.example.com

# Verify
hostname -f
# Should return: kdc.example.com

# Verify NTP is working
timedatectl status | grep -E "synchronized|NTP"
```

If DNS is not available, add entries to `/etc/hosts`:

```bash
sudo nano /etc/hosts
# Add:
# 192.168.1.10  kdc.example.com kdc
```

## Step 2: Install Kerberos Packages

```bash
sudo apt update
sudo apt install -y krb5-kdc krb5-admin-server krb5-config
```

During installation, you will be prompted:
- **Default Kerberos version 5 realm** - enter `EXAMPLE.COM` (must match your domain, uppercase)
- **Kerberos servers** - `kdc.example.com`
- **Administrative server** - `kdc.example.com`

These settings are written to `/etc/krb5.conf`.

## Step 3: Configure krb5.conf

Review and adjust the Kerberos configuration:

```bash
sudo nano /etc/krb5.conf
```

```ini
[libdefaults]
    # Default realm (must be uppercase)
    default_realm = EXAMPLE.COM

    # Enable DNS lookup for KDC addresses
    dns_lookup_realm = false
    dns_lookup_kdc = false

    # Ticket lifetime defaults
    ticket_lifetime = 24h
    renew_lifetime = 7d
    forwardable = true

    # Encryption types (modern defaults)
    default_tkt_enctypes = aes256-cts-hmac-sha1-96 aes128-cts-hmac-sha1-96
    default_tgs_enctypes = aes256-cts-hmac-sha1-96 aes128-cts-hmac-sha1-96
    permitted_enctypes = aes256-cts-hmac-sha1-96 aes128-cts-hmac-sha1-96

[realms]
    EXAMPLE.COM = {
        # KDC address
        kdc = kdc.example.com
        # Admin server address
        admin_server = kdc.example.com
    }

[domain_realm]
    # Map DNS domains to Kerberos realms
    .example.com = EXAMPLE.COM
    example.com = EXAMPLE.COM

[logging]
    # Log to syslog and a dedicated file
    default = FILE:/var/log/krb5libs.log
    kdc = FILE:/var/log/krb5kdc.log
    admin_server = FILE:/var/log/kadmind.log
```

## Step 4: Create the Kerberos Database

The KDC stores all principals in a database. Initialize it with a master password:

```bash
sudo krb5_newrealm
```

You will be prompted for a master key password. This password encrypts the entire KDC database - store it securely. The database files are stored in `/var/lib/krb5kdc/`.

## Step 5: Configure kadm5.acl

The `kadm5.acl` file controls who can administer the KDC remotely:

```bash
sudo nano /etc/krb5kdc/kadm5.acl
```

```
# Grant full admin rights to principals ending in /admin
*/admin@EXAMPLE.COM    *
```

The `*` privilege grants all capabilities (add, modify, delete, inquire, etc.).

## Step 6: Start KDC Services

```bash
sudo systemctl enable krb5-kdc krb5-admin-server
sudo systemctl start krb5-kdc krb5-admin-server
sudo systemctl status krb5-kdc krb5-admin-server
```

Verify the KDC is listening:

```bash
sudo ss -tlnup | grep kdc
# Should show port 88 (Kerberos) and 749 (kadmind)
```

## Step 7: Create Principals

Use `kadmin.local` (runs locally, no need to authenticate) to create principals:

```bash
sudo kadmin.local
```

In the kadmin prompt:

```
# Create the admin principal
kadmin.local: addprinc admin/admin
# Enter and confirm password

# Create a user principal
kadmin.local: addprinc jsmith
# Enter and confirm password

# Create a host principal for the KDC itself
kadmin.local: addprinc -randkey host/kdc.example.com

# List all principals
kadmin.local: listprincs

# Exit
kadmin.local: quit
```

## Step 8: Create a Keytab for the Host

Service principals use keytabs instead of interactive passwords:

```bash
sudo kadmin.local -q "ktadd host/kdc.example.com"
```

This writes the credentials to `/etc/krb5.keytab`.

## Step 9: Test Kerberos Authentication

```bash
# Request a ticket for jsmith
kinit jsmith
# Enter password

# Verify the ticket
klist
# Output shows TGT with expiry time

# Test using the ticket
kvno host/kdc.example.com

# Destroy the ticket when done
kdestroy
```

If `kinit` succeeds and `klist` shows a valid ticket, the KDC is working.

## Firewall Configuration

```bash
# Allow Kerberos traffic
sudo ufw allow 88/tcp
sudo ufw allow 88/udp
sudo ufw allow 749/tcp   # kadmind
sudo ufw allow 464/tcp   # kpasswd
sudo ufw allow 464/udp

# Restrict to internal network if possible
sudo ufw allow from 192.168.1.0/24 to any port 88
```

## Managing Principals with kadmin

Remote administration (from a client with Kerberos installed):

```bash
# Authenticate as admin principal
kinit admin/admin

# Open remote kadmin session
kadmin

# Common operations in kadmin:
kadmin: addprinc newuser            # Add user
kadmin: modprinc -maxlife 12h jsmith  # Modify ticket lifetime
kadmin: cpw jsmith                  # Change password
kadmin: delprinc olduser            # Delete principal
kadmin: getprinc jsmith             # Show principal details
kadmin: listprincs                  # List all principals
```

## KDC Database Maintenance

```bash
# Back up the KDC database
sudo kdb5_util dump /backup/krb5db-$(date +%F).dump

# Load from backup (on a new KDC)
sudo kdb5_util load /backup/krb5db-2026-03-01.dump

# Stash the master key for automatic startup
sudo kdb5_util stash
```

## Configuring DNS SRV Records

For automatic KDC discovery via DNS, add SRV records:

```dns
_kerberos._tcp.example.com.    IN SRV 0 0 88  kdc.example.com.
_kerberos._udp.example.com.    IN SRV 0 0 88  kdc.example.com.
_kerberos-adm._tcp.example.com. IN SRV 0 0 749 kdc.example.com.
_kpasswd._tcp.example.com.     IN SRV 0 0 464 kdc.example.com.
_kpasswd._udp.example.com.     IN SRV 0 0 464 kdc.example.com.
```

With SRV records, set `dns_lookup_kdc = true` in `krb5.conf` and clients will find the KDC automatically.

## Troubleshooting

**"kinit: Cannot find KDC for realm EXAMPLE.COM"** - check `krb5.conf` realm configuration and verify the KDC is reachable on port 88.

**"Clock skew too great"** - clocks differ by more than 5 minutes. Fix NTP synchronization on both client and server.

**"UNKNOWN (principal is not found)"** - the principal does not exist. Use `kadmin.local` to verify with `listprincs`.

**KDC not starting** - check the database was initialized: `ls /var/lib/krb5kdc/`. If empty, run `sudo krb5_newrealm` again.

With the KDC running and your first principals created, you can now configure Kerberos client authentication on other Ubuntu machines, integrate with services like SSH, and optionally integrate with OpenLDAP for a complete enterprise authentication stack.
