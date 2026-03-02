# How to Set Up FreeIPA on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, FreeIPA, LDAP, Identity Management, Authentication

Description: Learn how to install and configure FreeIPA on Ubuntu for centralized identity management, including LDAP, Kerberos, DNS, and certificate authority setup.

---

FreeIPA is Red Hat's open-source identity management system that bundles LDAP (389 Directory Server), Kerberos, DNS, a certificate authority, and a web portal into one integrated package. It is the upstream project for Red Hat Identity Management. Running it on Ubuntu requires some extra steps because Fedora/RHEL is the primary target, but it is well-supported through the official Ubuntu packages.

This guide installs FreeIPA server on Ubuntu, enrolls a client machine, and walks through common administrative tasks.

## What FreeIPA Provides

- **LDAP directory** - centralized user and group storage
- **Kerberos** - single sign-on for SSH, web apps, and services
- **DNS** - integrated DNS with automatic SRV record management
- **Certificate Authority** - issue and manage TLS certificates for hosts and services
- **SUDO rules** - centralized sudo policy
- **Host-based access control (HBAC)** - control which users can log into which hosts

## Prerequisites

- Ubuntu 22.04 (FreeIPA packages are best-supported on 22.04)
- At least 2 GB RAM (4 GB recommended)
- A fully qualified domain name (FQDN) for the server
- Static IP address
- DNS that resolves the server's FQDN to its IP

This guide uses:
- Server FQDN: `ipa.example.com`
- Realm: `EXAMPLE.COM`
- Domain: `example.com`

## Setting Up the Hostname

```bash
# Set the server's hostname to its FQDN
sudo hostnamectl set-hostname ipa.example.com

# Verify
hostname -f
```

Add the server's IP to `/etc/hosts` so it resolves locally before DNS is configured:

```bash
sudo nano /etc/hosts
```

```
# Add this line (replace with your actual IP)
192.168.1.10   ipa.example.com ipa
```

## Installing FreeIPA Server

The `freeipa-server` package is available in Ubuntu's repositories:

```bash
sudo apt update
sudo apt install -y freeipa-server freeipa-server-dns
```

The `freeipa-server-dns` package adds integrated DNS support (BIND with FreeIPA integration).

## Running the Installer

The `ipa-server-install` command configures everything:

```bash
sudo ipa-server-install \
  --domain=example.com \
  --realm=EXAMPLE.COM \
  --ds-password="DirectoryManagerPassword" \
  --admin-password="AdminPassword" \
  --setup-dns \
  --no-forwarders \
  --unattended
```

Options explained:
- `--setup-dns` - configure integrated BIND DNS
- `--no-forwarders` - do not forward DNS queries (use external resolver)
- `--unattended` - non-interactive mode

For interactive setup (asks questions one by one):

```bash
sudo ipa-server-install
```

The installer takes 5-15 minutes. It sets up 389-ds, Kerberos KDC, and Dogtag CA.

## Verifying the Installation

```bash
# Check all FreeIPA services
sudo ipactl status

# Get a Kerberos ticket as admin
kinit admin

# Test the IPA CLI
ipa user-find admin
```

Access the web UI at `https://ipa.example.com`. Log in with the admin password.

## Firewall Configuration

```bash
# FreeIPA requires several ports
sudo ufw allow 80/tcp    # HTTP (redirects to HTTPS)
sudo ufw allow 443/tcp   # HTTPS web UI
sudo ufw allow 389/tcp   # LDAP
sudo ufw allow 636/tcp   # LDAPS
sudo ufw allow 88/tcp    # Kerberos
sudo ufw allow 88/udp    # Kerberos
sudo ufw allow 464/tcp   # Kerberos password change
sudo ufw allow 464/udp   # Kerberos password change
sudo ufw allow 53/tcp    # DNS
sudo ufw allow 53/udp    # DNS
sudo ufw allow 7389/tcp  # IPA-specific LDAP (dogtag)
sudo ufw enable
```

## Creating Users

```bash
# Authenticate as admin first
kinit admin

# Create a user
ipa user-add jsmith \
  --first=John \
  --last=Smith \
  --email=jsmith@example.com

# Set a temporary password (user will be prompted to change on first login)
ipa passwd jsmith

# Add user to a group
ipa group-add-member sysadmins --users=jsmith
```

