# How to Join Ubuntu Server to an Active Directory Domain with SSSD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Active Directory, SSSD, Authentication, Domain Join

Description: Join an Ubuntu server to a Windows Active Directory domain using realm and SSSD for centralized authentication and Group Policy support.

---

Joining Ubuntu servers to Active Directory removes the need to maintain separate local accounts on each server. AD users can log in using their domain credentials, administrators get a single identity store, and you can apply consistent access policies across Linux and Windows systems.

The recommended method uses `realmd` to handle the join process and SSSD to handle ongoing authentication. This combination works with Active Directory 2008 R2 and newer.

## Prerequisites

- Ubuntu 22.04 or 24.04 LTS server
- Active Directory domain (e.g., `corp.example.com`)
- A domain controller reachable from the Ubuntu server
- DNS configured to use the domain controller (critical)
- An AD account with permission to join computers to the domain
- NTP synchronized with the domain (Kerberos requirement)

## Step 1: Configure DNS

The Ubuntu server must use the Active Directory domain controller as its DNS server. AD Kerberos authentication depends on proper DNS resolution.

```bash
# Check current DNS configuration
resolvectl status

# For Ubuntu 22.04+ with netplan
sudo nano /etc/netplan/01-network.yaml
```

```yaml
network:
  version: 2
  ethernets:
    ens3:
      dhcp4: false
      addresses:
        - 192.168.1.50/24
      gateway4: 192.168.1.1
      nameservers:
        addresses:
          - 192.168.1.10   # Primary DC
          - 192.168.1.11   # Secondary DC
        search:
          - corp.example.com
```

```bash
sudo netplan apply

# Verify DNS resolution of the domain
nslookup corp.example.com
host -t SRV _ldap._tcp.corp.example.com
```

If the SRV lookup returns domain controller records, DNS is correctly configured.

## Step 2: Synchronize Time with the Domain

```bash
sudo apt install -y chrony

# Configure chrony to use the DC as an NTP server
sudo nano /etc/chrony/chrony.conf
```

```text
# Use AD domain controller as NTP source
server corp.example.com iburst prefer
```

```bash
sudo systemctl restart chrony
chronyc tracking
```

The `System time offset` should be less than a few seconds.

## Step 3: Install Required Packages

```bash
sudo apt update
sudo apt install -y realmd sssd sssd-tools sssd-ad \
  adcli krb5-user packagekit libpam-sss libnss-sss \
  samba-common-bin oddjob oddjob-mkhomedir
```

When prompted for the Kerberos realm, enter `CORP.EXAMPLE.COM` (uppercase).

## Step 4: Discover the Domain

Before joining, discover the domain to verify connectivity:

```bash
realm discover corp.example.com
```

Expected output:

```text
corp.example.com
  type: kerberos
  realm-name: CORP.EXAMPLE.COM
  domain-name: corp.example.com
  configured: no
  server-software: active-directory
  client-software: sssd
  required-package: sssd-tools
  required-package: adcli
  required-package: realmd
  required-package: sssd
```

If this fails, check DNS and firewall connectivity to the domain controller.

## Step 5: Join the Domain

```bash
# Join using an AD administrator account
sudo realm join --user=Administrator corp.example.com

# Or using a dedicated computer-joining account
sudo realm join --user=linux-joiner corp.example.com

# Join and place the computer in a specific OU
sudo realm join --user=Administrator \
  --computer-ou="OU=LinuxServers,DC=corp,DC=example,DC=com" \
  corp.example.com
```

Enter the AD account password when prompted. If successful, the command returns silently.

## Step 6: Verify the Domain Join

```bash
# Confirm the machine is joined
realm list

# Check the computer account in AD
adcli info corp.example.com

# Test AD user lookup
id administrator@corp.example.com
# or without the domain if default_domain_suffix is set:
id administrator
```

## Step 7: Configure SSSD

`realmd` creates a basic `/etc/sssd/sssd.conf`. Review and customize it:

```bash
sudo nano /etc/sssd/sssd.conf
```

