# How to Set Up Samba as an Active Directory Domain Controller on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Samba, Active Directory, Domain Controller, Windows

Description: Provision Samba as a full Active Directory Domain Controller on Ubuntu to manage Windows domain authentication without Windows Server licenses.

---

Samba 4 includes a complete implementation of Active Directory Domain Services. This means you can run a fully functional Windows Active Directory domain controller on Ubuntu, with support for Group Policy, Kerberos, LDAP, DNS, and Windows domain authentication - all without a Windows Server license.

This is a significant undertaking and differs considerably from the classic Samba 3 member server setup. The Samba AD DC mode replaces the OpenLDAP backend with Samba's internal directory and cannot coexist with MIT Kerberos or OpenLDAP on the same machine.

## When to Use Samba AD DC

- Small to medium organizations wanting AD functionality without Windows Server costs
- Mixed Linux/Windows environments that need centralized authentication
- Lab and development environments needing AD for testing

## Prerequisites

- Ubuntu 22.04 LTS (clean installation recommended)
- Static IP address
- Resolvable hostname
- At minimum 2 GB RAM and 20 GB disk
- No OpenLDAP, MIT Kerberos, or existing Samba installations
- A domain name (e.g., `corp.example.com`) - you will own this as your AD domain

**Important**: This process creates a new AD domain. Joining an existing AD domain is different (use `realm join`).

## Step 1: Prepare the System

```bash
# Set a static IP (example using netplan)
sudo nano /etc/netplan/01-network.yaml
```

```yaml
network:
  version: 2
  ethernets:
    ens3:
      dhcp4: false
      addresses:
        - 192.168.1.10/24
      gateway4: 192.168.1.1
      nameservers:
        addresses:
          - 127.0.0.1    # The DC will be its own DNS server
          - 8.8.8.8      # Fallback for external resolution
        search:
          - corp.example.com
```

```bash
sudo netplan apply
```

Set a proper hostname:

```bash
sudo hostnamectl set-hostname dc1.corp.example.com
```

Update `/etc/hosts`:

```bash
sudo nano /etc/hosts
```

```
127.0.0.1       localhost
192.168.1.10    dc1.corp.example.com dc1
```

**Do not** have the Samba DC's own IP pointing to itself in `/etc/hosts` for the FQDN - use the actual IP.

## Step 2: Install Samba

```bash
sudo apt update
sudo apt install -y samba samba-dsdb-modules samba-vfs-modules \
  krb5-user winbind libnss-winbind libpam-winbind \
  dnsutils acl
```

When prompted for the Kerberos realm, enter `CORP.EXAMPLE.COM`.

## Step 3: Stop and Disable Conflicting Services

```bash
# Stop all existing Samba and related services
sudo systemctl stop samba-ad-dc smbd nmbd winbind 2>/dev/null || true
sudo systemctl disable samba-ad-dc smbd nmbd winbind 2>/dev/null || true

# Remove existing Samba configuration (back it up first)
sudo mv /etc/samba/smb.conf /etc/samba/smb.conf.backup

# Remove existing Samba database files
sudo find /var/lib/samba -name "*.tdb" -delete
sudo find /var/lib/samba -name "*.ldb" -delete
sudo rm -rf /var/lib/samba/private
```

## Step 4: Provision the Domain

```bash
sudo samba-tool domain provision \
  --use-rfc2307 \
  --realm=CORP.EXAMPLE.COM \
  --domain=CORP \
  --server-role=dc \
  --dns-backend=SAMBA_INTERNAL \
  --adminpass='AdminPassword123!'
```

Parameters:
- `--use-rfc2307` - store POSIX attributes (UID, GID) in AD for Linux clients
- `--realm` - Kerberos realm (uppercase FQDN)
- `--domain` - NetBIOS domain name (short name)
- `--dns-backend=SAMBA_INTERNAL` - use Samba's built-in DNS (recommended)
- `--adminpass` - initial Administrator password (must meet complexity requirements)

Expected output:

```
Once the smb.conf is updated, you can use these commands to check the DC:
  host -t SRV _ldap._tcp.corp.example.com.
  host -t SRV _kerberos._udp.corp.example.com.
  host -t A dc1.corp.example.com.
```

## Step 5: Configure Kerberos

The provisioning creates a Kerberos config. Link or copy it:

```bash
sudo cp /var/lib/samba/private/krb5.conf /etc/krb5.conf
```

## Step 6: Configure DNS

Samba's internal DNS needs to be the resolver for the domain. Update `/etc/resolv.conf`:

```bash
sudo nano /etc/resolv.conf
```

```
nameserver 127.0.0.1
search corp.example.com
```

