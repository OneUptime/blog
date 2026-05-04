# How to Configure sshd to Listen on IPv6 Addresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, SSH, Sshd, OpenSSH, Remote Access, Security

Description: Learn how to configure OpenSSH server (sshd) to listen on IPv6 addresses, restrict to specific interfaces, and enable dual-stack SSH access.

## sshd_config IPv6 Listen Address

```text
# /etc/ssh/sshd_config

# Listen on specific IPv6 address and port

ListenAddress 2001:db8::10

# Listen on IPv6 loopback
# ListenAddress ::1

# Listen on all IPv6 interfaces (default if AddressFamily is any)
# ListenAddress ::

# Multiple listen addresses (IPv4 and IPv6)
# ListenAddress 2001:db8::10
# ListenAddress 0.0.0.0

# Set address family
AddressFamily any    # Both IPv4 and IPv6 (default)
# AddressFamily inet6  # IPv6 only
# AddressFamily inet   # IPv4 only

# Port (default 22)
Port 22
```

## IPv6-Only sshd Configuration

```text
# /etc/ssh/sshd_config

# Only accept IPv6 connections
AddressFamily inet6

# Listen on specific IPv6 address
ListenAddress 2001:db8::10

# Or all IPv6 interfaces
# ListenAddress ::

Port 22

# Security settings
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
```

## Apply and Verify

```bash
# Test sshd configuration for syntax errors
sshd -t

# Reload sshd configuration (without dropping connections)
systemctl reload sshd

# Or restart sshd
systemctl restart sshd

# Verify sshd is listening on IPv6
ss -6 -tlnp | grep sshd
# Expected: [2001:db8::10]:22

# Check with netstat
netstat -tlnp | grep :22

# View current sshd configuration
sshd -T | grep -E "(listenaddress|addressfamily|port)"
```

## Test SSH Connection over IPv6

```bash
# Connect to SSH server via IPv6
ssh user@2001:db8::10

# Specify port
ssh -p 22 user@2001:db8::10

# Force IPv6
ssh -6 user@2001:db8::10

# Verbose mode for debugging
ssh -v -6 user@2001:db8::10

# Test with netcat (check port is open)
nc -6 -zv 2001:db8::10 22
```

## Firewall Rules for IPv6 SSH

```bash
# Allow SSH over IPv6 with ip6tables
ip6tables -A INPUT -p tcp --dport 22 -j ACCEPT
ip6tables -A OUTPUT -p tcp --sport 22 -m state --state ESTABLISHED -j ACCEPT
ip6tables-save > /etc/iptables/rules.v6

# Using UFW
ufw allow ssh
ufw allow 22/tcp

# Using firewalld
firewall-cmd --add-service=ssh --permanent
firewall-cmd --reload

# Rate limiting SSH (prevent brute force)
ip6tables -A INPUT -p tcp --dport 22 -m recent --set --name SSH6
ip6tables -A INPUT -p tcp --dport 22 -m recent --update --seconds 60 --hitcount 4 --name SSH6 -j DROP
```

## SSH Banner and Log Monitoring

```bash
# Check SSH login attempts over IPv6 in auth log
grep "sshd" /var/log/auth.log | grep "2001:db8"
grep "Failed password" /var/log/auth.log | grep -E "(\[.*\]|::[0-9a-f])"

# Monitor active SSH connections over IPv6
ss -6 -tnp | grep :22

# Check sshd journal logs
journalctl -u sshd --since "1 hour ago" | grep -E "Accepted|Failed"
```

## Summary

Configure sshd for IPv6 with `ListenAddress 2001:db8::10` in `/etc/ssh/sshd_config`. Use `AddressFamily inet6` for IPv6-only, or `AddressFamily any` (default) for dual-stack. Set `ListenAddress ::` to listen on all IPv6 interfaces. Test config with `sshd -t`, then `systemctl reload sshd`. Verify with `ss -6 -tlnp | grep sshd`. Allow the port with `ip6tables -A INPUT -p tcp --dport 22 -j ACCEPT`. Connect with `ssh -6 user@2001:db8::10`.
