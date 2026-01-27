# How to Implement Layer 4 vs Layer 7 Load Balancing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Load Balancing, L4, L7, Networking, High Availability, HAProxy, Nginx

Description: Learn the differences between Layer 4 and Layer 7 load balancing, when to use each, and implementation examples with HAProxy, Nginx, and cloud load balancers.

---

> Load balancing at Layer 4 is like sorting mail by zip code - fast and efficient. Layer 7 is like reading each letter to decide which department handles it - slower but smarter.

## OSI Model Basics

The OSI model divides network communication into seven layers. For load balancing, two layers matter most:

| Layer | Name | What It Sees | Load Balancing Implications |
| --- | --- | --- | --- |
| **Layer 4** | Transport | TCP/UDP ports, IP addresses | Fast decisions based on connection metadata |
| **Layer 7** | Application | HTTP headers, URLs, cookies, payload | Content-aware routing with inspection overhead |

Layer 4 load balancers work at the TCP/UDP level. They see source/destination IPs and ports but cannot inspect packet contents. Layer 7 load balancers terminate the connection, parse application protocols (HTTP, gRPC, WebSocket), and make routing decisions based on content.

## Layer 4 Load Balancing

L4 load balancers route traffic based on:

- Source and destination IP addresses
- Source and destination ports
- Protocol (TCP or UDP)

**Characteristics:**

- **Speed:** Minimal processing per packet. Decisions made without parsing payload.
- **Protocol agnostic:** Works with any TCP/UDP protocol - HTTP, MQTT, PostgreSQL, custom protocols.
- **Connection persistence:** Can hash on client IP or port for sticky sessions.
- **No content inspection:** Cannot route based on URL paths, headers, or cookies.
- **Lower resource usage:** No SSL termination, no buffer management for HTTP parsing.

**How it works:**

```
Client --> L4 LB --> Backend Server
          (NAT or DSR)

1. Client opens TCP connection to load balancer VIP
2. LB picks backend based on algorithm (round-robin, least-conn, IP hash)
3. LB either:
   - NAT: Rewrites destination IP, forwards packets, rewrites responses
   - DSR: Forwards to backend, backend replies directly to client
4. Connection state tracked until timeout or close
```

## Layer 7 Load Balancing

L7 load balancers terminate client connections and make new connections to backends. They fully understand the application protocol.

**Characteristics:**

- **Content-based routing:** Route `/api/*` to API servers, `/static/*` to CDN.
- **Header manipulation:** Add `X-Forwarded-For`, rewrite `Host`, inject trace IDs.
- **SSL termination:** Decrypt at the load balancer, inspect content, re-encrypt or send plain to backends.
- **Health checks:** HTTP health endpoints with response validation.
- **Rate limiting:** Per-user or per-endpoint throttling based on headers/cookies.
- **Higher latency:** Must parse every request/response.
- **Protocol specific:** Different configurations for HTTP/1.1, HTTP/2, gRPC, WebSocket.

**How it works:**

```
Client --> L7 LB --> Backend Server
       (SSL)    (new connection)

1. Client opens TCP connection and sends HTTP request
2. LB terminates SSL (if HTTPS)
3. LB parses HTTP request (method, path, headers, body)
4. LB selects backend based on routing rules
5. LB opens new connection to backend, forwards request
6. LB receives response, may modify headers, forwards to client
```

## When to Use L4 vs L7

| Use Case | Recommended Layer | Why |
| --- | --- | --- |
| Non-HTTP protocols (databases, MQTT, custom TCP) | L4 | L7 does not understand these protocols |
| Maximum throughput with minimal latency | L4 | No payload parsing overhead |
| URL-based routing | L7 | Must inspect HTTP path |
| A/B testing, canary deployments | L7 | Route by header or cookie |
| SSL termination at load balancer | L7 | Must decrypt to inspect |
| WebSocket with HTTP upgrade | L7 | Initial handshake is HTTP |
| gRPC with per-method routing | L7 | Needs HTTP/2 parsing |
| Simple TCP failover | L4 | No content awareness needed |
| WAF integration | L7 | Must inspect request body |
| API gateway features | L7 | Auth, rate limiting, transforms |

## Performance Considerations

**L4 Performance:**

- Handles millions of concurrent connections
- Sub-millisecond added latency
- Scales with kernel network stack optimizations (DPDK, XDP, io_uring)
- Memory usage: connection state only (~1KB per connection)

**L7 Performance:**

- Hundreds of thousands of requests per second (depends on parsing complexity)
- 1-5ms added latency typical
- CPU bound on SSL handshakes and payload parsing
- Memory usage: connection state + request buffers (~10-100KB per connection)

