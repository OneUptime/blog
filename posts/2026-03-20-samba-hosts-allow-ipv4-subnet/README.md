# How to Restrict Samba Access by IPv4 Subnet Using hosts allow

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Samba, IPv4, Hosts allow, Access Control, Security, Subnets

Description: Use Samba's hosts allow and hosts deny directives to restrict SMB/CIFS access to specific IPv4 addresses and subnets at the global and per-share level.

## Introduction

Samba's `hosts allow` and `hosts deny` directives control which client IP addresses can access services, independent of Samba authentication. Global rules work at the connection level; per-share rules are checked when a client accesses that share. This adds a network-level access control layer in addition to user authentication.

## Global hosts allow Configuration

```bash
# /etc/samba/smb.conf

[global]
   workgroup = WORKGROUP
   security = user

   # Allow only specific subnets
   hosts allow = 10.0.0.0/8 192.168.1.0/24 127.0.0.1

   # Deny everyone else (explicit)
   hosts deny = ALL
```

## Per-Share Access Control

```bash
# /etc/samba/smb.conf

[global]
   workgroup = WORKGROUP
   security = user
   # No global hosts allow - set per share

[public]
   path = /srv/samba/public
   browseable = yes
   read only = yes
   # Allow anyone on the internal network
   hosts allow = 10.0.0.0/8
   hosts deny = ALL

[private]
   path = /srv/samba/private
   browseable = no
   read only = no
   valid users = manager
   # Only specific IPs can access this share
   hosts allow = 10.0.0.5 10.0.0.6
   hosts deny = ALL

[admin]
   path = /srv/samba/admin
   browseable = no
   read only = no
   valid users = root
   # Only admin workstation
   hosts allow = 10.0.0.1
   hosts deny = ALL
```

## hosts allow Syntax Options

```bash
# Individual IP

hosts allow = 10.0.0.5

# Multiple IPs (space-separated)
hosts allow = 10.0.0.5 10.0.0.6 10.0.0.7

# Subnet with prefix
hosts allow = 10.0.0.0/24

# Subnet with netmask
hosts allow = 10.0.0.0/255.255.255.0

# Combination
hosts allow = 10.0.0.0/8 192.168.1.10 127.0.0.1

# Except notation (allow subnet except specific IP)
hosts allow = 10.0.0.0/24 EXCEPT 10.0.0.99
```

## Testing Access Control

```bash
# Test from allowed IP
smbclient -L 10.0.0.5 -U username
# Should: show shares

# Test from blocked IP (from another host or network namespace)
# Should fail before share access; exact error varies by client and firewall behavior

# Check who is currently connected
sudo smbstatus

# Reload configuration without restart
sudo smbcontrol smbd reload-config

# View Samba logs for denied connections
sudo grep -i "denied\|refused\|reject" /var/log/samba/log.smbd
```

## Combining with iptables

```bash
# For defense-in-depth, also block at iptables level
sudo iptables -A INPUT -p tcp --dport 445 -s 10.0.0.0/8 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 445 -j DROP

sudo iptables -A INPUT -p tcp --dport 139 -s 10.0.0.0/8 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 139 -j DROP
```

## Conclusion

`hosts allow` and `hosts deny` in smb.conf provide host-based access control in addition to authentication. Apply globally in `[global]` or per share for granular control. Use `hosts allow = <subnet>` with `hosts deny = ALL` as a whitelist pattern. Combine with `bind interfaces only` and iptables rules for a stronger defense-in-depth security model.
