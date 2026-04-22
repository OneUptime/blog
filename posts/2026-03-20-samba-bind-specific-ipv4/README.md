# How to Configure Samba to Bind to a Specific IPv4 Address

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Samba, IPv4, BIND, SMB, Configuration, Network

Description: Configure Samba's smb.conf to listen on a specific IPv4 address using the interfaces and bind interfaces only directives, restricting SMB/CIFS to a single network interface.

## Introduction

By default, Samba listens on all available network interfaces, including loopback. On multi-homed servers, restricting Samba to a specific IPv4 address limits exposure and ensures SMB traffic only flows through the intended interface.

## Basic Binding Configuration

```bash
# /etc/samba/smb.conf

[global]
   # Restrict to specific IPv4 address and loopback
   interfaces = 10.0.0.5 lo
   bind interfaces only = yes

   # Standard settings
   workgroup = WORKGROUP
   server string = File Server
   security = user

   # Logging
   log file = /var/log/samba/log.%m
   max log size = 50
   log level = 1
```

## Using Interface Names

```bash
# /etc/samba/smb.conf

[global]
   # Bind by interface name
   interfaces = eth0 lo
   bind interfaces only = yes

   # Or mix: interface name + specific IP
   # interfaces = eth0 127.0.0.1

   workgroup = WORKGROUP
   security = user
```

## Specifying IP with Netmask

```bash
# /etc/samba/smb.conf

[global]
   # Bind using IP/netmask notation
   interfaces = 10.0.0.5/24 127.0.0.1/8
   bind interfaces only = yes

   workgroup = WORKGROUP
   netbios name = FILESERVER
```

## Adding a Share

```bash
# /etc/samba/smb.conf

[global]
   interfaces = 10.0.0.5 lo
   bind interfaces only = yes
   workgroup = WORKGROUP
   security = user

[shared]
   comment = Shared Files
   path = /srv/samba/shared
   browseable = yes
   read only = no
   valid users = @sambausers
   create mask = 0664
   directory mask = 0775
```

```bash
# Create directory and set permissions

sudo mkdir -p /srv/samba/shared
sudo groupadd sambausers
sudo chgrp sambausers /srv/samba/shared
sudo chmod 2775 /srv/samba/shared

# Create Samba user (must have a Linux account first)
sudo useradd -M -s /usr/sbin/nologin sambauser
sudo usermod -aG sambausers sambauser
sudo smbpasswd -a sambauser
```

## Applying and Testing

```bash
# Test configuration syntax
sudo testparm

# Restart Samba
sudo systemctl restart smbd nmbd

# Verify Samba is listening on the correct IP
sudo ss -tlnp | grep -E "smbd|:445|:139"
# Expected: 10.0.0.5:445 (and 127.0.0.1:445 if loopback is included)

# Test connectivity from a client
smbclient -L //10.0.0.5 -U sambauser

# Test with nmblookup
nmblookup -U 10.0.0.5 FILESERVER
```

## Verifying the Binding

```bash
# Check what interfaces Samba is using
sudo testparm -s | grep -E "interfaces|bind"

# Check active connections
sudo smbstatus --shares

# Check Samba log for binding confirmation
sudo tail -20 /var/log/samba/log.smbd | grep -i "bind\|interface"

# Verify ports
sudo ss -tlnp | grep smbd
```

## Conclusion

Set `interfaces` to list specific IPv4 addresses or interface names, and set `bind interfaces only = yes` to prevent Samba from listening on unlisted interfaces. Always include `lo` in the interfaces list to allow local connections. Test with `testparm` before restarting and verify with `ss -tlnp` that Samba binds to the correct address.
