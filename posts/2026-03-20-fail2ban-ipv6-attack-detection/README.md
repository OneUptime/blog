# How to Configure Fail2Ban for IPv6 Attack Detection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Fail2Ban, Security, Brute Force, Linux

Description: Configure Fail2Ban to detect and block brute force attacks from IPv6 addresses by using ip6tables actions, writing IPv6-compatible filters, and tuning ban policies for IPv6 subnets.

## Introduction

Fail2Ban monitors log files for failed authentication attempts and blocks source IPs using firewall rules. IPv6 support requires an IPv6-capable ban action. In current Fail2Ban releases, the `iptables` action family switches to `ip6tables` automatically for IPv6 bans, and `nftables` can handle both address families in one ruleset. This guide covers enabling IPv6 support, configuring jails for IPv6, and writing IPv6-aware filters.

## Step 1: Check Fail2Ban IPv6 Readiness

```bash
# Check current Fail2Ban version (>= 0.10 for IPv6 host matching)

fail2ban-client -V

# Check whether IPv6 is allowed (default: allowipv6 = auto)
grep -n "^#\\?allowipv6" /etc/fail2ban/fail2ban.conf

# Check available actions
ls /etc/fail2ban/action.d/ | grep -E "^(iptables|nftables)"

# Verify either ip6tables or nft is available
command -v ip6tables || command -v nft
```

## Step 2: Verify the Firewall Action Supports IPv6

The built-in `iptables` action family in current Fail2Ban releases handles IPv6 through its `[Init?family=inet6]` section, which switches the command to `ip6tables`. Verify:

```bash
# Check the iptables action switches to ip6tables for IPv6 bans
grep -n "family=inet6" /etc/fail2ban/action.d/iptables.conf

# If you prefer nftables, verify it uses an inet table by default
grep -n "table_family = inet" /etc/fail2ban/action.d/nftables.conf
```

## Step 3: Configure Jails for IPv6

```ini
# /etc/fail2ban/jail.local

[DEFAULT]
# Use bantime, findtime, maxretry defaults
bantime  = 3600
findtime = 600
maxretry = 5

# Use current iptables actions
banaction = iptables[type=multiport]
banaction_allports = iptables[type=allports]

# Fail2Ban 0.10+ matches IPv6 addresses, and the iptables action
# switches to ip6tables automatically for IPv6 bans when allowipv6 is enabled

[sshd]
enabled  = true
port     = ssh
filter   = sshd
# Debian/Ubuntu path; adjust for other distributions
logpath  = /var/log/auth.log
maxretry = 3
# Ban for 24 hours after 3 failed attempts
bantime  = 86400

[nginx-http-auth]
enabled  = true
port     = http,https
filter   = nginx-http-auth
logpath  = /var/log/nginx/error.log
maxretry = 5

[nginx-botsearch]
enabled  = true
port     = http,https
filter   = nginx-botsearch
logpath  = /var/log/nginx/access.log
maxretry = 2
```

## Step 4: Write IPv6-Compatible Filters

Fail2Ban filters use Python regex patterns. Built-in filters such as `sshd`, `nginx-http-auth`, and `nginx-botsearch` already support IPv6 when they use `<HOST>` or `<ADDR>`. Only custom filters that hard-code IPv4 dotted-decimal patterns need updating:

```ini
# /etc/fail2ban/filter.d/sshd-ipv6.conf
# Example custom sshd filter using <HOST>; no IPv6-specific regex is required

[INCLUDES]
before = common.conf

[Definition]
_daemon = sshd

failregex = ^%(__prefix_line)sFailed \S+ for .* from <HOST>(?: port \d+)?(?: ssh\d*)?(?: \[preauth\])?\s*$
            ^%(__prefix_line)sUser .+ from <HOST> not allowed because not listed in AllowUsers(?: \[preauth\])?\s*$

# <HOST> in Fail2Ban matches both IPv4 and IPv6 addresses

ignoreregex =
```

```ini
# /etc/fail2ban/filter.d/nginx-ipv6.conf
# Example custom Nginx access-log filter using <HOST>

[Definition]
failregex = ^<HOST> \S+ \S+ \[[^]]+\] "(?:GET|POST|HEAD|PUT|DELETE) [^"]+ HTTP/\d\.\d" (?:400|401|403|404|429) \d+

ignoreregex =
```

## Step 5: Whitelist IPv6 Prefixes

```ini
# /etc/fail2ban/jail.local - add IPv6 whitelist
# Example prefixes: loopback, RFC1918, ULA, and a documentation-only management subnet

[DEFAULT]
ignoreip = 127.0.0.1/8 ::1
           10.0.0.0/8 172.16.0.0/12 192.168.0.0/16
           fc00::/7
           2001:db8:100::/48
```

## Step 6: Test and Monitor IPv6 Bans

```bash
# Test the built-in sshd filter against a log file
fail2ban-regex /var/log/auth.log sshd

# Manually test an IPv6 log line
fail2ban-regex \
    "Mar 20 10:00:00 host sshd[1234]: Failed password for root from 2001:db8::1 port 54321 ssh2" \
    sshd

# Check current bans (includes IPv6)
fail2ban-client status sshd

# Manually ban an IPv6 address
fail2ban-client set sshd banip 2001:db8::1

# Unban an IPv6 address
fail2ban-client set sshd unbanip 2001:db8::1

# Check ip6tables ban rules
ip6tables -L f2b-sshd -n -v
```

## Step 7: nftables Action (Modern Alternative)

```ini
# Use nftables instead of ip6tables for unified IPv4/IPv6 banning
# /etc/fail2ban/jail.local

[DEFAULT]
banaction = nftables[type=multiport]
banaction_allports = nftables[type=allports]
```

nftables handles IPv4 and IPv6 in the same ruleset, simplifying dual-stack ban management.

## Conclusion

Fail2Ban supports IPv6 brute force detection through its `<HOST>` placeholder in filter regexes, which matches both IPv4 and IPv6 addresses. Use an IPv6-capable ban action such as `iptables[type=multiport]` or `nftables[type=multiport]` for IPv6 blocking. Whitelist internal IPv6 prefixes (ULA `fc00::/7`, loopback `::1`) in `ignoreip` to prevent accidental self-blocking. Test filters with `fail2ban-regex` against real log lines containing IPv6 addresses to verify detection before enabling in production.
