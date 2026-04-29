# How to Log IPv6 Firewall Events with ip6tables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Ip6tables, Logging, Security, Monitoring

Description: Learn how to configure ip6tables logging for IPv6 firewall events, including log targets, rate limiting logs, and parsing IPv6 firewall log entries.

## Overview

ip6tables logging uses the LOG target to write firewall events to the kernel log (dmesg/syslog). For IPv6 security monitoring, it's important to log dropped traffic, suspicious patterns, and access to sensitive services. This guide covers LOG target configuration, log format interpretation, and best practices for IPv6 firewall logging.

## Basic Logging Rules

```bash
# Log all INPUT drops (place BEFORE your final DROP rule)

ip6tables -A INPUT -j LOG --log-prefix "IPv6-IN-DROP: " --log-level 4

# Log all FORWARD drops
ip6tables -A FORWARD -j LOG --log-prefix "IPv6-FWD-DROP: " --log-level 4

# Log specific service access (for audit)
ip6tables -A INPUT -p tcp --dport 22 -j LOG --log-prefix "IPv6-SSH-ACCESS: " --log-level 6
```

## LOG Target Options

```bash
# Log options:
# --log-prefix "prefix: "   Text prefix for log entries (up to 29 chars)
# --log-level <level>       syslog level: 0=emerg, 1=alert, 2=crit, 3=error, 4=warning, 5=notice, 6=info, 7=debug
# --log-ip-options          Log IP/IPv6 header options and extension-header details
# --log-tcp-options         Log TCP flags and options
# --log-tcp-sequence        Log TCP sequence numbers (security sensitive)
# --log-uid                 Log UID of the local process/socket when available

# Full example with options
ip6tables -A INPUT -p tcp --dport 22 \
  -j LOG \
  --log-prefix "SSH-IN: " \
  --log-level 6 \
  --log-tcp-options
```

## Log Format: Understanding IPv6 Log Entries

```text
Mar 20 14:23:01 host kernel: [12345.678901] IPv6-IN-DROP: IN=eth0 OUT= MAC=...
  SRC=2001:db8:1::100 DST=2001:db8:1::1
  LEN=60 TC=0 HOPLIMIT=64 FLOWLBL=0
  PROTO=TCP SPT=52341 DPT=22 WINDOW=65535 RES=0x00 SYN URGP=0

Fields:
  IN=eth0        Interface received on
  SRC=           Source IPv6 address
  DST=           Destination IPv6 address
  LEN=           Packet length
  TC=            Traffic Class (DSCP/ECN)
  HOPLIMIT=      IPv6 Hop Limit (TTL equivalent)
  FLOWLBL=       Flow Label
  PROTO=TCP      Upper-layer protocol
  SPT=           Source port
  DPT=           Destination port
  SYN            TCP SYN flag set
```

## Rate-Limited Logging (Prevent Log Flooding)

```bash
# Without rate limiting, a DDoS can flood your logs
# Add rate limiting BEFORE the LOG target

# Log max 5 entries per minute per rule
ip6tables -A INPUT \
  -m limit --limit 5/minute --limit-burst 10 \
  -j LOG --log-prefix "IPv6-IN-DROP: " --log-level 4

# The DROP rule AFTER logging (matches remaining packets without logging)
ip6tables -A INPUT -j DROP
```

## Per-Source Rate Limiting of Logs

```bash
# Log max 1 entry per second per source IP
ip6tables -A INPUT \
  -m hashlimit \
  --hashlimit-name IPv6-DROP \
  --hashlimit-upto 1/sec \
  --hashlimit-burst 5 \
  --hashlimit-mode srcip \
  -j LOG --log-prefix "IPv6-IN-DROP: "
```

## Structured Logging with NFLOG

For better log processing, use NFLOG which sends to userspace:

```bash
# Install
apt install ulogd2 ulogd2-json

# Use NFLOG target
ip6tables -A INPUT -j NFLOG --nflog-prefix "IPv6-DROP" --nflog-group 1

# Configure ulogd2 to write JSON to file
# /etc/ulogd.conf (uncomment/add):
# stack=log2:NFLOG,base1:BASE,ifi1:IFINDEX,ip2str1:IP2STR,mac2str1:HWHDR,json1:JSON
# [log2]
# group=1
# [json1]
# sync=1
# file="/var/log/ulog/ipv6-firewall.json"
```

## Parsing IPv6 Logs

```bash
# Extract dropped IPv6 source addresses
grep "IPv6-IN-DROP" /var/log/kern.log | \
  grep -oP 'SRC=\K[^ ]+' | sort | uniq -c | sort -rn | head -20

# Find most common blocked ports
grep "IPv6-IN-DROP" /var/log/kern.log | \
  grep -oP 'DPT=\K[0-9]+' | sort | uniq -c | sort -rn | head -10

# Check for scans (many different destination ports)
grep "IPv6-IN-DROP" /var/log/kern.log | \
  grep -oP 'SRC=\K[^ ]+|DPT=\K[0-9]+' | \
  awk 'NR%2{src=$0;next}{print src, $0}' | sort | uniq -c
```

## Complete Logging Setup

```bash
#!/bin/bash
# Add comprehensive IPv6 logging

# Log suspicious extension headers before drop
ip6tables -A INPUT -m rt --rt-type 0 \
  -j LOG --log-prefix "IPv6-RH0-ATTACK: " --log-level 3
ip6tables -A INPUT -m rt --rt-type 0 -j DROP

# Log Router Advertisements from non-link-local sources (rogue RA detection)
ip6tables -A INPUT ! -s fe80::/10 -p icmpv6 --icmpv6-type 134 \
  -j LOG --log-prefix "ROGUE-RA: " --log-level 3

# Log unexpected ULA sources on internet-facing interfaces
ip6tables -A INPUT -s fc00::/7 \
  -m limit --limit 10/min \
  -j LOG --log-prefix "IPv6-ULA-SRC: " --log-level 4

# Log drops with rate limiting
ip6tables -A INPUT \
  -m limit --limit 5/min --limit-burst 10 \
  -j LOG --log-prefix "IPv6-INPUT-DROP: " --log-level 4
```

## Sending Logs to SIEM

```bash
# Configure rsyslog to forward kernel firewall logs
# /etc/rsyslog.d/ipv6-fw.conf
:msg, contains, "IPv6" @siem.example.com:514

# Use TCP for more reliable delivery
:msg, contains, "IPv6" @@siem.example.com:514
```

## Summary

ip6tables LOG target writes IPv6 firewall events to the kernel log with configurable prefix and syslog level. Always add rate limiting (`-m limit --limit 5/min`) to LOG rules to prevent log flooding during attacks. Place LOG rules BEFORE the final DROP rule. For IPv6-specific monitoring, log: RH0 packets (`-m rt --rt-type 0`), Router Advertisements from non-link-local sources (rogue RA detection), and unexpected ULA source addresses (`fc00::/7`) on internet-facing interfaces. Forward logs to a SIEM with rsyslog for centralized analysis and alerting.
