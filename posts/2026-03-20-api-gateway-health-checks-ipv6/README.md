# How to Configure API Gateway Health Checks over IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: API Gateway, IPv6, Health Check, Nginx, Kong, Monitoring

Description: Configure active and passive health checks for API gateway upstream services that communicate over IPv6, covering NGINX, Kong, and AWS configurations.

## Introduction

Health checks ensure your API gateway routes traffic only to healthy backends. When upstreams communicate over IPv6, health check probes must also use IPv6 - otherwise you may route traffic to an address family that is not actually reachable.

## NGINX Upstream Health Checks over IPv6

NGINX Plus supports active health checks; open-source NGINX uses passive checks.

```nginx
# nginx.conf - upstream pool with IPv6 backend addresses

upstream api_backends {
    # Shared state is required for NGINX Plus active health checks
    zone api_backends 64k;

    # IPv6 backends in bracket notation
    server [2001:db8::10]:8080 max_fails=3 fail_timeout=30s;
    server [2001:db8::11]:8080 max_fails=3 fail_timeout=30s;
    server [2001:db8::12]:8080 backup;

    keepalive 16;
}

server {
    listen [::]:80;
    listen 80;

    location /api/ {
        proxy_pass http://api_backends;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        # These failure types count as unsuccessful attempts for passive checks
        proxy_next_upstream error timeout http_502 http_503;
        proxy_next_upstream_tries 2;
        proxy_connect_timeout 3s;
        proxy_read_timeout 10s;

        # NGINX Plus active health check example
        # health_check uri=/health interval=5s fails=3 passes=2;
    }
}
```

## Kong Active Health Checks over IPv6

Kong's health checker natively supports IPv6 upstream addresses.

```bash
# Create an upstream with active health checks

curl -X POST http://127.0.0.1:8001/upstreams/ \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ipv6-backend",
    "healthchecks": {
      "active": {
        "type": "http",
        "http_path": "/health",
        "timeout": 3,
        "concurrency": 5,
        "healthy": {
          "interval": 5,
          "successes": 2,
          "http_statuses": [200, 302]
        },
        "unhealthy": {
          "interval": 5,
          "http_failures": 3,
          "tcp_failures": 3,
          "timeouts": 3
        }
      },
      "passive": {
        "healthy": {
          "successes": 5,
          "http_statuses": [200, 201, 202]
        },
        "unhealthy": {
          "http_failures": 3,
          "tcp_failures": 3
        }
      }
    }
  }'

# Add IPv6 target to the upstream
curl -X POST http://127.0.0.1:8001/upstreams/ipv6-backend/targets/ \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "target": "[2001:db8::10]:8080",
    "weight": 100
  }'
```

## AWS API Gateway - Lambda Health Check Endpoint

For AWS API Gateway backed by Lambda, implement a health endpoint in a Lambda function attached to dual-stack VPC subnets with outbound IPv6 enabled.

```python
import socket
import json

def health_handler(event, context):
    """
    Health check Lambda - verifies IPv6 connectivity to downstream.
    Requires outbound IPv6 from dual-stack VPC subnets.
    """
    backend_host = "2001:db8::10"
    backend_port = 8080
    results = {}

    try:
        # Attempt IPv6 TCP connect to the backend
        sock = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
        sock.settimeout(3)
        sock.connect((backend_host, backend_port, 0, 0))
        sock.close()
        results["backend_ipv6"] = "healthy"
    except Exception as e:
        results["backend_ipv6"] = f"unhealthy: {e}"

    status = 200 if all(v == "healthy" for v in results.values()) else 503
    return {
        "statusCode": status,
        "body": json.dumps(results)
    }
```

## Haproxy Health Checks over IPv6

```text
# haproxy.cfg - backend with IPv6 servers and TCP health checks
backend api_ipv6
    balance roundrobin
    option tcp-check
    # With no tcp-check send/expect rules, this only verifies a TCP connection
    server api1 [2001:db8::10]:8080 check inter 3s fall 3 rise 2
    server api2 [2001:db8::11]:8080 check inter 3s fall 3 rise 2

# HTTP health check
backend api_ipv6_http
    balance roundrobin
    option httpchk GET /health HTTP/1.1
    http-check send hdr Host backend.local
    server api1 [2001:db8::10]:8080 check inter 5s fall 3 rise 2
    server api2 [2001:db8::11]:8080 check inter 5s fall 3 rise 2
```

## Verification

```bash
# Manually probe a backend health endpoint over IPv6
curl -6 --max-time 3 http://[2001:db8::10]:8080/health

# Check Kong's view of upstream health through the local Admin API
curl http://127.0.0.1:8001/upstreams/ipv6-backend/health/

# Watch NGINX error log for upstream health events
tail -f /var/log/nginx/error.log | grep "upstream"
```

## Conclusion

Health checks over IPv6 require that probes explicitly use the IPv6 address family. Most modern API gateways handle this automatically when upstream addresses are IPv6. Use OneUptime's external monitors to independently verify your API gateway's IPv6 health endpoints from outside the cluster.