**Rule of thumb:** Start with L7 for HTTP workloads. Drop to L4 only when you hit performance limits or need protocol-agnostic balancing.

## L4 Implementation with HAProxy

```haproxy
# /etc/haproxy/haproxy.cfg
# Layer 4 TCP load balancing configuration

global
    # Run as daemon with reasonable limits
    daemon
    maxconn 100000

defaults
    # TCP mode - no HTTP parsing
    mode tcp

    # Timeouts for TCP connections
    timeout connect 5s      # Time to establish connection to backend
    timeout client 30s      # Inactivity timeout for client side
    timeout server 30s      # Inactivity timeout for server side

    # Enable logging for debugging
    option tcplog
    log stdout format raw local0

# Frontend: where clients connect
frontend tcp_front
    # Listen on port 5432 (PostgreSQL example)
    bind *:5432

    # Use the postgres backend
    default_backend postgres_servers

# Backend: pool of real servers
backend postgres_servers
    # Load balancing algorithm
    # roundrobin: distribute evenly
    # leastconn: prefer server with fewest connections (good for long-lived connections)
    balance leastconn

    # Health check: attempt TCP connection every 3s
    # Server marked down after 3 failures, up after 2 successes
    option tcp-check

    # Backend servers
    # check: enable health checking
    # inter: check interval
    # fall: failures before marking down
    # rise: successes before marking up
    server db1 10.0.1.10:5432 check inter 3s fall 3 rise 2
    server db2 10.0.1.11:5432 check inter 3s fall 3 rise 2
    server db3 10.0.1.12:5432 check inter 3s fall 3 rise 2
```

## L4 Implementation with Nginx Stream

```nginx
# /etc/nginx/nginx.conf
# Layer 4 TCP/UDP load balancing with stream module

# Stream block handles L4 load balancing (not in http block)
stream {
    # Logging for TCP connections
    log_format tcp_log '$remote_addr [$time_local] '
                       '$protocol $status $bytes_sent $bytes_received '
                       '$session_time "$upstream_addr"';

    access_log /var/log/nginx/tcp_access.log tcp_log;

    # Upstream group for Redis cluster
    upstream redis_cluster {
        # Hash on client IP for session persistence
        # consistent: use ketama consistent hashing
        hash $remote_addr consistent;

        # Backend servers with health checks
        server 10.0.1.20:6379 max_fails=3 fail_timeout=30s;
        server 10.0.1.21:6379 max_fails=3 fail_timeout=30s;
        server 10.0.1.22:6379 max_fails=3 fail_timeout=30s;
    }

    # TCP server block
    server {
        # Listen on Redis port
        listen 6379;

        # Proxy to upstream
        proxy_pass redis_cluster;

        # Connection timeouts
        proxy_connect_timeout 5s;
        proxy_timeout 30s;

        # Enable TCP keepalive to backends
        proxy_socket_keepalive on;
    }

    # UDP example for DNS load balancing
    upstream dns_servers {
        server 10.0.1.30:53;
        server 10.0.1.31:53;
    }

    server {
        # UDP listener
        listen 53 udp;
        proxy_pass dns_servers;

        # UDP specific: responses expected
        proxy_responses 1;
        proxy_timeout 1s;
    }
}
```

## L7 Implementation with Nginx

```nginx
# /etc/nginx/nginx.conf
# Layer 7 HTTP load balancing

http {
    # Logging with upstream info
    log_format upstream_log '$remote_addr - $remote_user [$time_local] '
                            '"$request" $status $body_bytes_sent '
                            '"$http_referer" "$http_user_agent" '
                            'upstream: $upstream_addr '
                            'response_time: $upstream_response_time';

    access_log /var/log/nginx/access.log upstream_log;

    # API backend pool
    upstream api_servers {
        # Least connections algorithm - good for varying request times
        least_conn;

        # Backend servers with weights and health parameters
        server 10.0.2.10:8080 weight=3 max_fails=3 fail_timeout=30s;
        server 10.0.2.11:8080 weight=2 max_fails=3 fail_timeout=30s;
        server 10.0.2.12:8080 weight=1 max_fails=3 fail_timeout=30s;  # Lower capacity server

        # Keep connections alive to backends (connection pooling)
        keepalive 32;
    }

    # Static content backend
    upstream static_servers {
        server 10.0.2.20:80;
        server 10.0.2.21:80;
    }

    server {
        listen 443 ssl http2;
        server_name api.example.com;

        # SSL termination at load balancer
        ssl_certificate /etc/ssl/certs/api.example.com.crt;
        ssl_certificate_key /etc/ssl/private/api.example.com.key;
        ssl_protocols TLSv1.2 TLSv1.3;

        # Route based on URL path
        location /api/ {
            proxy_pass http://api_servers;

            # Pass original client info to backend
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # Enable keepalive to upstream
            proxy_http_version 1.1;
            proxy_set_header Connection "";

            # Timeouts
            proxy_connect_timeout 5s;
            proxy_read_timeout 60s;
            proxy_send_timeout 60s;
        }

        location /static/ {
            proxy_pass http://static_servers;

            # Cache static content
            proxy_cache_valid 200 1d;
            add_header X-Cache-Status $upstream_cache_status;
        }

        # Health check endpoint (does not proxy)
        location /health {
            return 200 'OK';
            add_header Content-Type text/plain;
        }
    }
}
```