```ini
[sssd]
domains = corp.example.com
config_file_version = 2
services = nss, pam

[domain/corp.example.com]
# AD integration settings
ad_domain = corp.example.com
krb5_realm = CORP.EXAMPLE.COM
realmd_tags = manages-system joined-with-adcli

# Cache credentials for offline login
cache_credentials = True

# Use short names (user instead of user@corp.example.com)
use_fully_qualified_names = False
fallback_homedir = /home/%u@%d

# Login shell for AD users
default_shell = /bin/bash

# SSSD provider settings
id_provider = ad
auth_provider = ad
access_provider = ad
chpass_provider = ad

# Group membership lookup (tokenGroups is faster for AD)
ldap_id_mapping = True
ldap_schema = ad

# Filter out system accounts
ldap_user_extra_attrs = altSecurityIdentities:altSecurityIdentities
ldap_user_ssh_public_key = altSecurityIdentities
ad_gpo_access_control = disabled
```

```bash
sudo chmod 600 /etc/sssd/sssd.conf
sudo systemctl restart sssd
```

## Step 8: Configure PAM for Home Directory Creation

When an AD user logs in for the first time, their home directory needs to be created:

```bash
# Enable mkhomedir PAM module
sudo pam-auth-update --enable mkhomedir
```

This adds `pam_mkhomedir.so` to `/etc/pam.d/common-session`.

Alternatively, enable it via oddjobd:

```bash
sudo systemctl enable --now oddjobd
```

## Step 9: Configure sudo Access for AD Users or Groups

```bash
sudo visudo
```

```text
# Grant sudo to a specific AD user
jsmith@corp.example.com ALL=(ALL) ALL

# Grant sudo to an AD group (use % for groups)
%domain\ admins@corp.example.com ALL=(ALL) ALL

# With short names (if use_fully_qualified_names = False)
%LinuxAdmins ALL=(ALL) NOPASSWD: ALL
```

Or use `/etc/sudoers.d/`:

```bash
sudo nano /etc/sudoers.d/ad-groups
```

```text
# Allow Domain Admins group full sudo access
%domain\ admins ALL=(ALL:ALL) ALL
```

## Step 10: Test AD Authentication

```bash
# Look up an AD user
id jsmith

# Test login via SSH (from another machine)
ssh jsmith@ubuntu-server.corp.example.com

# Test su
su - jsmith

# Verify group membership
groups jsmith
```

## Restricting Access to Specific AD Groups

By default, all AD users can attempt to log in. Restrict this:

```bash
# Allow only specific AD groups
sudo realm permit --groups "LinuxAdmins" "DevOps"

# Or allow only specific users
sudo realm permit jsmith@corp.example.com

# Deny all (then selectively permit)
sudo realm deny --all
sudo realm permit --groups "LinuxAdmins"
```

This sets `access_provider = simple` in SSSD and configures `simple_allow_groups`.

## Offline Authentication

With `cache_credentials = True`, users who have logged in at least once can authenticate even when the DC is unreachable:

```bash
# Clear SSSD cache (forces re-authentication against DC)
sudo sss_cache -E

# View cached user info
sudo sss_cache -u jsmith
```

## Leaving the Domain

```bash
# Leave the domain cleanly (removes computer account from AD)
sudo realm leave corp.example.com

# Force leave if DC is unreachable
sudo realm leave --remove corp.example.com
```

## Troubleshooting

**"realm: Couldn't join realm"** - verify DNS, NTP, and that the joining account has computer-join permissions in AD.

**AD users not found** - check `sssd.conf` is valid and restart SSSD: `sudo systemctl restart sssd`

**Home directory not created** - verify `pam_mkhomedir` is enabled: `grep mkhomedir /etc/pam.d/common-session`

**SSSD logs:**

```bash
# Enable verbose logging
sudo nano /etc/sssd/sssd.conf
# Add: debug_level = 7 under [domain/corp.example.com]

sudo systemctl restart sssd
sudo journalctl -u sssd -f
sudo tail -f /var/log/sssd/sssd_corp.example.com.log
```

With a successful domain join, Ubuntu servers become first-class members of your Active Directory environment, with centralized authentication, access control, and credential management.
