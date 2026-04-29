# How to Log IPv6 Client Addresses in Nginx

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Nginx, Logging, Access Logs, $remote_addr

Description: Learn how to properly log IPv6 client addresses in Nginx access logs, including handling IPv4-mapped addresses, using real_ip module, and configuring log formats for IPv6 analysis.

## Default IPv6 Address Logging

```nginx
http {
    # Default log format includes $remote_addr which captures IPv6 addresses
    log_format main '$remote_addr - $remote_user [$time_local] '
                    '"$request" $status $body_bytes_sent '
                    '"$http_referer" "$http_user_agent"';

    access_log /var/log/nginx/access.log main;

    server {
        listen [::]:80 ipv6only=on;
        listen 80;

        # $remote_addr automatically contains the IPv6 address
        # e.g.: 2001:db8::1234:5678 - - [20/Mar/2026:10:00:00 +0000] ...
    }
}
```

## Custom Log Format with IPv6

```nginx
http {
    # Extended log format with IPv6 details
    log_format ipv6_detailed '$remote_addr $remote_port '
                              '[$time_local] '
                              '"$request" $status $body_bytes_sent '
                              '"$http_referer" "$http_user_agent" '
                              '$request_time $upstream_addr '
                              '$upstream_response_time';

    # Include IP version in log (useful for analysis)
    map $remote_addr $ip_version {
        "~^::ffff:[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$" "IPv4";
        "~^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$"        "IPv4";
        default                                        "IPv6";
    }

    log_format with_version '$ip_version $remote_addr [$time_local] '
                             '"$request" $status';

    server {
        access_log /var/log/nginx/access.log with_version;
    }
}
```

## Handling IPv4-Mapped IPv6 Addresses

When a single IPv6 listen socket uses `ipv6only=off`, IPv4 clients can appear as `::ffff:192.168.1.1`:

```nginx
http {
    # Normalize IPv4-mapped IPv6 to IPv4 format in logs
    map $remote_addr $real_client_ip {
        # Strip ::ffff: prefix from IPv4-mapped addresses
        "~^::ffff:(?P<ip>[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})$"   $ip;
        default                                                                    $remote_addr;
    }

    log_format normalized '$real_client_ip [$time_local] "$request" $status';

    server {
        access_log /var/log/nginx/access.log normalized;
    }
}
```

## Log Real IP When Behind a Proxy

```nginx
http {
    # Use real_ip_header when behind a load balancer
    real_ip_header X-Forwarded-For;

    # Trust the load balancer's IPv6 address
    set_real_ip_from 2001:db8:100::/64;
    set_real_ip_from 192.168.1.0/24;  # IPv4 load balancer

    # real_ip_recursive = use the last non-trusted address from X-Forwarded-For
    real_ip_recursive on;

    log_format main '$remote_addr [$time_local] "$request" $status';
    # Now $remote_addr will be the actual client IP, not the LB

    server {
        listen [::]:80 ipv6only=on;
        listen 80;
    }
}
```

## Analyze IPv6 Addresses in Logs

```bash
# Count requests by IPv6 prefix (/64)

python3 - /var/log/nginx/access.log <<'PY'
import ipaddress
import sys
from collections import Counter

counts = Counter()

with open(sys.argv[1]) as f:
    for line in f:
        parts = line.split()
        if not parts:
            continue

        ip = parts[0]

        # Exclude IPv4 and IPv4-mapped IPv6 addresses.
        if ':' not in ip or ip.startswith("::ffff:"):
            continue

        prefix = ipaddress.ip_network(f"{ip}/64", strict=False)
        counts[str(prefix)] += 1

for prefix, count in counts.most_common(20):
    print(f"{count:7d} {prefix}")
PY

# Count unique IPv6 addresses
awk '$1 ~ /:/ && $1 !~ /^::ffff:/ {print $1}' \
    /var/log/nginx/access.log | sort -u | wc -l

# Show status codes for IPv6 clients
awk '$1 ~ /:/ && $1 !~ /^::ffff:/ {
    match($0, /" [0-9][0-9][0-9] /)
    if (RSTART) print substr($0, RSTART + 2, 3)
}' /var/log/nginx/access.log | sort | uniq -c
```

## JSON Log Format for IPv6

```nginx
http {
    log_format json_combined escape=json
        '{"time":"$time_iso8601",'
        '"client_ip":"$remote_addr",'
        '"method":"$request_method",'
        '"uri":"$request_uri",'
        '"status":$status,'
        '"bytes_sent":$body_bytes_sent,'
        '"user_agent":"$http_user_agent",'
        '"request_time":$request_time}';

    server {
        access_log /var/log/nginx/access_json.log json_combined;
    }
}
```

## Summary

Nginx automatically logs IPv6 client addresses via `$remote_addr` in access logs. With separate IPv4 and IPv6 listen sockets, such as `listen [::]:80 ipv6only=on;` and `listen 80;`, IPv6 clients appear as `2001:db8::10` rather than IPv4-mapped addresses. Use the `real_ip_module` (`set_real_ip_from`, `real_ip_header`) when Nginx is behind a proxy to capture the original client IP. Use a `map` block to normalize `::ffff:` IPv4-mapped addresses for consistent logging when requests arrive on an IPv6 socket configured with `ipv6only=off`. JSON log format makes IPv6 address parsing easier in log analysis tools.