On Ubuntu 22.04 with `systemd-resolved`, disable it first:

```bash
sudo systemctl disable --now systemd-resolved
sudo rm /etc/resolv.conf
sudo nano /etc/resolv.conf
# Add the lines above
```

## Step 7: Start the Samba AD DC Service

```bash
sudo systemctl unmask samba-ad-dc
sudo systemctl enable samba-ad-dc
sudo systemctl start samba-ad-dc
sudo systemctl status samba-ad-dc
```

## Step 8: Verify the Domain Controller

```bash
# Test DNS SRV records (critical for clients to find the DC)
host -t SRV _ldap._tcp.corp.example.com
host -t SRV _kerberos._udp.corp.example.com
host -t A dc1.corp.example.com

# Verify Kerberos authentication
kinit administrator@CORP.EXAMPLE.COM
klist

# Test LDAP connectivity
ldapsearch -H ldap://localhost \
  -b "DC=corp,DC=example,DC=com" \
  -D "CN=Administrator,CN=Users,DC=corp,DC=example,DC=com" \
  -w 'AdminPassword123!' \
  "(objectClass=user)" sAMAccountName

# List domain information
sudo samba-tool domain info 127.0.0.1

# Check the DC is functioning
sudo samba-tool fsmo show
```

## Step 9: Firewall Configuration

```bash
sudo ufw allow 53/tcp    # DNS
sudo ufw allow 53/udp    # DNS
sudo ufw allow 88/tcp    # Kerberos
sudo ufw allow 88/udp    # Kerberos
sudo ufw allow 135/tcp   # RPC endpoint mapper
sudo ufw allow 139/tcp   # NetBIOS
sudo ufw allow 389/tcp   # LDAP
sudo ufw allow 389/udp   # LDAP
sudo ufw allow 445/tcp   # SMB
sudo ufw allow 464/tcp   # kpasswd
sudo ufw allow 464/udp   # kpasswd
sudo ufw allow 636/tcp   # LDAPS
sudo ufw allow 3268/tcp  # Global Catalog
sudo ufw allow 3269/tcp  # Global Catalog SSL
sudo ufw allow 49152:65535/tcp  # Dynamic RPC
```

## Managing Users with samba-tool

```bash
# Add a new user
sudo samba-tool user add jsmith \
  --given-name="John" \
  --surname="Smith" \
  --mail-address="jsmith@corp.example.com" \
  --login-shell="/bin/bash" \
  --uid-number=10001 \
  --gid-number=10001 \
  --home-directory=/home/jsmith

# Reset a password
sudo samba-tool user setpassword jsmith

# List all users
sudo samba-tool user list

# Disable an account
sudo samba-tool user disable jsmith

# Add a user to a group
sudo samba-tool group addmembers "Domain Admins" jsmith

# List groups
sudo samba-tool group list
```

## Joining Windows Clients to the Domain

From a Windows machine (ensure DNS is pointing to `192.168.1.10`):

```cmd
# PowerShell - join the domain
Add-Computer -DomainName corp.example.com -Credential corp\Administrator

# Or via System Properties -> Computer Name -> Change
# Domain: corp.example.com
```

## Joining Linux Clients

On other Ubuntu machines, use `realm join`:

```bash
# Install required packages
sudo apt install -y realmd sssd adcli

# Join the domain
sudo realm join --user=Administrator corp.example.com
```

## Adding a Second DC (Replication)

For redundancy, add a second Ubuntu server as an additional DC:

```bash
# On the second server, install Samba
# Then join as a DC (not provision - this replicates from the first DC)
sudo samba-tool domain join corp.example.com DC \
  -U "CORP\administrator" \
  --dns-backend=SAMBA_INTERNAL
```

## Backup

Back up the Samba AD DC regularly:

```bash
# Back up the Samba configuration and database
sudo samba-tool domain backup online \
  --targetdir=/backup/samba \
  --server=dc1.corp.example.com \
  -U administrator

# The backup includes everything needed to restore
```

## Troubleshooting

**Samba-ad-dc fails to start** - check journal logs: `sudo journalctl -u samba-ad-dc -n 50`. Often caused by DNS resolution issues or leftover database files.

**kinit fails for administrator** - verify Kerberos config was copied from Samba's private directory and `/etc/resolv.conf` points to `127.0.0.1`.

**Windows clients cannot join** - verify DNS SRV records with `host -t SRV _ldap._tcp.corp.example.com`. Windows client DNS must point to the Samba DC.

Running Samba as an AD DC requires ongoing maintenance - keep Samba updated, monitor replication if running multiple DCs, and test backup/restore procedures regularly.
