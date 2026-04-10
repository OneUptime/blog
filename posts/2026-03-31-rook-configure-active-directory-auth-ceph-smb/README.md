# How to Configure Active Directory Authentication for Ceph SMB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, SMB, Active Directory, Authentication

Description: Learn how to join a Ceph SMB gateway to Active Directory for centralized user authentication and Kerberos-based secure file sharing.

---

## Why Active Directory for Ceph SMB?

Integrating Ceph SMB with Active Directory allows Windows domain users to authenticate seamlessly using their domain credentials and Kerberos tickets. This eliminates the need to manage separate Samba user accounts and enables group-based access control using AD security groups.

## Prerequisites

- Active Directory domain (e.g., EXAMPLE.COM)
- DNS resolution for the AD domain from the Samba server
- Time synchronization (NTP) between the Samba server and AD domain controllers
- A domain administrator account for joining

Install required packages:

```bash
dnf install -y samba samba-winbind samba-winbind-clients \
  samba-winbind-krb5-locator krb5-workstation
```

## Configuring DNS and NTP

Ensure the Samba server resolves the AD domain:

```bash
echo "nameserver 192.168.1.5" >> /etc/resolv.conf
host EXAMPLE.COM
```

Synchronize time with the domain controller:

```bash
dnf install -y chrony
cat >> /etc/chrony.conf << 'EOF'
server 192.168.1.5 iburst
EOF
systemctl restart chronyd
```

## Configuring Kerberos

Create `/etc/krb5.conf`:

```ini
[libdefaults]
    default_realm = EXAMPLE.COM
    dns_lookup_realm = true
    dns_lookup_kdc = true

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
kinit administrator@EXAMPLE.COM
klist
```

## Configuring smb.conf for AD

Replace the Samba global configuration:

```ini
[global]
    workgroup = EXAMPLE
    realm = EXAMPLE.COM
    server string = Ceph File Server
    netbios name = SAMBA01
    security = ADS

    winbind use default domain = yes
    winbind offline logon = yes
    winbind enum users = yes
    winbind enum groups = yes

    idmap config * : backend = tdb
    idmap config * : range = 3000-7999
    idmap config EXAMPLE : backend = rid
    idmap config EXAMPLE : range = 10000-999999

    template shell = /bin/bash
    template homedir = /home/%U

    vfs objects = ceph acl_xattr
    ceph:config_file = /etc/ceph/ceph.conf
    ceph:user_id = samba
    kernel share modes = no
    map acl inherit = yes
    store dos attributes = yes

[cephshare]
    comment = CephFS AD Share
    path = /volumes/smb-shares/shared
    valid users = @"EXAMPLE\Domain Users"
    writable = yes
    browsable = yes
```

## Joining the Domain

Join the Samba server to the AD domain:

```bash
net ads join -U administrator
```

Expected output:

```text
Using short domain name -- EXAMPLE
Joined 'SAMBA01' to dns domain 'example.com'
```

Start and enable winbind:

```bash
systemctl enable --now winbind
```

## Verifying AD Integration

Test that domain users can be resolved:

```bash
wbinfo -u | head -10
wbinfo -g | head -10
getent passwd EXAMPLE\\alice
```

Test authentication:

```bash
wbinfo -a EXAMPLE\\alice%Password123
```

## Summary

Joining a Ceph SMB gateway to Active Directory enables domain users to authenticate with Kerberos and access CephFS shares using their existing credentials. The winbind service handles UID/GID mapping for AD users, and access control is managed through AD security groups, significantly simplifying user management compared to maintaining local Samba accounts.
