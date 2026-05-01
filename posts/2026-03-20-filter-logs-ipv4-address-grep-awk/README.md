# How to Filter Logs by IPv4 Address Using grep and awk

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, IPv4, Log Analysis, Grep, Awk, Shell, Security

Description: Filter log files by IPv4 address using grep and awk one-liners, including exact match, CIDR range filtering, subnet filtering, and multi-file log analysis.

## Introduction

Filtering logs by IPv4 address is a daily task for operators. `grep` handles exact and pattern matches; `awk` provides field-based extraction and arithmetic for range comparisons. Combining them covers most log analysis scenarios.

## Exact IP Match with grep

```bash
# Find all log lines for a specific IP

grep '^203\.0\.113\.42 ' /var/log/nginx/access.log

# Anywhere in the line (e.g., syslog format)
grep -w '203\.0\.113\.42' /var/log/syslog

# Multiple IPs
grep -Ew '203\.0\.113\.42|198\.51\.100\.5' /var/log/nginx/access.log

# Case-insensitive search (for hex representations)
grep -i "c0a80101" /var/log/app.log
```

## IPv4 Pattern Matching

```bash
# Match IPv4-like dotted quads in a log line
IPV4_PATTERN='[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}'
grep -o "$IPV4_PATTERN" /var/log/nginx/access.log | sort -u

# Extended regex version
grep -oE '([0-9]{1,3}\.){3}[0-9]{1,3}' /var/log/nginx/access.log | sort | uniq -c | sort -rn
```

## Filter by /24 Subnet with grep

```bash
# All requests from 192.168.1.x
grep -E '^192\.168\.1\.[0-9]{1,3} ' /var/log/nginx/access.log

# Example /16 prefix match at start of line
grep -E '^10\.1\.[0-9]{1,3}\.[0-9]{1,3} ' /var/log/nginx/access.log
```

## awk for CIDR Range Filtering

```bash
# Filter lines where first field is in 10.1.0.0/16 (10.1.x.x)
awk -F'[. ]' '
  $1 == 10 && $2 == 1 {print}
' /var/log/nginx/access.log

# More precise - check all four octets
awk '
{
  n = split($1, ip, ".");
  if (n == 4 &&
      ip[1] ~ /^[0-9]+$/ && ip[1]+0 == 10 &&
      ip[2] ~ /^[0-9]+$/ && ip[2]+0 == 1 &&
      ip[3] ~ /^[0-9]+$/ && ip[3]+0 >= 0 && ip[3]+0 <= 255 &&
      ip[4] ~ /^[0-9]+$/ && ip[4]+0 >= 0 && ip[4]+0 <= 255)
    print
}
' /var/log/nginx/access.log
```

## Python CIDR Filter (for /22, /20, etc.)

```bash
python3 - << 'PYEOF'
import ipaddress

target_net = ipaddress.IPv4Network("10.64.0.0/20")

with open("/var/log/nginx/access.log") as f:
    for line in f:
        fields = line.split()
        if not fields:
            continue
        ip_str = fields[0]
        try:
            if ipaddress.IPv4Address(ip_str) in target_net:
                print(line, end="")
        except ValueError:
            pass
PYEOF
```

## Multi-File and Compressed Log Search

```bash
# Search across rotated logs
zgrep "203\.0\.113\.42" /var/log/nginx/access.log*

# Search gzipped logs
zgrep "203\.0\.113\.42" /var/log/nginx/access.log.*.gz

# Search all access logs recursively
find /var/log -type f -name "access.log*" -exec zgrep "203\.0\.113\.42" {} +
```

## Count Requests per Minute from IP

```bash
# Count requests from 203.0.113.42, grouped by minute
awk '$1 == "203.0.113.42" {
  print substr($4, 2, 17)
}' /var/log/nginx/access.log | sort | uniq -c
```

## Conclusion

`grep` with a fixed-string IP or anchored regex pattern is fastest for exact and prefix-based subnet searches. Use `awk` field splitting for CIDR comparisons involving multiple octets. For precise /20 or /22 subnet filtering, a short Python snippet using `ipaddress.IPv4Network` handles the bit math correctly. When rotated logs may be compressed, use `zgrep`; use `find` when you need recursive search.
