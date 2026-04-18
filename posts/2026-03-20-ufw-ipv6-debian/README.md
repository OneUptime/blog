# How to Configure UFW for IPv6 on Debian

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, UFW, Debian, Firewall, Linux

Description: Learn how to configure UFW (Uncomplicated Firewall) to handle IPv6 on Debian-based systems, including enabling IPv6 support, rule syntax, and application profiles.

## Overview

UFW (Uncomplicated Firewall) is a user-friendly front-end for iptables/ip6tables on Debian-based distributions. By default, UFW handles both IPv4 and IPv6 when configured correctly. This guide covers enabling IPv6 in UFW, writing IPv6-specific rules, and verifying that IPv6 traffic is properly controlled.

## Enabling IPv6 in UFW

```bash
# Check if UFW is installed

ufw version

# Install if needed
apt install ufw

# Enable IPv6 support in UFW configuration
grep IPV6 /etc/default/ufw
# Should show: IPV6=yes

# If not, enable it
sed -i 's/^IPV6=.*/IPV6=yes/' /etc/default/ufw

# Verify
cat /etc/default/ufw | grep IPV6
# IPV6=yes
```

## Basic UFW Configuration

```bash
# Set default policies
ufw default deny incoming   # Drop all inbound
ufw default allow outgoing  # Allow all outbound
ufw default deny routed     # Drop all forwarded/routed traffic

# Enable UFW
ufw enable

# Check status
ufw status verbose
```

## Adding IPv6-Specific Rules

### Allow Services

```bash
# Allow SSH from everywhere (IPv4 and IPv6)
ufw allow 22/tcp

# Allow SSH from IPv6 management network only
ufw allow from fd00:abcd::/48 to any port 22 proto tcp

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Allow a specific IPv6 address
ufw allow from 2001:db8::1 to any port 22

# Allow a specific IPv6 prefix
ufw allow from 2001:db8:1::/48 to any
```

### Allow DNS (if running a DNS server)

```bash
ufw allow 53/tcp
ufw allow 53/udp
```

### Allow ICMPv6 (Critical)

UFW has limited ICMPv6 control - you need to edit its before-rules:

```bash
# Edit /etc/ufw/before6.rules to add/modify ICMPv6 rules
# The default before6.rules already includes essential ICMPv6
cat /etc/ufw/before6.rules | grep icmp6
```

Default `/etc/ufw/before6.rules` includes these ICMPv6 allowances:
- All ICMPv6 error types
- NDP (router/neighbor solicitation and advertisement)
- MLD

To add custom ICMPv6 rate limiting:

```bash
# Edit /etc/ufw/before6.rules
# Find the icmp section and modify:
# -A ufw6-before-input -p icmpv6 --icmpv6-type echo-request -m limit --limit 5/s -j ACCEPT
```

## Viewing and Managing Rules

```bash
# List all rules with numbering
ufw status numbered

# Sample output:
#      To                         Action      From
#      --                         ------      ----
# [ 1] 22/tcp                     ALLOW IN    Anywhere
# [ 2] 80/tcp                     ALLOW IN    Anywhere
# [ 3] 443/tcp                    ALLOW IN    Anywhere
# [ 4] 22/tcp (v6)                ALLOW IN    Anywhere (v6)
# [ 5] 80/tcp (v6)                ALLOW IN    Anywhere (v6)
# [ 6] 443/tcp (v6)               ALLOW IN    Anywhere (v6)

# Note: UFW automatically creates IPv4 and IPv6 rules when IPV6=yes

# Delete a rule by number
ufw delete 1

# Delete by specification
ufw delete allow 80/tcp
```

## IPv6-Specific Blocking

```bash
# Block specific IPv6 address
ufw deny from 2001:db8:bad::/48

# Block IPv6 to specific port
ufw deny from 2001:db8:bad::1 to any port 80

# Block all IPv6 from a specific prefix
ufw deny from 2001:db8::/32
```

## Application Profiles

UFW supports named profiles from `/etc/ufw/applications.d/`:

```bash
# List available profiles
ufw app list

# Get info about a profile
ufw app info OpenSSH

# Allow a named application
ufw allow OpenSSH
ufw allow "Nginx Full"   # Allows both port 80 and 443
```

## Logging Configuration

```bash
# Enable UFW logging
ufw logging on

# Set logging level
ufw logging low    # Log blocked connections
ufw logging medium # Log blocked + new allowed
ufw logging high   # Log all

# View UFW logs
journalctl -u ufw
# or
tail -f /var/log/ufw.log
```

## Advanced: Direct iptables/ip6tables Rules via UFW

For rules UFW doesn't support natively, add them to `/etc/ufw/after6.rules`:

```bash
# /etc/ufw/after6.rules - Add before COMMIT line:

# Block Routing Header Type 0
-A ufw6-after-forward -m rt --rt-type 0 -j DROP
-A ufw6-after-input  -m rt --rt-type 0 -j DROP

# Rate limit SSH connections per source
-A ufw6-after-input -p tcp --dport 22 -m recent --name SSH6 --rcheck --seconds 60 --hitcount 4 -j DROP
-A ufw6-after-input -p tcp --dport 22 -m recent --name SSH6 --set

COMMIT
```

```bash
# Reload UFW after editing rule files
ufw reload
```

## Summary

UFW handles IPv6 automatically when `IPV6=yes` in `/etc/default/ufw`. Use `ufw allow` with IPv6 addresses and prefixes for service rules. For ICMPv6 customization, edit `/etc/ufw/before6.rules`. Essential ICMPv6 types are already allowed in the default UFW rules - verify with `cat /etc/ufw/before6.rules`. For advanced rules (RH0 blocking, per-IP rate limiting), add to `/etc/ufw/after6.rules`. Use `ufw status numbered` to see all active rules, including automatically generated IPv6 counterparts.
