# How to Configure Samba Winbind for User Mapping on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Samba, Active Directory, Winbind, Authentication

Description: Configure Samba Winbind on Ubuntu to map Active Directory users and groups to local Unix UIDs and GIDs, enabling seamless file permissions on Samba shares joined to a Windows domain.

---

Winbind is a component of the Samba suite that bridges Active Directory (or NT domain) user accounts with the local Linux user database. Without Winbind, a Linux server joined to a domain cannot resolve AD usernames to UIDs or AD groups to GIDs - which means filesystem permissions cannot work correctly for domain users. Winbind solves this by providing a Name Service Switch (NSS) plugin and a PAM module.

## What Winbind Does

When a domain user connects to a Samba share, Samba needs to map that user's Windows SID to a local Unix UID so it can enforce filesystem permissions. Winbind does this mapping in one of two ways:

- **Algorithmic mapping (idmap_rid):** UID/GID values are calculated mathematically from the user's RID in Active Directory. The same user always gets the same UID.
- **Database mapping (idmap_tdb or idmap_ad):** Winbind maintains a local database mapping SIDs to UIDs, or reads RFC 2307 attributes from the AD schema.

## Prerequisites

- Ubuntu server installed with Samba
- Access to an Active Directory domain (DNS resolution for the domain must work)
- Domain administrator credentials to join the server to the domain

```bash
# Verify DNS resolves the domain
nslookup company.local

# Install required packages
sudo apt update
sudo apt install samba winbind libnss-winbind libpam-winbind krb5-user -y
```

When prompted for Kerberos realm, enter the domain name in uppercase (e.g., `COMPANY.LOCAL`).

## Configuring Kerberos

```bash
sudo nano /etc/krb5.conf
```

```ini
[libdefaults]
    default_realm = COMPANY.LOCAL
    dns_lookup_realm = false
    dns_lookup_kdc = true

[realms]
    COMPANY.LOCAL = {
        kdc = dc1.company.local
        admin_server = dc1.company.local
    }

[domain_realm]
    .company.local = COMPANY.LOCAL
    company.local = COMPANY.LOCAL
```

Test Kerberos authentication:

```bash
# Get a Kerberos ticket as the domain administrator
kinit Administrator@COMPANY.LOCAL

# Verify the ticket
klist
```

## Configuring smb.conf for Winbind

Edit `/etc/samba/smb.conf`:

```bash
sudo nano /etc/samba/smb.conf
```

```ini
[global]
   workgroup = COMPANY
   realm = COMPANY.LOCAL
   server string = Ubuntu File Server
   security = ADS

   # Winbind configuration
   winbind use default domain = yes
   winbind enum users = yes
   winbind enum groups = yes
   winbind refresh tickets = yes

   # Template settings for new user home directories
   template shell = /bin/bash
   template homedir = /home/%D/%U

   # ID mapping - use the rid backend for algorithmic mapping
   idmap config * : backend = tdb
   idmap config * : range = 10000-19999

   # Domain-specific idmap configuration
   idmap config COMPANY : backend = rid
   idmap config COMPANY : range = 20000-99999

   # Log settings
   log file = /var/log/samba/log.%m
   log level = 1
```

The `idmap config COMPANY : backend = rid` line configures Winbind to calculate UIDs/GIDs algorithmically from the RID portion of the Windows SID. This is deterministic - the same user always gets the same UID, and no local database is needed.

## Joining the Domain

```bash
# Join the Ubuntu server to the Active Directory domain
sudo net ads join -U Administrator

# You'll be prompted for the Administrator password
# On success you'll see "Joined 'UBUNTU-SERVER' to dns domain 'company.local'"
```

## Configuring NSS to Use Winbind

The Name Service Switch must be told to use Winbind for user and group lookups:

```bash
sudo nano /etc/nsswitch.conf
```

Modify the `passwd` and `group` lines:

```text
passwd:         files systemd winbind
group:          files systemd winbind
shadow:         files
```

## Starting and Enabling Winbind

