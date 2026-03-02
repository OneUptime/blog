# How to Configure TCP Wrappers (/etc/hosts.allow, /etc/hosts.deny) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, TCP Wrappers, Security, Access Control, Networking

Description: Guide to configuring TCP Wrappers on Ubuntu using /etc/hosts.allow and /etc/hosts.deny for network access control, including syntax, precedence rules, logging, and modern security integration.

---

TCP Wrappers is a host-based access control mechanism that works at the network service level. It intercepts incoming network connections and checks against allow/deny rules before passing the connection to the actual service. On Ubuntu, `hosts.allow` and `hosts.deny` control which hosts can connect to services compiled with `libwrap` support. While newer services often implement their own access controls, TCP Wrappers remains relevant for older daemons and adds a useful additional layer.

## How TCP Wrappers Works

When a service compiled with `libwrap` receives a connection, it calls into the TCP Wrappers library, which:

1. Checks `/etc/hosts.allow` first - if a matching rule is found, access is granted
2. Checks `/etc/hosts.deny` - if a matching rule is found, access is denied
3. If neither file has a matching rule, access is granted (default allow)

The key rule: **hosts.allow is checked first. If it matches, hosts.deny is never consulted.**

## Checking Which Services Support TCP Wrappers

Not all services use libwrap. Check with:

```bash
# Check if a binary is compiled with libwrap support
ldd $(which sshd) | grep libwrap
ldd $(which vsftpd) | grep libwrap
ldd $(which in.telnetd) | grep libwrap

# Or use strings to check
strings $(which sshd) | grep hosts_access

# Services that commonly support TCP Wrappers:
# - sshd (on older configurations)
# - vsftpd
# - portmap/rpcbind
# - xinetd-managed services
# - proftpd
# - sendmail
```

Note: Modern OpenSSH (since version 6.7) no longer uses TCP Wrappers by default. The `libwrap` option was removed in OpenSSH 9.8. Ubuntu 24.04's default sshd may not respect hosts.allow/deny.

```bash
# Check if your sshd was compiled with tcp-wrappers support
sshd -d -p 2223 2>&1 | grep "tcp wrappers"
# Or check the compile-time options:
sshd -V 2>&1 || ssh -V 2>&1

# Check what version of openssh is installed
dpkg -l openssh-server | grep openssh
```

## Basic Configuration Syntax

Both files use the same format:

```
daemon_list : client_list [: shell_command]
```

Where:
- `daemon_list`: Process name(s) of the service
- `client_list`: IP addresses, hostnames, or wildcards
- `shell_command`: Optional command to run when the rule matches

## /etc/hosts.allow: Allowing Access

```bash
sudo nano /etc/hosts.allow
```

Allow rules (examples):

```bash
# Allow all services from localhost
ALL : 127.0.0.1

# Allow SSH from your management network only
sshd : 192.168.1.0/24

# Allow multiple hosts for a service
vsftpd : 10.0.0.5 10.0.0.6 10.0.0.7

# Allow by hostname
sshd : admin.example.com

# Allow an entire domain
sshd : .example.com

# Allow multiple services from a subnet
sshd, vsftpd : 172.16.0.0/16

# Allow all services from a trusted network
ALL : 10.0.0.0/8

# Log connection and allow
sshd : 192.168.1.0/24 : spawn echo "%a connected to %d at $(date)" >> /var/log/tcp_wrappers.log

# Allow with custom banner
sshd : 192.168.1.100 : twist echo "Authorized access only"
```

## /etc/hosts.deny: Denying Access

```bash
sudo nano /etc/hosts.deny
```

Deny rules:

```bash
# Deny all connections to all services (use with hosts.allow whitelist)
ALL : ALL

# Deny specific service from all hosts
sshd : ALL

# Deny a specific IP
ALL : 10.0.0.50

# Deny and log
sshd : ALL : spawn echo "Connection from %a to %d rejected at $(date)" >> /var/log/tcp_wrappers.log

# Deny and run a script (can trigger alerts or blocks)
ALL : ALL : spawn /usr/local/bin/reject-alert.sh %a %d

# Deny with a custom message to the connecting host
sshd : ALL : twist echo "Access denied"
```

## Practical Configuration Examples

### Whitelist-Only Access (Most Secure)

Allow only specific networks, deny everything else:

```bash
# /etc/hosts.allow
sshd : 192.168.1.0/24 10.0.0.0/8 127.0.0.1

# /etc/hosts.deny
sshd : ALL
```

With this setup:
- Hosts in 192.168.1.0/24 or 10.0.0.0/8 can connect
- All other hosts are denied
- hosts.allow is checked first, so the allowed hosts bypass the deny rule

### Allow Internal, Deny External

```bash
# /etc/hosts.allow
# Allow everything from internal networks
ALL : 10.0.0.0/8 192.168.0.0/16 172.16.0.0/12 127.0.0.1

# /etc/hosts.deny
# Deny everything not explicitly allowed
ALL : ALL
```

### Log and Deny with Notification

