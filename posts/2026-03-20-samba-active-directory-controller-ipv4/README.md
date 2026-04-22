# How to Set Up Samba as an Active Directory Domain Controller on IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Samba, Active Directory, IPv4, Domain Controller, Kerberos, DNS, Linux

Description: Learn how to provision a Samba Active Directory Domain Controller on an IPv4-only network for Windows and Linux domain authentication.

---

Samba 4 can act as a full Active Directory Domain Controller (AD DC), providing Kerberos authentication, LDAP, DNS, and SMB services - all over IPv4. This enables Windows workstations and Linux clients to join a domain without Windows Server.

## Prerequisites

```bash
# Install Samba AD tools

apt install acl attr samba samba-ad-dc krb5-config krb5-user winbind \
  smbclient dnsutils ldap-utils libsasl2-modules-gssapi-mit -y  # Debian/Ubuntu
# RHEL-compatible distributions do not ship a supported Samba AD DC build in
# the standard Samba packages; build Samba with AD DC support or use a trusted
# third-party build instead.

# Stop and mask any standalone Samba services
systemctl disable --now smbd nmbd winbind
systemctl mask smbd nmbd winbind

# Move the package-provided smb.conf aside before provisioning
mv /etc/samba/smb.conf /etc/samba/smb.conf.initial
```

## Provisioning the Domain

```bash
# Run the Samba domain provisioning tool
# This sets up the entire AD DS structure
samba-tool domain provision \
  --server-role=dc \
  --use-rfc2307 \
  --dns-backend=SAMBA_INTERNAL \
  --realm=EXAMPLE.COM \
  --domain=EXAMPLE \
  --adminpass='Admin@Password1!' \
  --option="interfaces=lo 192.168.1.10/24" \
  --option="bind interfaces only=yes"

# realm: Kerberos realm (uppercase)
# domain: NetBIOS domain name
# adminpass: Administrator password (must meet complexity requirements)
# --option: restricts Samba to loopback and the DC's IPv4 interface during provisioning
```

Samba will create `/etc/samba/smb.conf` and `/var/lib/samba/private/`. Keep the IPv4 binding options in `/etc/samba/smb.conf` after provisioning.

## smb.conf (Excerpt with IPv4 Binding)

```ini
# /etc/samba/smb.conf (excerpt with IPv4 binding)

[global]
    workgroup = EXAMPLE
    realm = EXAMPLE.COM
    netbios name = DC1
    server role = active directory domain controller

    # Bind to the IPv4 address of this DC
    interfaces = lo 192.168.1.10/24
    bind interfaces only = yes

    dns forwarder = 8.8.8.8
```

## Configuring Kerberos

```bash
# Copy the generated krb5 config
cp /var/lib/samba/private/krb5.conf /etc/krb5.conf
```

## Starting the AD DC

```bash
# On systemd systems, use the AD DC service (not smbd/nmbd/winbind)
systemctl unmask samba-ad-dc
systemctl enable --now samba-ad-dc

# Verify it's running
samba-tool domain level show
```

## Testing the Domain Controller

```bash
# Get a Kerberos ticket for the administrator
kinit Administrator@EXAMPLE.COM

# List domain users
samba-tool user list

# Check DNS is working (SRV records for AD)
host -t SRV _ldap._tcp.example.com 192.168.1.10

# Check LDAP using the Kerberos ticket
ldapsearch -H ldap://dc1.example.com -Y GSSAPI -b "DC=example,DC=com" "(objectClass=user)"
```

## Joining a Windows Client

On the Windows workstation:
1. Set DNS to `192.168.1.10` (the Samba DC).
2. Join the domain: **Control Panel → System → Change Settings → Domain → EXAMPLE.COM**.

## Key Takeaways

- `samba-tool domain provision` creates the entire AD DS structure including Kerberos, DNS, and LDAP services.
- Set `interfaces` with `bind interfaces only = yes` to bind the DC to loopback and its IPv4 address.
- Use `SAMBA_INTERNAL` DNS backend for simplicity; configure `dns forwarder` for internet resolution.
- Verify with `samba-tool domain level show` and `kinit Administrator` after provisioning.
