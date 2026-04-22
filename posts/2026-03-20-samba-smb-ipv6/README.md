# How to Configure SAMBA/SMB with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Samba, SMB, Window, File Sharing, Linux

Description: Configure Samba (SMB/CIFS) server on Linux to share files over IPv6, including smb.conf IPv6 binding, Windows client access to IPv6 Samba shares, and firewall configuration.

## Introduction

Samba provides SMB/CIFS file sharing on Linux and supports IPv6 natively from version 3.6+. Configuring Samba for IPv6 involves binding to IPv6 interfaces in `smb.conf`, ensuring direct-hosted SMB over TCP port 445 is accessible over IPv6, and accessing shares from Windows clients using IPv6 UNC paths.

## Basic smb.conf for IPv6

```ini
# /etc/samba/smb.conf

[global]
    workgroup = EXAMPLE
    server string = Samba Server

    # Bind to specific IPv6 interfaces or all IPv6
    # Use the interface name or IPv6 address; do not use brackets in smb.conf
    interfaces = lo eth0 2001:db8::10
    bind interfaces only = yes

    # Alternatively, bind to all interfaces (IPv4 and IPv6)
    # interfaces = lo eth0
    # bind interfaces only = no

    # SMB protocol settings
    min protocol = SMB2
    server max protocol = SMB3

    # Security
    security = user
    passdb backend = tdbsam

    # Logging
    log file = /var/log/samba/log.%m
    max log size = 50

[data]
    comment = Shared Data
    path = /srv/samba/data
    browseable = yes
    writable = yes
    valid users = @sambagroup
    create mask = 0664
    directory mask = 0775
```

## Verify Samba Listens on IPv6

```bash
# Restart Samba

systemctl restart smbd nmbd

# Check that smbd listens on IPv6
ss -tlnp | grep smbd
# Should show [::]:445 (direct-hosted SMB over TCP)
# Or specific: [2001:db8::10]:445

# Check Samba configuration
testparm /etc/samba/smb.conf

# Check active smbd processes
smbstatus --processes | head -20
```

## Create Samba Users and Set Passwords

```bash
# Add Linux user
useradd -M -s /sbin/nologin sambauser

# Add Samba password for user
smbpasswd -a sambauser

# Add user to samba group
groupadd sambagroup
usermod -aG sambagroup sambauser
```

## Access Samba Share from Linux over IPv6

```bash
# List shares on IPv6 Samba server
smbclient -L 2001:db8::10 -U sambauser

# Connect to a share
smbclient //2001:db8::10/data -U sambauser

# Mount CIFS share over IPv6
mount -t cifs //2001:db8::10/data /mnt/samba \
    -o username=sambauser,password=pass,vers=3.0,addr=2001:db8::10

# /etc/fstab entry for IPv6 CIFS mount
//2001:db8::10/data  /mnt/samba  cifs  username=sambauser,password=pass,vers=3.0,addr=2001:db8::10,_netdev  0  0
```

## Access from Windows Client over IPv6

```powershell
# Windows: map a network drive using IPv6 UNC path
# IPv6 addresses in UNC paths use ".ipv6-literal.net" suffix

# The UNC path for [2001:db8::10] is:
# \\2001-db8--10.ipv6-literal.net\data

# Map drive in PowerShell
net use Z: \\2001-db8--10.ipv6-literal.net\data /user:sambauser

# Or use File Explorer "Map Network Drive" with:
# \\2001-db8--10.ipv6-literal.net\data

# The IPv6 literal address format replaces ':' with '-' and '::' with '--'
# 2001:db8::10 → 2001-db8--10.ipv6-literal.net
```

```bash
# Helper: convert IPv6 to Windows literal format
python3 -c "
import sys
addr = sys.argv[1]
literal = addr.replace(':', '-').replace('---', '--')
print(f'{literal}.ipv6-literal.net')
" 2001:db8::10
# Output: 2001-db8--10.ipv6-literal.net
```

## Samba with Active Directory over IPv6

```ini
# /etc/samba/smb.conf for AD member server

[global]
    security = ADS
    realm = EXAMPLE.COM
    workgroup = EXAMPLE

    # AD controller with IPv6 - use hostname, not IP
    # Kerberos resolves DC hostnames to AAAA records
    kerberos method = secrets and keytab
    winbind use default domain = yes

    # Bind to IPv6 interface
    interfaces = lo eth0
    bind interfaces only = no
```

## Firewall Rules for Samba over IPv6

```bash
# Allow direct-hosted SMB/CIFS from trusted IPv6 clients
ip6tables -A INPUT -p tcp --dport 445 -s 2001:db8:100::/48 -j ACCEPT

# Legacy NetBIOS ports (137/udp, 138/udp, 139/tcp) are for NetBIOS over TCP/IP
# and are not normally used for IPv6 SMB access.

# Persist rules on systems using iptables-persistent (Debian/Ubuntu)
ip6tables-save > /etc/iptables/rules.v6
```

## Verify SMB over IPv6

```bash
# Test from Linux client
smbclient -L 2001:db8::10 -U sambauser
# Prompts for the Samba password and lists shares

# Check SMB traffic on IPv6
tcpdump -i eth0 -n "ip6 and port 445"

# Check Samba logs for IPv6 connections
tail -f /var/log/samba/log.smbd | grep -E "[0-9a-fA-F:]{3,}"
```

## Conclusion

Samba supports IPv6 by configuring the `interfaces` directive in `smb.conf` with IPv6 addresses or interface names. CIFS mounts from Linux can use `//2001:db8::10/share` syntax with the `addr=` option specifying the IPv6 address. Windows clients access IPv6 Samba shares using the `.ipv6-literal.net` address format where colons are replaced with hyphens. Direct-hosted SMB over TCP port 445 is preferred over NetBIOS for IPv6 deployments as it requires fewer firewall rules and supports modern SMB features such as encryption. Samba 3.6+ handles IPv6 automatically when the system has IPv6 interfaces configured.
