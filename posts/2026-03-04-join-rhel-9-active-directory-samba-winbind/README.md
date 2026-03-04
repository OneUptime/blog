# How to Join RHEL to Active Directory Using Samba Winbind

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Active Directory, Samba, Winbind, Linux

Description: A practical guide to joining RHEL to Active Directory using Samba Winbind instead of SSSD, covering configuration, ID mapping, and use cases where Winbind is the better choice.

---

SSSD is the default and recommended approach for AD integration on RHEL, but there are situations where Samba Winbind is the better fit. If you need to run Samba file shares that integrate with AD permissions, or if you have a specific requirement for RID-based ID mapping that works differently from SSSD, Winbind is the way to go. This guide walks through the complete setup.

## When to Use Winbind Instead of SSSD

| Feature | SSSD | Winbind |
|---------|------|---------|
| AD authentication | Yes | Yes |
| Offline caching | Yes | Limited |
| Samba file sharing with AD ACLs | No | Yes |
| GPO enforcement | Yes | No |
| Smart card support | Yes | No |
| sudo rule integration | Yes | Basic |

Use Winbind when your primary goal is running Samba file servers that need tight AD integration. Use SSSD for everything else.

## Step 1 - Install Required Packages

```bash
# Install Samba, Winbind, and related tools
sudo dnf install samba samba-winbind samba-winbind-clients \
  samba-common-tools krb5-workstation oddjob oddjob-mkhomedir -y
```

## Step 2 - Configure Kerberos

Set up the Kerberos client configuration.

```bash
# Edit krb5.conf
sudo vi /etc/krb5.conf
```

Configure it for your AD domain:

```ini
[libdefaults]
  default_realm = EXAMPLE.COM
  dns_lookup_realm = true
  dns_lookup_kdc = true
  ticket_lifetime = 24h
  renew_lifetime = 7d
  forwardable = true
  rdns = false

[realms]
  EXAMPLE.COM = {
    kdc = dc1.example.com
    admin_server = dc1.example.com
  }

[domain_realm]
  .example.com = EXAMPLE.COM
  example.com = EXAMPLE.COM
```

Test Kerberos:

```bash
# Get a ticket to verify Kerberos works
kinit Administrator@EXAMPLE.COM
klist
```

## Step 3 - Configure Samba

Edit the Samba configuration file.

```bash
sudo vi /etc/samba/smb.conf
```

Replace the contents with:

```ini
[global]
  workgroup = EXAMPLE
  realm = EXAMPLE.COM
  security = ads

  # ID mapping configuration
  idmap config * : backend = tdb
  idmap config * : range = 10000-19999

  idmap config EXAMPLE : backend = rid
  idmap config EXAMPLE : range = 200000-2999999

  # Winbind settings
  winbind use default domain = yes
  winbind enum users = no
  winbind enum groups = no
  winbind refresh tickets = yes
  winbind offline logon = yes

  # Template settings for AD users
  template shell = /bin/bash
  template homedir = /home/%U

  # Kerberos method
  kerberos method = secrets and keytab
```

Key settings explained:
- `idmap config EXAMPLE : backend = rid` maps AD RIDs to POSIX UIDs algorithmically
- `winbind use default domain = yes` allows users to log in without the domain prefix
- `winbind enum users/groups = no` prevents Winbind from enumerating all users and groups (important for performance)

## Step 4 - Join the Domain

```bash
# Join the AD domain using net ads
sudo net ads join -U Administrator

# You will be prompted for the Administrator password
```

Verify the join:

```bash
# Check domain membership
sudo net ads testjoin
# Expected output: Join is OK

# Check domain info
sudo net ads info
```

## Step 5 - Configure NSS and PAM

Tell the system to use Winbind for user and group lookups.

```bash
# Select the winbind authselect profile
sudo authselect select winbind with-mkhomedir --force
```

This configures NSS to look up users and groups through Winbind and PAM to authenticate through Winbind.

## Step 6 - Start Winbind

```bash
# Enable and start the Winbind service
sudo systemctl enable --now winbind

# Also start oddjobd for home directory creation
sudo systemctl enable --now oddjobd

# Verify Winbind is running
sudo systemctl status winbind
```

## Step 7 - Verify the Configuration

```bash
# Test user lookup
wbinfo -u | head -5

# Test group lookup
wbinfo -g | head -5

# Look up a specific user
wbinfo -i aduser

# Test authentication
wbinfo -a aduser%password

# Check ID mapping
wbinfo --sid-to-uid=S-1-5-21-xxx-yyy-zzz-1105

# Test with standard Linux tools
id aduser
getent passwd aduser
```

## Step 8 - Test Login

```bash
# Test local login
su - aduser

# Verify home directory was created
pwd
ls -la ~

# Test SSH (if SSH is configured)
ssh aduser@localhost
```

## ID Mapping Backends

Winbind supports several ID mapping backends. Choose based on your needs.

### RID Backend (Default in Our Config)

Maps AD RIDs to POSIX UIDs algorithmically. Simple and consistent across machines with the same configuration.

```ini
idmap config EXAMPLE : backend = rid
idmap config EXAMPLE : range = 200000-2999999
```

### AD Backend

Reads POSIX attributes (uidNumber, gidNumber) directly from AD. Requires POSIX attributes to be populated in AD.

```ini
idmap config EXAMPLE : backend = ad
idmap config EXAMPLE : range = 10000-999999
idmap config EXAMPLE : schema_mode = rfc2307
```

### Autorid Backend

Automatically allocates IDs from a range. Good for multi-domain environments.

```ini
idmap config * : backend = autorid
idmap config * : range = 10000-9999999
idmap config * : rangesize = 1000000
```

## Setting Up Samba File Shares with AD Permissions

This is where Winbind really shines. You can create file shares that use AD users and groups for permissions.

```bash
# Create a shared directory
sudo mkdir -p /srv/samba/shared
sudo chown root:"domain users" /srv/samba/shared
sudo chmod 2775 /srv/samba/shared
```

Add the share to smb.conf:

```ini
[shared]
  path = /srv/samba/shared
  read only = no
  valid users = @"EXAMPLE\Domain Users"
  write list = @"EXAMPLE\IT Department"
  create mask = 0660
  directory mask = 0770
```

```bash
# Restart Samba to apply
sudo systemctl restart smb

# Test the share
smbclient //localhost/shared -U aduser
```

## Troubleshooting

### Winbind Cannot Contact the DC

```bash
# Check DNS
host example.com
dig _ldap._tcp.example.com SRV

# Check Kerberos
kinit Administrator@EXAMPLE.COM

# Check Samba configuration
testparm
```

### User Lookup Returns Nothing

```bash
# Check Winbind status
wbinfo -p

# Check the Winbind log
sudo tail -f /var/log/samba/log.winbindd

# Restart Winbind
sudo systemctl restart winbind
```

### ID Mapping Inconsistencies

```bash
# Clear the Winbind ID mapping cache
sudo net cache flush

# Restart Winbind
sudo systemctl restart winbind
```

Winbind is a solid choice when you need Samba file sharing with AD integration. For pure authentication without file sharing, SSSD is generally easier to manage. If you need both, you can run Samba with Winbind for file sharing and SSSD for system authentication, but that adds complexity. In most cases, pick one approach and commit to it.
