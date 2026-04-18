# How to Troubleshoot Reverse Proxy IPv4 Connection Timeouts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Reverse Proxy, Timeout, IPv4, Nginx, HAProxy, Troubleshooting

Description: Diagnose and fix IPv4 connection timeout errors in Nginx and HAProxy reverse proxies, including upstream connect timeouts, read timeouts, and client idle timeouts.

## Introduction

Timeout errors in reverse proxies typically manifest as 502 Bad Gateway, 503 Service Unavailable, or 504 Gateway Timeout. Each timeout has a specific meaning and requires a different fix. Understanding the timeout chain - from client to proxy to backend - is essential for diagnosis.

## Nginx Timeout Types

| Directive | Default | Triggers |
|---|---|---|
| `proxy_connect_timeout` | 60s | Backend TCP connection time |
| `proxy_send_timeout` | 60s | Time between writes to backend |
| `proxy_read_timeout` | 60s | Time to wait for backend response |
| `keepalive_timeout` | 75s | Client idle connection timeout |
| `client_header_timeout` | 60s | Time to receive request headers |
| `client_body_timeout` | 60s | Time to receive request body |

## Diagnosing Nginx Timeout Errors

```bash
# Check error log for timeout messages

sudo tail -f /var/log/nginx/error.log | grep -i timeout

# Common messages:
# upstream timed out (110: Connection timed out) → proxy_read_timeout
# connect() failed (110: Connection timed out) → proxy_connect_timeout (backend down)
# upstream sent invalid header → backend crashing

# Check access log for 502/504 status codes
sudo tail -f /var/log/nginx/access.log | grep ' 5[0-9][0-9] '
```

## Fixing Nginx Timeout for Slow Backends

```nginx
server {
    listen 80;

    location /api/ {
        proxy_pass http://backend;

        # Increase timeouts for slow API responses
        proxy_connect_timeout  10s;   # Time to establish TCP to backend
        proxy_send_timeout     60s;   # Idle time sending request
        proxy_read_timeout    300s;   # Wait up to 5 minutes for response (for long jobs)
    }

    location /upload/ {
        proxy_pass http://backend;
        client_body_timeout     120s;  # Allow 2 minutes to receive large upload
        proxy_read_timeout      120s;
        client_max_body_size    100m;
    }
}
```

## HAProxy Timeout Types

| Directive | Applies To | Effect |
|---|---|---|
| `timeout connect` | Backend connect | 502 if exceeded |
| `timeout server` | Backend response | 504 if exceeded |
| `timeout client` | Client idle | Connection closed |
| `timeout tunnel` | WebSocket/CONNECT | Idle tunnel timeout |
| `timeout queue` | Queued requests | 503 if exceeded |

## HAProxy Timeout Configuration

```text
defaults
    timeout connect   5s
    timeout client   30s
    timeout server   30s

# For long-running processes (background jobs, file exports)
backend slow-backend
    timeout server 300s
    server api1 10.0.1.10:8080 check

# For WebSocket connections
backend ws-backend
    timeout tunnel 1h    # 1 hour for websocket idle
    server ws1 10.0.1.20:8080 check
```

## Diagnosing HAProxy Timeouts

```bash
# Check HAProxy logs for timeout entries
sudo tail -f /var/log/haproxy.log | grep -E "(timeout|TD|CD)"

# In HAProxy log format, the termination state shows why a connection ended:
# CD = client aborted during data phase (client disconnect)
# SD = server aborted during data phase (server disconnect)
# cD = client-side timeout during data phase
# sD = server-side timeout during data phase
# -- = normal termination

# Real-time stats
echo "show stat" | sudo socat stdio /run/haproxy/admin.sock | \
  awk -F',' '{print $1, $2, "dreq="$11, "ereq="$13, "econ="$14, "eresp="$15}'
```

## Testing Backend Response Time

```bash
# Measure actual backend response time
curl -w "Connect: %{time_connect}s\nTTFB: %{time_starttransfer}s\nTotal: %{time_total}s\n" \
  -o /dev/null -s http://backend-server:8080/api/endpoint
```

If `time_starttransfer` (TTFB) exceeds your `proxy_read_timeout` or `timeout server`, increase that timeout.

## Testing with tcpdump

```bash
# Capture proxy-to-backend traffic to see if backend is responding
sudo tcpdump -i eth0 -n host 10.0.1.10 and port 8080 -w /tmp/proxy.pcap

# Open in Wireshark or read with:
sudo tcpdump -r /tmp/proxy.pcap -nn
```

Look for:
- **RST packets**: Backend is actively refusing connections
- **SYN with no SYN-ACK**: Backend is not listening (firewall block or service down)
- **FIN after slow data**: Backend closing connection before sending full response

## Keep-Alive Timeout Mismatch

If the backend closes keep-alive connections sooner than the proxy expects:

```nginx
upstream backend {
    server 10.0.1.10:8080;
    keepalive 32;
    keepalive_timeout 30s;    # Must be < backend's keep-alive timeout
}
```

## Conclusion

Match your proxy timeout values to your slowest legitimate backend operation. For Nginx, `proxy_read_timeout` is most commonly the culprit for 504s from slow endpoints. For HAProxy, increase `timeout server` per-backend if needed. Always test backend response times with `curl -w` before adjusting timeouts. Check for firewall rules that silently drop connections, causing timeouts that look like backend hangs.