## Creating Groups and SUDO Rules

```bash
# Create a group
ipa group-add sysadmins --desc="System administrators"

# Create a sudo rule allowing sysadmins to run all commands
ipa sudorule-add allow-sysadmin-all
ipa sudorule-add-option allow-sysadmin-all --sudooption='!authenticate'
ipa sudorule-add-user allow-sysadmin-all --groups=sysadmins
ipa sudorule-add-runasuser allow-sysadmin-all --users=root
ipa sudorule-add-command allow-sysadmin-all --sudocmds=ALL
```

## Host-Based Access Control

HBAC rules control which users can log into which hosts:

```bash
# Create an HBAC rule for sysadmins on web servers
ipa hbacrule-add allow-sysadmin-webservers
ipa hbacrule-add-user allow-sysadmin-webservers --groups=sysadmins
ipa hbacrule-add-host allow-sysadmin-webservers --hostgroups=webservers
ipa hbacrule-add-service allow-sysadmin-webservers --hbacsvcs=sshd
```

Disable the default `allow_all` rule to enforce HBAC:

```bash
ipa hbacrule-disable allow_all
```

## Enrolling a Client Machine

On a client Ubuntu machine:

```bash
# Install the client package
sudo apt install freeipa-client -y

# Enroll the client (point to the IPA server)
sudo ipa-client-install \
  --server=ipa.example.com \
  --domain=example.com \
  --realm=EXAMPLE.COM \
  --principal=admin \
  --password="AdminPassword" \
  --unattended
```

After enrollment, FreeIPA users can SSH into the client using their Kerberos credentials.

Test it:

```bash
# On the client, SSH as a FreeIPA user
ssh jsmith@client.example.com

# FreeIPA users get their home directory created automatically
# SUDO rules from FreeIPA apply immediately
```

## Configuring SSH Key Management

FreeIPA can store and distribute SSH public keys:

```bash
# Add an SSH key to a user
ipa user-mod jsmith --sshpubkey="$(cat ~/.ssh/id_ed25519.pub)"

# On enrolled clients, SSH uses FreeIPA for key lookup automatically
# No need to copy authorized_keys files
```

## Issuing Host Certificates

```bash
# Request a certificate for a service on an enrolled host
ipa cert-request --principal HTTP/webserver.example.com csr.pem

# Get the certificate
ipa cert-show <serial-number> --out webserver.pem
```

## Replication Setup

For high availability, add a second FreeIPA server:

On the second server (after installing `freeipa-server`):

```bash
sudo ipa-replica-install \
  --server=ipa.example.com \
  --domain=example.com \
  --realm=EXAMPLE.COM \
  --admin-password="AdminPassword" \
  --setup-dns \
  --unattended
```

## Backup and Recovery

```bash
# Full backup (includes all data and configuration)
sudo ipa-backup

# Backups go to /var/lib/ipa/backup/
ls /var/lib/ipa/backup/

# Restore from backup
sudo ipa-restore /var/lib/ipa/backup/ipa-full-2026-03-02-...
```

## Upgrading FreeIPA

```bash
sudo apt update && sudo apt upgrade freeipa-server
sudo ipa-server-upgrade
sudo ipactl restart
```

## Troubleshooting

**IPA services not starting:**
```bash
sudo ipactl status
sudo journalctl -u dirsrv@EXAMPLE-COM -n 50
sudo journalctl -u krb5kdc -n 50
```

**Kerberos authentication failing:**
```bash
# Verify realm and KDC
klist -e
kinit admin@EXAMPLE.COM
```

**Client cannot find KDC:**
```bash
# Check DNS SRV records from the client
dig _kerberos._tcp.example.com SRV
dig _ldap._tcp.example.com SRV
```

FreeIPA is a significant operational investment compared to simpler tools, but for organizations that need centralized authentication across many Linux hosts with fine-grained access control and auditability, it pays off. The combination of Kerberos SSO, centralized SSH key management, and HBAC policies is particularly powerful in regulated environments.