```bash
# Enable and start Winbind
sudo systemctl enable winbind
sudo systemctl start winbind

# Also restart Samba
sudo systemctl restart smbd nmbd

# Check service status
sudo systemctl status winbind
```

## Verifying Winbind is Working

```bash
# List domain users (should return AD user accounts)
wbinfo -u

# List domain groups
wbinfo -g

# Check if Winbind can authenticate a domain user
wbinfo -a COMPANY\\username

# Get the UID for a domain user
wbinfo --name-to-sid username
sudo getent passwd COMPANY\\username

# Get all users (local + domain)
getent passwd | head -30
```

If `wbinfo -u` returns users but `getent passwd COMPANY\\username` fails, the NSS configuration is not correct. Double-check `nsswitch.conf`.

## Configuring PAM for Domain Login

If you want domain users to log into the Ubuntu server itself (SSH, console) with their AD credentials:

```bash
# Enable winbind PAM authentication
sudo pam-auth-update
```

Check the "Winbind NT/Active Directory authentication" option. This updates PAM configuration files automatically.

For manual PAM configuration:

```bash
sudo nano /etc/pam.d/common-auth
```

Ensure this line is present:

```text
auth    [success=1 default=ignore]  pam_winbind.so krb5_auth krb5_ccache_type=FILE cached_login try_first_pass
```

Create home directories automatically at first login:

```bash
sudo nano /etc/pam.d/common-session
```

Add:

```text
session optional        pam_mkhomedir.so skel=/etc/skel umask=0077
```

## Using Domain Users in Samba Share Configuration

Once Winbind is running, you can reference domain users and groups directly in `smb.conf`:

```ini
[company-share]
   comment = Company File Share
   path = /srv/samba/company
   browseable = yes
   read only = no

   # Use domain group for access control (@ prefix = group)
   valid users = @"COMPANY\Domain Users"

   # Only domain admins can write
   write list = @"COMPANY\Domain Admins"

   # Or reference users directly
   # valid users = COMPANY\alice COMPANY\bob
```

Set filesystem permissions using domain groups:

```bash
# Get the GID for a domain group
getent group "COMPANY\\Domain Users"

# Use the GID to set permissions
sudo chgrp -R 20513 /srv/samba/company  # replace 20513 with actual GID
sudo chmod -R 2775 /srv/samba/company   # setgid bit so new files inherit group
```

## Configuring idmap_ad for RFC 2307 Attributes

If your Active Directory schema has RFC 2307 attributes (uidNumber, gidNumber) on user and group objects, you can use `idmap_ad` to read these directly instead of calculating them:

```ini
[global]
   idmap config COMPANY : backend = ad
   idmap config COMPANY : range = 20000-99999
   idmap config COMPANY : schema_mode = rfc2307

   # winbind must be able to read the AD schema
   winbind nss info = rfc2307
```

With this configuration, the UID you set in Active Directory Users and Computers (on the "UNIX Attributes" tab) is used directly. This gives you consistent UIDs across multiple Linux servers without Winbind coordination.

## Troubleshooting Winbind

```bash
# Check if Winbind can reach the domain controllers
wbinfo --ping-dc

# Check the Winbind cache
sudo net cache list

# Flush the Winbind cache if users show stale data
sudo net cache flush

# Increase log verbosity temporarily
sudo smbcontrol winbindd debuglevel 5
sudo tail -f /var/log/samba/log.winbindd

# Test domain membership
sudo net ads testjoin
```

If `wbinfo -u` hangs or returns an error, common causes are:
- Winbind service is not running
- DNS resolution for the domain is broken
- The server's clock is skewed more than 5 minutes from the DC (Kerberos is time-sensitive)
- The domain join was not completed successfully

Check the clock:

```bash
# Compare local time with DC time
sudo net time set -S dc1.company.local

# Or use chrony/NTP pointing to domain controllers
sudo apt install chrony -y
```

Winbind is a robust solution for domain-integrated Samba deployments. Once running correctly, domain users access Samba shares transparently with their Windows credentials, and filesystem permissions behave exactly as expected with proper UID/GID mapping.
