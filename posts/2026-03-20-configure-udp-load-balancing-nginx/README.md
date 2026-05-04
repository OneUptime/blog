# How to Configure UDP Load Balancing in Nginx

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: UDP, Nginx, Load Balancing, Linux, Networking, Configuration

Description: Configure Nginx stream module to load balance UDP traffic across multiple backend servers with health checks and session persistence.

## Introduction

Nginx supports UDP load balancing through its `stream` module. The stream module was introduced in version 1.9.0 (TCP only), and UDP support was added in version 1.9.13. This enables balancing DNS queries, game server traffic, VoIP (SIP/RTP), and any other UDP-based protocol across multiple backend servers. Unlike TCP load balancing where a connection maps to a backend session, UDP load balancing maps individual datagrams - requiring careful configuration for stateful protocols.

## Prerequisites

```bash
# Verify nginx has stream module compiled:

nginx -V 2>&1 | grep stream
# Should show: --with-stream

# Check nginx version (need 1.9.13+ for UDP stream):
nginx -v

# Install nginx with stream module if needed (Ubuntu):
apt-get install nginx-full   # Includes stream module
# Or compile from source with --with-stream
```

## Basic UDP Load Balancing

```nginx
# /etc/nginx/nginx.conf
# Add stream block at top level (NOT inside http block)

stream {
    upstream dns_backends {
        server 10.20.0.10:53;
        server 10.20.0.11:53;
        server 10.20.0.12:53;
    }

    server {
        listen 53 udp;          # Listen on UDP port 53
        proxy_pass dns_backends;
        proxy_timeout 1s;       # Wait 1s for backend response
        proxy_responses 1;      # Expect 1 response per request (DNS)
    }
}
```

```bash
# Test the configuration:
nginx -t

# Reload nginx:
systemctl reload nginx

# Test DNS load balancing:
for i in $(seq 1 5); do dig +short @localhost google.com; done
```

## UDP Load Balancing Methods

```nginx
stream {
    # Method 1: Round-robin (default) - distributes datagrams evenly
    upstream rr_backend {
        server 10.20.0.10:5000;
        server 10.20.0.11:5000;
        server 10.20.0.12:5000;
    }

    # Method 2: Least connections (for stateful UDP with multiple responses)
    upstream lc_backend {
        least_conn;
        server 10.20.0.10:5000;
        server 10.20.0.11:5000;
    }

    # Method 3: IP hash - same client IP always goes to same backend
    upstream hash_backend {
        hash $remote_addr consistent;
        server 10.20.0.10:5000;
        server 10.20.0.11:5000;
    }

    # Method 4: Weighted (backend 10 gets 3x traffic of backend 11)
    upstream weighted_backend {
        server 10.20.0.10:5000 weight=3;
        server 10.20.0.11:5000 weight=1;
    }
}
```

## Stateful UDP (Multiple Packets Per Session)

```nginx
stream {
    # For protocols with multiple packets per client exchange:
    # Use hash to ensure all packets from same client go to same backend

    upstream game_servers {
        hash $remote_addr:$remote_port consistent;
        server 10.20.0.10:27015;
        server 10.20.0.11:27015;
        server 10.20.0.12:27015;
    }

    server {
        listen 27015 udp reuseport;   # reuseport: better multi-core distribution
        proxy_pass game_servers;
        proxy_timeout 60s;            # Game session timeout
        # Omit proxy_responses to allow unlimited responses until timeout.
        # (proxy_responses 0 means "no response expected" / fire-and-forget,
        # which would terminate the session early - not what we want for games.)
    }
}
```

## Health Checks

```nginx
stream {
    upstream dns_backends {
        server 10.20.0.10:53;
        server 10.20.0.11:53;

        # Passive health check parameters:
        # (active health check requires nginx plus)
    }

    server {
        listen 53 udp;
        proxy_pass dns_backends;

        # Mark backend unhealthy after 3 failed attempts in 30 seconds:
        # These are TCP parameters but also apply to UDP in stream module:
    }
}
```

```bash
# Monitor nginx UDP load balancing:
# Check nginx status module:
curl http://localhost/nginx_status

# View nginx error log for UDP proxy errors:
tail -f /var/log/nginx/error.log | grep -i "udp\|upstream"

# Check active UDP proxying:
ss -unp | grep nginx
```

## VoIP (SIP/RTP) Configuration

```nginx
stream {
    # SIP signaling (stateless request/response)
    upstream sip_servers {
        hash $remote_addr consistent;
        server 10.20.0.10:5060;
        server 10.20.0.11:5060;
    }

    server {
        listen 5060 udp;
        proxy_pass sip_servers;
        proxy_timeout 5s;
        proxy_responses 1;     # SIP: 1 response per request
        proxy_buffer_size 4k;  # SIP messages are typically small
    }
}
```

## Conclusion

Nginx UDP load balancing via the `stream` module is straightforward for stateless protocols like DNS: use round-robin with `proxy_responses 1`. For stateful protocols like gaming or SIP where multiple packets belong to the same session, use `hash $remote_addr:$remote_port consistent` to route all packets from the same client to the same backend. Set `proxy_timeout` to match your application's session lifetime. The `reuseport` option distributes incoming UDP across multiple nginx worker processes for better multi-core performance.
