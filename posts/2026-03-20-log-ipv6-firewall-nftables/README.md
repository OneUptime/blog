# How to Log IPv6 Firewall Events with nftables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, nftables, Logging, Security, Monitoring

Description: Learn how to configure nftables logging for IPv6 firewall events using the log statement, including log flags, rate limiting, and sending logs to syslog and NFLOG.

## Overview

nftables provides a `log` statement for firewall event logging. Compared to ip6tables LOG target, nftables logging has a cleaner syntax and integrates well with systemd-journald. The `nft` CLI can export rulesets in JSON, and NFLOG consumers such as ulogd2 can write packet logs in JSON format. This guide covers nftables log configuration for IPv6 security monitoring.

## Basic nftables Log Statement

```bash
# Syntax: log [prefix "text"] [level <syslog-level>] [flags <flag[,flag...]>]

# Log before dropping

nft add rule ip6 filter input log prefix "IPv6-DROP: " drop
# NOTE: log statement must come BEFORE the terminal action

# Correct order (log THEN drop):
table ip6 filter {
    chain input {
        type filter hook input priority 0; policy drop;
        ...
        log prefix "IPv6-IN-DROP: " level warn drop
    }
}
```

## Log Statement Options

```bash
# Level options (syslog severity):
# emerg, alert, crit, err, warn (default), notice, info, debug

# Common flags:
# tcp sequence  - Log TCP sequence numbers
# tcp options   - Log TCP options
# ip options    - Log IPv4/IPv6 header options
# skuid         - Log UID of sending process
# ether         - Log Ethernet frame header
# all           - Log all flags

# Example with full options
nft add rule ip6 filter input \
  log prefix "IPv6-SCAN: " level info flags skuid
```

## Complete Logging Configuration

```bash
# /etc/nftables.d/ipv6-logging.nft

table ip6 filter {
    chain input {
        type filter hook input priority 0; policy drop;

        iif lo accept
        ct state established,related accept
        ct state invalid drop

        # Log and drop: Routing Header Type 0 (deprecated)
        # Use extension-header matching for IPv6 extension headers
        rt type 0 log prefix "IPv6-RH0: " level crit drop

        # Log and drop: example special-use sources on an Internet-facing interface
        ip6 saddr { ::/128, 2001:db8::/32, fc00::/7 } \
            log prefix "IPv6-BOGON: " level warn drop

        # Log rogue RA from non-link-local
        ip6 saddr != fe80::/10 icmpv6 type nd-router-advert \
            log prefix "ROGUE-RA: " level crit drop

        # Essential ICMPv6
        icmpv6 type packet-too-big accept
        icmpv6 type { destination-unreachable, time-exceeded, parameter-problem } accept
        icmpv6 type { nd-router-solicit, nd-router-advert, nd-neighbor-solicit, nd-neighbor-advert } accept

        # Log access to sensitive services
        tcp dport 22 log prefix "IPv6-SSH: " level info accept

        # Web traffic (log new connections only)
        tcp dport { 80, 443 } ct state new log prefix "IPv6-WEB-NEW: " level debug
        tcp dport { 80, 443 } accept

        # Log all remaining drops with rate limit
        limit rate 5/minute log prefix "IPv6-IN-DROP: " level warn
    }
}
```

## Rate-Limited Logging in nftables

```bash
# Method 1: limit before log+drop action
nft add rule ip6 filter input \
  limit rate 5/minute burst 10 packets \
  log prefix "IPv6-DROP: " level warn drop

# Method 2: Per-source rate limiting using a dynamic set
table ip6 log-control {
    set log_limit {
        type ipv6_addr
        timeout 1m
        flags dynamic
    }

    chain input {
        type filter hook input priority 1;

        # Log max 1 per second per source address
        update @log_limit { ip6 saddr limit rate 1/second } \
            log prefix "IPv6-DROP-RATE: " level warn
    }
}
```

## NFLOG: Send to Userspace

```bash
# NFLOG sends logs to a userspace consumer such as ulogd2
# Better for high-volume logging - doesn't fill kernel log

nft add rule ip6 filter input \
  log group 1 prefix "IPv6-DROP"

# Configure ulogd2 to receive group 1
# /etc/ulogd.conf:
# stack=log1:NFLOG,base1:BASE,ifi1:IFINDEX,ip2str1:IP2STR,mac2str1:HWHDR,json1:JSON
# [log1]
# group=1
# [json1]
# file="/var/log/ulogd.json"

# View JSON-formatted logs
tail -f /var/log/ulogd.json
```

## JSON Logging Format

```bash
# nftables can produce JSON-format rules for export
nft -j list ruleset   # List ruleset in JSON

# For actual packet log in JSON format, use ulogd2 with JSON plugin
# JSON log entry:
{
  "timestamp": "2026-03-20T14:23:01+0000",
  "oob.prefix": "IPv6-IN-DROP: ",
  "orig.ip6.saddr": "2001:db8:1::100",
  "orig.ip6.daddr": "2001:db8:1::1",
  "orig.ip6.protocol": 6,
  "orig.l4.sport": 52341,
  "orig.l4.dport": 22
}
```

## Log Parsing with journalctl

```bash
# nftables log via kernel, appears in journald
journalctl -k | grep "IPv6-DROP"

# Filter by prefix
journalctl -k -g "IPv6-DROP" --since "1 hour ago"

# Count drops by source
journalctl -k | grep "IPv6-DROP" | \
  grep -oP 'SRC=\K[^ ]+' | sort | uniq -c | sort -rn | head -20

# Real-time monitoring
journalctl -k -f | grep --line-buffered "IPv6"
```

## Forwarding Logs to SIEM

```bash
# rsyslog: Forward kernel IPv6 firewall logs
# /etc/rsyslog.d/30-ipv6-fw.conf
:msg, contains, "IPv6" action(type="omfwd" target="siem.internal" port="514" protocol="tcp")
:msg, contains, "IPv6" action(type="omfile" file="/var/log/ipv6-fw.log")

# Reload rsyslog
systemctl restart rsyslog
```

## Summary

nftables log statement syntax: `log [prefix "..."] [level <syslog>] [flags <flag[,flag...]>]`. Place `log` BEFORE the terminal action (accept/drop). Use `limit rate 5/minute` before `log` to prevent flooding during attacks. For high-volume logging, use `log group N` (NFLOG) with ulogd2 to capture logs in userspace, optionally in JSON format. Log IPv6-specific threats: rogue RA (`ip6 saddr != fe80::/10 icmpv6 type nd-router-advert`), Routing Header Type 0 packets (`rt type 0`), and special-use sources where appropriate for your interface. Forward logs to SIEM via rsyslog TCP syslog for centralized analysis.
