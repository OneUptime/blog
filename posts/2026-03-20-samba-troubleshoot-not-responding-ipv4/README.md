# How to Troubleshoot Samba Not Responding on IPv4 Interfaces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Samba, SMB, CIFS, IPv4, Troubleshooting, Firewall

Description: Diagnose and fix Samba not responding on IPv4 interfaces, including smbd/nmbd not running, wrong bind address, firewall blocking ports 445/139, and permission issues.

## Introduction

When Samba stops responding, the cause is almost always one of four things: the service is not running, it is bound to the wrong interface, a firewall is blocking the required ports, or the share configuration has an error. This guide walks through systematic diagnosis.

## Step 1: Verify Samba Services Are Running

```bash
# Check status of smbd and nmbd on Debian/Ubuntu

sudo systemctl status smbd nmbd

# On RHEL/CentOS/Fedora, the service units are usually smb and nmb:
sudo systemctl status smb nmb

# If not running:
sudo systemctl start smbd nmbd
sudo systemctl enable smbd nmbd

# On RHEL/CentOS/Fedora:
sudo systemctl start smb nmb
sudo systemctl enable smb nmb

# Check for configuration errors before starting
sudo testparm -s
# Any syntax error appears here and prevents startup
```

## Step 2: Check What Address Samba Is Listening On

```bash
# See what ports smbd has open
sudo ss -tlnp | grep smbd
# Expected: 0.0.0.0:445 and 0.0.0.0:139 (or specific IP)

# If smbd is running but not on expected interface:
# Check smb.conf binding settings
sudo grep -E "interfaces|bind interfaces" /etc/samba/smb.conf
```

Common binding issues in `/etc/samba/smb.conf`:

```ini
[global]
   # Wrong: typo in IP address
   interfaces = 10.0.0.50   ; but actual interface is 10.0.0.5

   # Wrong: missing loopback causes some tools to fail
   interfaces = eth0         ; should include 'lo' for local tools

   # Correct:
   interfaces = lo eth0 10.0.0.5
   bind interfaces only = yes
```

## Step 3: Test Port Connectivity

```bash
# Test from client machine
nc -zv 10.0.0.5 445
# Success: Connection to 10.0.0.5 445 port [tcp/microsoft-ds] succeeded

nc -zv 10.0.0.5 139
# Success: Connection to 10.0.0.5 139 port [tcp/netbios-ssn] succeeded

# Test from server itself
nc -zv 127.0.0.1 445
# If this fails but smbd is running → bind interfaces only blocking loopback
```

## Step 4: Check Firewall Rules

```bash
# Check iptables
sudo iptables -L INPUT -n | grep -E "139|445|137|138"

# If SMB ports are missing:
sudo iptables -A INPUT -s 10.0.0.0/24 -p tcp --dport 445 -j ACCEPT
sudo iptables -A INPUT -s 10.0.0.0/24 -p tcp --dport 139 -j ACCEPT
sudo iptables -A INPUT -s 10.0.0.0/24 -p udp --dport 137:138 -j ACCEPT

# For UFW:
sudo ufw allow from 10.0.0.0/24 to any app Samba

# For firewalld:
sudo firewall-cmd --permanent --add-service=samba
sudo firewall-cmd --reload
```

## Step 5: Check Hosts Allow/Deny

```bash
# smb.conf access control may be blocking the client
grep -E "hosts allow|hosts deny" /etc/samba/smb.conf

# If client IP is in hosts deny or not in hosts allow:
# /etc/samba/smb.conf
[global]
   hosts allow = 127.0.0.1 10.0.0.0/24
   hosts deny = 0.0.0.0/0
```

## Step 6: Check Samba Logs

```bash
# Main log file
sudo tail -50 /var/log/samba/log.smbd

# Per-client logs
ls /var/log/samba/log.*
sudo tail -30 /var/log/samba/log.10.0.0.100   # log for specific client IP

# Increase log verbosity temporarily
sudo smbcontrol smbd debug 3

# Reset verbosity
sudo smbcontrol smbd debug 1
```

## Common Error Table

| Symptom | Cause | Fix |
|---|---|---|
| `connection refused` on port 445 | smbd not running or wrong bind | Start smbd, fix interfaces |
| `no route to host` | Routing issue or firewall reject | Check routes and firewall rules |
| `NT_STATUS_ACCESS_DENIED` | Share ACL, filesystem permission, `valid users`, or SELinux denial | Check share/path permissions and SELinux labels |
| `NT_STATUS_BAD_NETWORK_NAME` | Share doesn't exist in smb.conf | Add `[sharename]` section |
| `NT_STATUS_LOGON_FAILURE` | Wrong credentials or missing/disabled Samba user | Check username/password; add or enable the user with `sudo smbpasswd -a username` |
| Mount succeeds but no files visible | SELinux or path permissions | Fix SELinux labels and path permissions |

## SELinux Fixes (RHEL/CentOS)

```bash
# Check if SELinux is blocking Samba
sudo ausearch -m avc -ts recent | grep smbd

# Allow Samba to share home directories
sudo setsebool -P samba_enable_home_dirs on

# Allow Samba to share any directory
sudo setsebool -P samba_export_all_rw on

# Or set the correct context on the share path:
sudo chcon -R -t samba_share_t /srv/samba/share
sudo semanage fcontext -a -t samba_share_t "/srv/samba/share(/.*)?"
sudo restorecon -R /srv/samba/share
```

## Quick Diagnostic Script

```bash
#!/bin/bash
echo "=== Samba Service Status ==="
systemctl is-active smbd nmbd 2>/dev/null || systemctl is-active smb nmb

echo "=== Listening Ports ==="
sudo ss -tlnp | grep smbd

echo "=== Config Test ==="
sudo testparm -s 2>&1 | head -20

echo "=== Samba Users ==="
sudo pdbedit -L

echo "=== Recent Log Errors ==="
sudo grep -Ei "error|fail" /var/log/samba/log.smbd | tail -10
```

## Conclusion

Samba not responding on IPv4 usually comes down to service not running, wrong `interfaces` setting in smb.conf, or firewall blocking ports 445/139. Run `testparm -s` first to catch configuration errors, then check `ss -tlnp` to confirm binding, then test firewall connectivity with `nc`. Check `/var/log/samba/log.smbd` for denied connections and use SELinux boolean fixes on RHEL-based systems if everything else looks correct.
