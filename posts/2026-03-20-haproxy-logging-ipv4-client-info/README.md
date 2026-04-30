# How to Set Up HAProxy Logging with IPv4 Client Information

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HAProxy, Logging, IPv4, Syslog, Configuration, Monitoring, Troubleshooting

Description: Learn how to configure HAProxy to log detailed IPv4 client information including source address, connection counts, and request details to syslog.

---

HAProxy's logging system writes connection and request details to syslog. Capturing the client IPv4 address in logs is essential for debugging, security auditing, and traffic analysis.

## Configuring the Syslog Target

HAProxy sends logs to syslog via a Unix socket or UDP. The most common setup uses `rsyslog` on Linux.

```haproxy
# /etc/haproxy/haproxy.cfg

global
    # Send logs to the local rsyslog socket
    log /dev/log local0 info

    # Or send to a remote syslog server over UDP
    # log 192.168.1.100:514 local0 notice
```

```rsyslog
# /etc/rsyslog.d/49-haproxy.conf

# Write HAProxy messages to a dedicated log file
if ($programname == "haproxy") then {
    action(type="omfile" file="/var/log/haproxy.log")
    stop
}
```

## HTTP Log Format

HAProxy's built-in `httplog` option includes the client IP as the first field.

```haproxy
defaults
    mode http
    log global
    option httplog           # Enable detailed HTTP logging
    option dontlognull       # Skip logging connections with no data transfer, such as probes
```

A typical HTTP log line:

```yaml
haproxy[1234]: 203.0.113.10:54321 [19/Mar/2026:12:00:00.123] http_in~ web_servers/app1 0/0/1/22/23 200 1024 - - ---- 10/8/0/1/0 0/0 "GET /index.html HTTP/1.1"
```

Field breakdown: `client_ip:port`, `timestamp`, `frontend`, `backend/server`, `timers`, `status`, `bytes`, `termination flags`, `connections`, `request`.

## Custom Log Format with Client IP Fields

```haproxy
global
    log /dev/log local0

defaults
    mode http
    log global

    # Custom log format including client IP, frontend/backend names, timers, status, and request line
    log-format "%ci:%cp [%t] %ft %b/%s %Tq/%Tw/%Tc/%Tr/%Ta %ST %B %tsc %{+Q}r"
```

Key format specifiers:
- `%ci` - Client source IP address
- `%cp` - Client port
- `%ft` - Frontend name
- `%b/%s` - Backend and server name
- `%ST` - HTTP status code
- `%B` - Bytes sent from server to client
- `%Tr` - Time to receive the complete response headers from the server

## TCP Mode Logging

For TCP proxies, use `tcplog` instead of `httplog`.

```haproxy
defaults
    mode tcp
    log global
    option tcplog

frontend db_proxy
    bind 0.0.0.0:3306
    default_backend mysql_cluster
```

## Capturing Forwarded Client IP Information from X-Forwarded-For

When HAProxy is behind another trusted load balancer or proxy, capture the forwarded header value:

```haproxy
frontend http_in
    bind 0.0.0.0:80
    mode http

    # Capture the X-Forwarded-For header value into logs
    http-request capture req.hdr(X-Forwarded-For) len 40

    log-format "%ci [%t] XFF=%[capture.req.hdr(0)] %r %ST"
    default_backend app_servers
```

## Viewing Logs

```bash
# Tail HAProxy logs in real time
tail -f /var/log/haproxy.log

# Filter for a specific client IPv4 address
grep "203.0.113.10" /var/log/haproxy.log

# Count requests per client IPv4 address from standard HTTP log lines
grep -oE '([0-9]{1,3}\.){3}[0-9]{1,3}:[0-9]+ \[' /var/log/haproxy.log | cut -d: -f1 | sort | uniq -c | sort -rn | head -20
```

## Key Takeaways

- Use `option httplog` for HTTP mode and `option tcplog` for TCP mode to enable detailed logging.
- `%ci` is the client source IP address field in custom `log-format` strings.
- Send logs to rsyslog and write a dedicated HAProxy log file for easier analysis.
- Use `http-request capture` to log header values like `X-Forwarded-For`.