```bash
# /etc/hosts.deny
sshd : ALL : spawn (echo "Unauthorized connection attempt from %a to %d at $(date)" | mail -s "Security Alert" admin@example.com) &

ALL : ALL : spawn echo "%a %d %p" >> /var/log/tcp_denied.log
```

## Wildcards and Special Patterns

```bash
# ALL: matches everything
ALL : ALL  # all daemons from all hosts

# LOCAL: matches local hostnames (no dots)
sshd : LOCAL

# UNKNOWN: matches hosts with unresolvable names
ALL : UNKNOWN : DENY

# KNOWN: matches hosts with resolvable names
sshd : KNOWN

# PARANOID: deny if forward and reverse DNS don't match
ALL : PARANOID : DENY

# Subnet notation
sshd : 192.168.1.0/255.255.255.0  # older CIDR notation
sshd : 192.168.1.0/24             # modern CIDR notation (some versions)

# Address prefix match
sshd : 192.168.1.  # all addresses starting with 192.168.1.
```

## Shell Commands in Rules

The `spawn` and `twist` keywords run commands:

```bash
# spawn: run a command in background, then apply the rule decision
# Access is still granted/denied based on the file the rule is in
sshd : 192.168.1.0/24 : spawn logger "TCP Wrappers: %a connected to %d"

# twist: run a command and use its exit code / output
# The connection is handed to the command instead of the service
sshd : 10.0.0.50 : twist echo "Your access attempt has been logged"

# Variables available in commands:
# %a = client address
# %c = client info (user@host if available)
# %d = daemon name
# %h = client hostname (or address if no hostname)
# %n = client hostname (UNKNOWN if unresolvable)
# %p = server process ID
# %s = server info (daemon@host)
# %u = client username (from identd, if available)
```

## Testing TCP Wrappers Rules

Test rules without making live connections:

```bash
# tcpdchk: check configuration file syntax
sudo tcpdchk

# tcpdmatch: test if a specific connection would be allowed
# Usage: tcpdmatch daemon client
sudo tcpdmatch sshd 10.0.0.50
# Output: access: granted  OR  access: denied

sudo tcpdmatch sshd 192.168.1.100
sudo tcpdmatch vsftpd unknown@10.0.0.50

# Test with a hostname
sudo tcpdmatch sshd admin.example.com

# Test all services against a host
sudo tcpdmatch ALL 203.0.113.50
```

## Logging

TCP Wrappers logs connections to syslog. View the logs:

```bash
# View TCP Wrappers entries in auth log
grep "hosts_access" /var/log/auth.log

# Or in syslog
grep "refused" /var/log/syslog

# Monitor in real-time
sudo tail -f /var/log/auth.log | grep -i "refused\|allowed"
```

## Integration with Fail2ban

TCP Wrappers can work alongside fail2ban. While fail2ban handles dynamic IP blocking via firewall rules, hosts.deny provides static blocking:

```bash
# A fail2ban action that also adds to hosts.deny
# /etc/fail2ban/action.d/hostsdeny.conf
[Definition]
actionban = echo "ALL: <ip>" >> /etc/hosts.deny
actionunban = sed -i "/ALL: <ip>/d" /etc/hosts.deny
```

## Limitations and Modern Alternatives

TCP Wrappers has real limitations:

- Only works for services compiled with `libwrap` support
- Modern services (nginx, Apache, newer sshd) don't use it
- Rules apply only when a connection is attempted (not persistent like firewall rules)
- No rate limiting, only allow/deny

For modern Ubuntu servers, these tools provide stronger access control:

```bash
# UFW (Uncomplicated Firewall) - kernel-level, works for all services
sudo ufw allow from 192.168.1.0/24 to any port 22
sudo ufw deny 22

# nftables - powerful, flexible, modern replacement for iptables
sudo apt-get install -y nftables

# firewalld - zone-based firewall with rich rules
sudo apt-get install -y firewalld
```

## Recommended Approach for Modern Ubuntu Servers

Use TCP Wrappers as a secondary layer, with the firewall as the primary control:

```bash
# Primary: UFW blocks all SSH except your admin network
sudo ufw allow from 192.168.1.0/24 to any port 22

# Secondary: hosts.deny as a belt-and-suspenders backup
# /etc/hosts.allow
sshd : 192.168.1.0/24 127.0.0.1

# /etc/hosts.deny
sshd : ALL
```

This way, even if UFW rules are accidentally cleared, TCP Wrappers provides a fallback. And even if the service doesn't support libwrap, UFW is still protecting it.

## Verifying Configuration

```bash
# Check syntax of both files
sudo tcpdchk -a  # include implicit rules

# Test specific scenarios
sudo tcpdmatch sshd 203.0.113.1  # external IP - should be denied
sudo tcpdmatch sshd 192.168.1.5   # internal IP - should be allowed

# Verify from actual connection attempt (test from allowed host)
ssh -v your-server  # should connect

# From denied host, connection should be refused or timeout
```

While TCP Wrappers is less central to modern Linux security than it once was, understanding it helps when working with older systems and daemons that still rely on it, and it complements firewall-based access control as part of a defense-in-depth strategy.
