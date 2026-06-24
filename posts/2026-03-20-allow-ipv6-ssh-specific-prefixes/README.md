# How to Allow IPv6 SSH Access Only from Specific Prefixes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, SSH, Ip6tables, Access Control, Security

Description: Learn how to restrict SSH access on IPv6 to specific prefixes using ip6tables, nftables, and sshd AllowFrom configuration, preventing unauthorized access while maintaining management access.

## Overview

Restricting SSH access to specific IPv6 prefixes dramatically reduces the attack surface. An SSH service exposed to the entire internet faces constant brute-force attempts; limiting access to management networks (ULA or specific global prefixes) means attackers can't even reach the SSH port. This guide covers multiple layers of SSH access restriction for IPv6.

## Layer 1: ip6tables (Network Level)

```bash
# Method 1: Allow SSH from specific prefix, drop everything else

# Allow SSH from management network

ip6tables -A INPUT -p tcp --dport 22 -s fd12:3456:789a::/48 -j ACCEPT

# Allow SSH from specific admin IPv6 addresses
ip6tables -A INPUT -p tcp --dport 22 -s 2001:db8:100::1/128 -j ACCEPT
ip6tables -A INPUT -p tcp --dport 22 -s 2001:db8:100::2/128 -j ACCEPT

# Drop SSH from everywhere else (explicit)
ip6tables -A INPUT -p tcp --dport 22 \
  -m limit --limit 1/minute \
  -j LOG --log-prefix "SSH-BLOCKED: " --log-level 4
ip6tables -A INPUT -p tcp --dport 22 -j DROP
```

```bash
# Method 2: Allowlist with a custom chain

# Create SSH allowlist chain
ip6tables -N SSH-ALLOWLIST

# Populate allowlist
ip6tables -A SSH-ALLOWLIST -s fd12:3456:789a::/48 -j ACCEPT
ip6tables -A SSH-ALLOWLIST -s 2001:db8:200::/48 -j ACCEPT
ip6tables -A SSH-ALLOWLIST -j DROP

# Allow established SSH traffic
ip6tables -A INPUT -p tcp --dport 22 -m conntrack --ctstate ESTABLISHED -j ACCEPT

# Check new SSH connections against the allowlist
ip6tables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW -j SSH-ALLOWLIST
```

## Layer 2: nftables

```bash
# nftables set-based SSH allowlist
table ip6 ssh_access {
    set allowed_prefixes {
        type ipv6_addr
        flags interval
        elements = {
            fd12:3456:789a::/48,
            2001:db8:200::/48,
            2001:db8:100::1/128
        }
    }

    chain input {
        type filter hook input priority 0;

        # Allow SSH from whitelisted prefixes
        tcp dport 22 ip6 saddr @allowed_prefixes accept

        # Log and drop all other SSH attempts
        tcp dport 22 limit rate 1/minute log prefix "SSH-DENIED: " level warn
        tcp dport 22 drop
    }
}
```

## Layer 3: sshd AllowUsers / Match Address (Application Level)

Defense in depth - restrict at the application level too:

```bash
# /etc/ssh/sshd_config
# Restrict SSH to specific IPv6 prefixes

# Method: AllowUsers with address restrictions
AllowUsers admin@fd12:3456:789a::/48 deploy@2001:db8:200::/48 *@fd12:3456:789a::/48

# Or use Match block for finer control:
# /etc/ssh/sshd_config
Match Address "*,!fd12:3456:789a::/48,!2001:db8:100::1"
    DenyUsers *

# Reload sshd
systemctl reload sshd   # Use "ssh" instead of "sshd" on Debian/Ubuntu
```

## Layer 4: TCP Wrappers (legacy systems only)

Only use this on legacy OpenSSH builds that still include `tcpwrappers/libwrap` support:

```bash
# /etc/hosts.deny
sshd: ALL

# /etc/hosts.allow
sshd: [fd12:3456:789a::]/48
sshd: [2001:db8:100::1]/128
```

## Combined: Port Knocking for Extra Security

```bash
# Port knocking: Only allow SSH after a sequence of port "knocks"
# Install knockd
apt install knockd

# /etc/knockd.conf
[openSSH-IPv6]
    sequence    = 7000,8000,9000
    seq_timeout = 15
    command     = ip6tables -A INPUT -s %IP% -p tcp --dport 22 -j ACCEPT
    tcpflags    = syn

[closeSSH-IPv6]
    sequence    = 9000,8000,7000
    seq_timeout = 15
    command     = ip6tables -D INPUT -s %IP% -p tcp --dport 22 -j ACCEPT
```

## Dynamic Management Prefixes

If management IPv6 addresses change (e.g., dynamic prefix from ISP):

```bash
# Update script for dynamic management IP
#!/bin/bash
# /usr/local/sbin/update-ssh-allowlist.sh

CURRENT_MGMT_IP=$(curl -6 -s https://api6.ipify.org)
STATE_FILE=/var/run/last-mgmt-ip.txt
LAST_MGMT_IP=$(cat "$STATE_FILE" 2>/dev/null)

# Remove old dynamic rules
if [ -n "$LAST_MGMT_IP" ]; then
  ip6tables -D INPUT -p tcp --dport 22 -s "${LAST_MGMT_IP}/128" -j ACCEPT 2>/dev/null
fi

# Add current IP
ip6tables -A INPUT -p tcp --dport 22 -s "${CURRENT_MGMT_IP}/128" -j ACCEPT

# Save new IP
echo "$CURRENT_MGMT_IP" > "$STATE_FILE"
```

## Verification

```bash
# Verify SSH rules are in place
ip6tables -S INPUT | grep -- '--dport 22'

# Test from allowed source
ssh admin@2001:db8:ffff::10   # Should work

# Test from disallowed source (should fail)
# From a different IPv6 address:
ssh -o ConnectTimeout=5 admin@2001:db8:ffff::10   # Should time out or connection refused

# Check SSH blocked connections in logs
grep "SSH-BLOCKED" /var/log/kern.log
journalctl -k | grep "SSH-DENIED"
```

## Summary

Restrict IPv6 SSH access using multiple layers: ip6tables rules that only accept TCP 22 from management prefixes (`-s fd12:3456:789a::/48`), nftables named sets for maintainable allowlists, and sshd `AllowUsers` with address restrictions for defense-in-depth. Always log blocked SSH attempts (`-m limit --limit 1/minute -j LOG --log-prefix "SSH-BLOCKED: "`) for monitoring. Use locally assigned ULA prefixes (`fd00::/8`) for management networks - per RFC 4193, these addresses are not expected to be routable on the global Internet. Add explicit DROP rules for SSH from everywhere else, placed AFTER the allow rules.