## L7 Implementation with HAProxy

```haproxy
# /etc/haproxy/haproxy.cfg
# Layer 7 HTTP load balancing with advanced features

global
    daemon
    maxconn 50000
    # Enable multithreading
    nbthread 4

defaults
    # HTTP mode - full request/response parsing
    mode http

    # Standard timeouts
    timeout connect 5s
    timeout client 30s
    timeout server 30s
    timeout http-request 10s    # Time to receive complete HTTP request
    timeout http-keep-alive 5s  # Keep-alive timeout

    # Enable HTTP logging
    option httplog
    log stdout format raw local0

    # Add X-Forwarded-For header
    option forwardfor

    # Enable HTTP connection reuse
    option http-keep-alive

# Frontend with SSL termination
frontend https_front
    bind *:443 ssl crt /etc/ssl/certs/combined.pem alpn h2,http/1.1
    bind *:80

    # Redirect HTTP to HTTPS
    http-request redirect scheme https unless { ssl_fc }

    # ACLs for routing decisions
    acl is_api path_beg /api/
    acl is_websocket hdr(Upgrade) -i websocket
    acl is_admin path_beg /admin/
    acl is_internal src 10.0.0.0/8 192.168.0.0/16

    # Route based on ACLs
    use_backend api_servers if is_api
    use_backend websocket_servers if is_websocket
    use_backend admin_servers if is_admin is_internal  # Admin only from internal IPs

    # Default backend for everything else
    default_backend web_servers

backend api_servers
    balance roundrobin

    # HTTP health check
    option httpchk GET /health HTTP/1.1\r\nHost:\ localhost
    http-check expect status 200

    # Rate limiting: 100 requests per second per client IP
    stick-table type ip size 100k expire 30s store http_req_rate(1s)
    http-request track-sc0 src
    http-request deny deny_status 429 if { sc_http_req_rate(0) gt 100 }

    # Backend servers
    server api1 10.0.3.10:8080 check
    server api2 10.0.3.11:8080 check
    server api3 10.0.3.12:8080 check

backend websocket_servers
    balance source  # Sticky sessions for WebSocket

    # WebSocket timeout (longer for persistent connections)
    timeout tunnel 1h

    server ws1 10.0.3.20:8080 check
    server ws2 10.0.3.21:8080 check

backend web_servers
    balance roundrobin

    # Cookie-based session persistence
    cookie SERVERID insert indirect nocache

    server web1 10.0.3.30:80 check cookie web1
    server web2 10.0.3.31:80 check cookie web2

backend admin_servers
    server admin1 10.0.3.40:8080 check
```

## Cloud Load Balancers: ALB vs NLB

AWS provides two primary load balancers that map to L4 and L7:

| Feature | NLB (Network Load Balancer) | ALB (Application Load Balancer) |
| --- | --- | --- |
| OSI Layer | Layer 4 | Layer 7 |
| Protocols | TCP, UDP, TLS | HTTP, HTTPS, gRPC, WebSocket |
| Latency | Ultra-low (100s of microseconds) | Low (milliseconds) |
| Static IP | Yes, Elastic IP supported | No (use Global Accelerator) |
| SSL termination | Optional (TLS listener) | Yes |
| Path-based routing | No | Yes |
| Host-based routing | No | Yes |
| Health checks | TCP, HTTP, HTTPS | HTTP, HTTPS with body matching |
| Pricing | Per LCU (connection based) | Per LCU (request based) |
| WebSocket | Pass-through | Native support with routing |
| Cross-zone | Disabled by default | Enabled by default |

**When to use NLB:**

- Non-HTTP protocols
- Need static IPs for whitelisting
- Extreme performance requirements
- Preserving client source IP without proxy protocol

**When to use ALB:**

- HTTP/HTTPS workloads
- Microservices with path-based routing
- Container services (ECS, EKS) with dynamic port mapping
- Need WAF integration

