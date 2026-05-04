# How to Configure Nginx Access Log IPv6 Client Tracking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Nginx, IPv6, Access Logging, Analytics, Log Analysis, Web Server

Description: Configure Nginx access logs to properly capture and format IPv6 client addresses, and set up log analysis to track IPv6 traffic patterns and debug connection issues.

---

Nginx captures IPv6 client addresses in the `$remote_addr` variable. However, log formats and analysis tools may need adjustments to handle the colon-containing IPv6 address format. This guide covers proper logging and analysis for IPv6 clients.

## Nginx Log Format for IPv6

```nginx
# /etc/nginx/nginx.conf

http {
    # Custom format equivalent to the built-in combined format
    # $remote_addr shows IPv6 address like 2001:db8::1
    # Note: 'combined' is predefined by nginx and cannot be redefined
    log_format main '$remote_addr - $remote_user [$time_local] '
                    '"$request" $status $body_bytes_sent '
                    '"$http_referer" "$http_user_agent"';

    # Enhanced format with more IPv6-relevant fields
    log_format enhanced '$remote_addr '
                        '$remote_port '
                        '[$time_local] '
                        '"$request" '
                        '$status '
                        '$body_bytes_sent '
                        '"$http_user_agent" '
                        '$request_time '
                        '$upstream_response_time '
                        '$pipe';

    # JSON format for structured log processing (ELK, Loki, etc.)
    log_format json_log escape=json
                        '{'
                        '"time":"$time_iso8601",'
                        '"remote_addr":"$remote_addr",'
                        '"remote_port":"$remote_port",'
                        '"method":"$request_method",'
                        '"uri":"$uri",'
                        '"args":"$args",'
                        '"status":"$status",'
                        '"bytes_sent":"$bytes_sent",'
                        '"http_user_agent":"$http_user_agent",'
                        '"http_referer":"$http_referer",'
                        '"request_time":"$request_time",'
                        '"protocol":"$server_protocol"'
                        '}';

    server {
        listen [::]:80;
        server_name yourdomain.com;

        access_log /var/log/nginx/access.log json_log;
        error_log /var/log/nginx/error.log warn;
    }
}
```

## Handling X-Forwarded-For with IPv6

When behind a load balancer, IPv6 addresses in X-Forwarded-For headers need proper handling:

```nginx
# /etc/nginx/conf.d/real-ip.conf

# Set trusted IPv6 proxies

set_real_ip_from 2001:db8::/48;  # IPv6 load balancer subnet
set_real_ip_from 127.0.0.1;
set_real_ip_from ::1;

# Use X-Forwarded-For to get real client IP
real_ip_header X-Forwarded-For;

# Recursive replacement (useful when multiple proxies)
real_ip_recursive on;
```

```nginx
# Log the actual client IP vs proxy IP
log_format proxy_log '$remote_addr (actual: $realip_remote_addr) '
                     '[$time_local] "$request" $status';
```

## Analyzing IPv6 Access Logs

```bash
#!/bin/bash
# analyze_ipv6_logs.sh - Analyze Nginx logs for IPv6 traffic

LOG_FILE="/var/log/nginx/access.log"

echo "=== IPv6 Traffic Analysis ==="

# Count IPv6 vs IPv4 requests
echo ""
echo "Traffic by IP version:"
awk '{
  ip = $1
  if (ip ~ /:/) { ipv6++ } else { ipv4++ }
}
END {
  print "IPv6 requests: " ipv6
  print "IPv4 requests: " ipv4
  printf "IPv6 percentage: %.1f%%\n", (ipv6/(ipv4+ipv6))*100
}' "$LOG_FILE"

# Top IPv6 client addresses
echo ""
echo "Top 10 IPv6 clients:"
awk '{
  ip = $1
  if (ip ~ /:/) print ip
}' "$LOG_FILE" | sort | uniq -c | sort -rn | head -10

# IPv6 /64 prefix analysis (subnets)
echo ""
echo "Top IPv6 /64 prefixes:"
awk '{
  ip = $1
  if (ip ~ /:/) {
    # Extract first 4 groups (64-bit prefix)
    n = split(ip, parts, ":")
    prefix = parts[1] ":" parts[2] ":" parts[3] ":" parts[4]
    print prefix
  }
}' "$LOG_FILE" | sort | uniq -c | sort -rn | head -10
```

## Real-Time IPv6 Log Monitoring

```bash
# Monitor IPv6 traffic in real-time
tail -f /var/log/nginx/access.log | awk '{
  ip = $1
  if (ip ~ /:/) {
    print "\033[0;36m[IPv6]\033[0m " $0
  } else {
    print "\033[0;33m[IPv4]\033[0m " $0
  }
}'

# Count IPv6 request rate
watch -n 5 'tail -n 1000 /var/log/nginx/access.log | \
  awk "{ip=\$1; if(ip~/:/){ipv6++}else{ipv4++}} \
  END{print \"IPv6:\",ipv6,\"IPv4:\",ipv4}"'
```

## Log Rotation for High-Volume IPv6 Logs

```bash
# /etc/logrotate.d/nginx
/var/log/nginx/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        # Reopen logs after rotation
        if [ -f /var/run/nginx.pid ]; then
            kill -USR1 `cat /var/run/nginx.pid`
        fi
    endscript
}
```

Properly configured Nginx access logging for IPv6 clients provides the data needed for traffic analysis, debugging, and security monitoring, with JSON log formats making it easy to integrate with modern log aggregation systems.
