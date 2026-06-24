# How to Log IPv6 Client Addresses in Apache

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Apache, Logging, Access Logs, CustomLog

Description: Learn how to log IPv6 client addresses in Apache access logs, customize log formats for IPv6 analysis, and handle IPv4-mapped addresses from dual-stack configurations.

## Default Apache Logging for IPv6

Apache logs IPv6 client addresses with the default combined log format when `HostnameLookups` is left at its default `Off` setting:

```apache
# Default combined log format

LogFormat "%h %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-Agent}i\"" combined

# %h = remote host; with HostnameLookups Off (default), Apache logs the client IP
# In dual-stack setups, IPv6 clients appear with their IPv6 address
```

## Sample IPv6 Access Log Entries

```text
# IPv6 access log entries look like:
2001:db8::10 - - [20/Mar/2026:10:00:00 +0000] "GET / HTTP/1.1" 200 1234 "-" "Mozilla/5.0"
::1 - - [20/Mar/2026:10:00:01 +0000] "GET /health HTTP/1.1" 200 12 "-" "curl/7.88.1"

# IPv4 clients accepted on an IPv6 socket are still logged in IPv4 form:
192.168.1.10 - - [20/Mar/2026:10:00:02 +0000] "GET / HTTP/1.1" 200 1234 "-" "..."
```

## Custom Log Format with IP Version

```apache
# Add IP version indicator to logs
<IfModule log_config_module>
    # IPv6-enhanced log format
    LogFormat "%a %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-Agent}i\" %{IPV}e" combined_ipv6

    # Set environment variable based on remote address
    SetEnvIf Remote_Addr ":" IPV=6
    SetEnvIf Remote_Addr "^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$" IPV=4

    CustomLog ${APACHE_LOG_DIR}/access.log combined_ipv6
</IfModule>
```

## Separate Log Files for IPv4 and IPv6

```apache
<VirtualHost *:80>
    ServerName example.com

    # Set environment for IPv6 detection
    SetEnvIf Remote_Addr ":" IS_IPV6
    SetEnvIf Remote_Addr "^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$" IS_IPV4

    # Separate access logs
    CustomLog ${APACHE_LOG_DIR}/access-ipv4.log combined env=IS_IPV4
    CustomLog ${APACHE_LOG_DIR}/access-ipv6.log combined env=IS_IPV6

    DocumentRoot /var/www/example
</VirtualHost>
```

## Log with X-Forwarded-For (When Behind Proxy)

```apache
# When behind a load balancer, enable mod_remoteip for real client IP
<IfModule mod_remoteip.c>
    RemoteIPHeader X-Forwarded-For

    # Trust IPv6 load balancer addresses
    RemoteIPTrustedProxy 2001:db8:100::/64
    RemoteIPTrustedProxy 192.168.1.0/24
</IfModule>

# Use %a to log the client IP after mod_remoteip processing
LogFormat "%a %l %u %t \"%r\" %>s %b" combined_real
# %a = Client IP after mod_remoteip processing
# %{c}a = Connection IP (actual TCP peer, before mod_remoteip)
```

## Analyze IPv6 Logs

```bash
# Count requests by IPv6 prefix (/64)
awk '{print $1}' /var/log/apache2/access.log | \
    grep ':' | \
    python3 -c "
import sys
import ipaddress
from collections import Counter
c = Counter()
for line in sys.stdin:
    addr = line.strip()
    try:
        ip = ipaddress.ip_address(addr)
        if isinstance(ip, ipaddress.IPv6Address):
            net = ipaddress.IPv6Network((ip, 64), strict=False)
            c[str(net)] += 1
    except ValueError:
        pass
for net, count in c.most_common(20):
    print(count, net)
"

# Find most active IPv6 addresses
awk '{print $1}' /var/log/apache2/access.log | \
    grep ':' | sort | uniq -c | sort -rn | head -n 20

# Count IPv4 vs IPv6 requests
echo "IPv4: $(awk '{print $1}' /var/log/apache2/access.log | grep -Ec '^[0-9]+(\.[0-9]+){3}$')"
echo "IPv6: $(awk '{print $1}' /var/log/apache2/access.log | grep -c ':')"
```

## Summary

With `HostnameLookups Off` (the default), Apache logs IPv6 client addresses via `%h` in the standard combined format. If Apache accepts IPv4 connections on an IPv6 socket, those clients are still logged in IPv4 form rather than as `::ffff:`-mapped addresses. Use `SetEnvIf Remote_Addr ":"` to detect IPv6 clients and `SetEnvIf Remote_Addr "^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$"` for IPv4 clients when routing to separate log files or adding an IP version field. When behind a proxy, use `mod_remoteip` with `RemoteIPTrustedProxy 2001:db8:100::/64` and log `%a` for the client IP; use `%{c}a` for the underlying TCP peer.