```yaml
# Terraform example: NLB for TCP workload
resource "aws_lb" "tcp_nlb" {
  name               = "tcp-nlb"
  internal           = false
  load_balancer_type = "network"  # L4
  subnets            = var.public_subnets

  enable_cross_zone_load_balancing = true
}

resource "aws_lb_target_group" "tcp_tg" {
  name        = "tcp-targets"
  port        = 5432
  protocol    = "TCP"  # L4 protocol
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    protocol = "TCP"
    port     = "traffic-port"
  }
}

# Terraform example: ALB for HTTP workload
resource "aws_lb" "http_alb" {
  name               = "http-alb"
  internal           = false
  load_balancer_type = "application"  # L7
  subnets            = var.public_subnets
  security_groups    = [var.alb_sg_id]
}

resource "aws_lb_target_group" "http_tg" {
  name        = "http-targets"
  port        = 8080
  protocol    = "HTTP"  # L7 protocol
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = "/health"
    protocol            = "HTTP"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

# Path-based routing (L7 only)
resource "aws_lb_listener_rule" "api_routing" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api_tg.arn
  }

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }
}
```

## Health Checks at Each Layer

**L4 Health Checks:**

```haproxy
# TCP connect check - just verifies port is open
backend tcp_backend
    option tcp-check
    server srv1 10.0.1.10:5432 check inter 3s fall 3 rise 2

# TCP check with send/expect (protocol-aware without full L7)
backend redis_backend
    option tcp-check
    tcp-check send PING\r\n
    tcp-check expect string +PONG
    server redis1 10.0.1.20:6379 check
```

**L7 Health Checks:**

```haproxy
# HTTP health check with response validation
backend api_backend
    option httpchk GET /health HTTP/1.1\r\nHost:\ localhost

    # Expect 200-299 status
    http-check expect status 200-299

    # Or check response body
    http-check expect string "status":"healthy"

    server api1 10.0.1.30:8080 check inter 5s fall 3 rise 2
```

**Best practices for health checks:**

| Aspect | L4 Recommendation | L7 Recommendation |
| --- | --- | --- |
| Endpoint | TCP port check | Dedicated `/health` endpoint |
| Interval | 3-5 seconds | 5-30 seconds |
| Timeout | 2-3 seconds | 5-10 seconds |
| Failure threshold | 2-3 failures | 2-3 failures |
| What to check | Port responds | App is ready to serve traffic |
| Dependencies | None | Check critical dependencies (DB, cache) |

## Decision Framework

Use this flowchart to choose between L4 and L7:

```
Start
  |
  v
Is the protocol HTTP/HTTPS/gRPC?
  |
  |-- No --> Use L4
  |           - HAProxy TCP mode
  |           - Nginx stream
  |           - AWS NLB
  |
  |-- Yes
        |
        v
      Do you need any of these?
        - URL/path-based routing
        - Header inspection/modification
        - Cookie-based sessions
        - SSL termination at LB
        - Rate limiting per endpoint
        - Request/response transformation
        |
        |-- No --> Consider L4 for performance
        |           (but L7 is usually fine)
        |
        |-- Yes --> Use L7
                     - HAProxy HTTP mode
                     - Nginx http upstream
                     - AWS ALB
```

## Best Practices Summary

**General:**

1. Start with L7 for HTTP workloads - the flexibility usually outweighs the small performance cost.
2. Use L4 for non-HTTP protocols or when you need maximum throughput with minimal latency.
3. Always configure health checks - silent failures are worse than detected failures.
4. Enable connection keep-alive to reduce connection overhead.
5. Log upstream selection and response times for debugging.

**L4 Specific:**

1. Use `leastconn` for long-lived connections (databases, message queues).
2. Consider Direct Server Return (DSR) for high-throughput scenarios.
3. Hash on client IP for session affinity when needed.
4. Set appropriate connection timeouts to avoid resource exhaustion.

**L7 Specific:**

1. Always set `X-Forwarded-For`, `X-Real-IP`, and `X-Forwarded-Proto` headers.
2. Use separate backend pools for different traffic patterns (API vs static).
3. Implement rate limiting at the load balancer to protect backends.
4. Configure appropriate request/response buffer sizes.
5. Use HTTP/2 for multiplexing when clients support it.

**Monitoring:**

1. Track connection counts, request rates, and error rates.
2. Monitor backend health check status.
3. Alert on elevated 5xx responses or connection failures.
4. Measure and alert on p99 latency through the load balancer.

---

For comprehensive monitoring of your load balancers, including health check status, latency metrics, and alerting on degraded backends, check out [OneUptime](https://oneuptime.com) - the open-source observability platform that helps you keep your infrastructure running smoothly.
