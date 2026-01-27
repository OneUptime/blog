# How to Implement Session Persistence

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Load Balancing, Session Persistence, Sticky Sessions, HAProxy, Nginx, DevOps, High Availability, Infrastructure

Description: A comprehensive guide to implementing session persistence in load-balanced environments using sticky sessions, cookie-based affinity, IP hash, and cloud load balancer configurations.

---

> Session persistence ensures that a user's requests are consistently routed to the same backend server throughout their session. Without it, stateful applications break, shopping carts vanish, and authentication flows fail mid-stream.

## Understanding the Problem: Stateful vs Stateless

Before diving into implementation, you need to understand when session persistence matters and when it does not.

### Stateless Applications

In a truly stateless architecture, any server can handle any request. The application stores no local state - everything lives in external stores like Redis, databases, or distributed caches.

Benefits of stateless design:
- Any server can handle any request
- Scaling is trivial - just add more servers
- Server failures do not lose user state
- No need for session persistence at the load balancer

### Stateful Applications

Many applications maintain server-side session state:
- Shopping carts stored in memory
- Authentication tokens in local session stores
- WebSocket connections
- In-progress file uploads
- Cached user preferences

For these applications, you need session persistence to route users back to the same server.

### The Right Answer: Go Stateless When Possible

The best solution is often to eliminate the need for session persistence entirely:

```python
# Instead of storing session data in server memory...
# Store it in Redis (accessible by all servers)

import redis

# Connect to Redis cluster
redis_client = redis.Redis(host='redis-cluster', port=6379, db=0)

def get_session(session_id: str) -> dict:
    """Retrieve session from Redis - works from any server."""
    session_data = redis_client.get(f"session:{session_id}")
    return json.loads(session_data) if session_data else {}

def save_session(session_id: str, data: dict, ttl: int = 3600) -> None:
    """Save session to Redis - accessible from any server."""
    redis_client.setex(f"session:{session_id}", ttl, json.dumps(data))
```

However, when stateless is not an option - legacy systems, WebSocket connections, or specific performance requirements - session persistence becomes essential.

---

## Method 1: Cookie-Based Affinity

Cookie-based affinity is the most reliable method for session persistence. The load balancer sets a cookie containing server identification, and subsequent requests include this cookie.

### How It Works

1. Client makes first request to load balancer
2. Load balancer selects a backend server
3. Load balancer inserts a cookie identifying that server
4. Client includes cookie in subsequent requests
5. Load balancer reads cookie and routes to the same server

### Advantages

- Works across IP address changes (mobile users, VPNs)
- Survives NAT and proxy scenarios
- Most reliable method for browser-based applications
- Easy to debug (just inspect the cookie)

### Disadvantages

- Requires cookie support in the client
- Cookie overhead on every request
- Does not work for non-HTTP protocols
- Privacy considerations with tracking cookies

---

## Method 2: IP Hash

IP hash uses the client's IP address to determine which server handles the request. The same IP always routes to the same server.

### How It Works

1. Load balancer extracts client IP address
2. Applies hash function to IP
3. Maps hash result to a specific backend server
4. All requests from that IP go to that server

### Advantages

- No cookies required
- Works for any protocol (TCP, UDP, HTTP)
- Zero overhead on requests
- Simple to understand and implement

### Disadvantages

- Breaks when users share IP (corporate NAT, mobile carriers)
- Users changing IP lose their session
- Uneven distribution if some IPs generate more traffic
- Server additions/removals cause session redistribution

---

## Method 3: Source IP Persistence (Layer 4)

Source IP persistence operates at the TCP/UDP level, maintaining connection affinity based on source IP. This is similar to IP hash but typically includes persistence tables with timeouts.

### How It Works

1. Load balancer receives connection from client IP
2. Checks persistence table for existing mapping
3. If found, routes to mapped server
4. If not found, selects server and creates mapping
5. Mapping expires after configured timeout

### Advantages

- Works for any TCP/UDP protocol
- Lower latency than application-layer methods
- Handles long-lived connections well
- Supports non-HTTP protocols (databases, gaming, streaming)

### Disadvantages

- Same NAT/shared IP issues as IP hash
- Persistence table consumes memory
- Timeout configuration is tricky
- Not suitable for rapidly changing client IPs

---

## HAProxy Configuration

HAProxy is one of the most popular load balancers and offers excellent session persistence options.

### Cookie-Based Persistence

```haproxy
# /etc/haproxy/haproxy.cfg

# Global settings
global
    log /dev/log local0
    maxconn 50000
    # Enable multi-threading for better performance
    nbthread 4

# Default settings applied to all frontends/backends
defaults
    mode http
    log global
    option httplog
    option dontlognull
    timeout connect 5s
    timeout client 30s
    timeout server 30s
    # Enable HTTP keep-alive for better performance
    option http-keep-alive

# Frontend - receives incoming requests
frontend http_front
    bind *:80
    bind *:443 ssl crt /etc/ssl/certs/server.pem

    # Add X-Forwarded-For header for backend servers
    option forwardfor

    # Route to backend
    default_backend app_servers

# Backend with cookie-based session persistence
backend app_servers
    balance roundrobin

    # Cookie-based persistence configuration
    # SERVERID: name of the cookie
    # insert: HAProxy inserts the cookie (not the app)
    # indirect: cookie is removed before forwarding to backend
    # nocache: prevent caching of responses with this cookie
    # httponly: prevent JavaScript access to cookie
    # secure: only send cookie over HTTPS
    cookie SERVERID insert indirect nocache httponly secure

    # Health check configuration
    option httpchk GET /health
    http-check expect status 200

    # Backend servers - cookie value is appended to each
    # Format: server <name> <address>:<port> cookie <value> check
    server app1 192.168.1.10:8080 cookie app1 check inter 5s fall 3 rise 2
    server app2 192.168.1.11:8080 cookie app2 check inter 5s fall 3 rise 2
    server app3 192.168.1.12:8080 cookie app3 check inter 5s fall 3 rise 2
```

### IP Hash Persistence

```haproxy
# Backend with IP hash persistence
backend app_servers_iphash
    # Use source IP hash for server selection
    # consistent: uses consistent hashing for minimal disruption
    #            when servers are added/removed
    balance source
    hash-type consistent

    # Health checks
    option httpchk GET /health
    http-check expect status 200

    # Backend servers
    server app1 192.168.1.10:8080 check inter 5s fall 3 rise 2
    server app2 192.168.1.11:8080 check inter 5s fall 3 rise 2
    server app3 192.168.1.12:8080 check inter 5s fall 3 rise 2
```

### Stick Tables for Advanced Persistence

```haproxy
# Backend with stick tables for source IP persistence
backend app_servers_sticky
    balance roundrobin

    # Define stick table
    # type ip: key is IP address
    # size 1m: store up to 1 million entries
    # expire 30m: entries expire after 30 minutes of inactivity
    stick-table type ip size 1m expire 30m

    # Stick on source IP
    stick on src

    # Health checks
    option httpchk GET /health
    http-check expect status 200

    # Backend servers
    server app1 192.168.1.10:8080 check inter 5s fall 3 rise 2
    server app2 192.168.1.11:8080 check inter 5s fall 3 rise 2
    server app3 192.168.1.12:8080 check inter 5s fall 3 rise 2
```

### WebSocket Session Persistence

```haproxy
# Frontend handling WebSocket upgrades
frontend websocket_front
    bind *:80
    bind *:443 ssl crt /etc/ssl/certs/server.pem

    # Detect WebSocket upgrade requests
    acl is_websocket hdr(Upgrade) -i WebSocket
    acl is_websocket hdr_beg(Host) -i ws

    # Extended timeouts for WebSocket connections
    timeout client 1h

    # Route WebSocket to dedicated backend
    use_backend websocket_servers if is_websocket
    default_backend app_servers

# Backend for WebSocket connections
backend websocket_servers
    balance source
    hash-type consistent

    # Extended timeout for long-lived connections
    timeout server 1h
    timeout tunnel 1h

    # Servers
    server ws1 192.168.1.10:8080 check inter 5s fall 3 rise 2
    server ws2 192.168.1.11:8080 check inter 5s fall 3 rise 2
```

---

## Nginx Configuration

Nginx offers session persistence through its upstream module and the commercial Nginx Plus.

### IP Hash with Open Source Nginx

```nginx
# /etc/nginx/nginx.conf

# Worker processes - set to number of CPU cores
worker_processes auto;

# Events configuration
events {
    worker_connections 10240;
    use epoll;
    multi_accept on;
}

http {
    # Basic settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] '
                    '"$request" $status $body_bytes_sent '
                    '"$http_referer" "$http_user_agent" '
                    'upstream: $upstream_addr';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;

    # Upstream configuration with IP hash
    upstream app_backend {
        # Use IP hash for session persistence
        # Requests from the same IP go to the same server
        ip_hash;

        # Backend servers
        # weight: relative weight for load distribution
        # max_fails: failures before marking server down
        # fail_timeout: time to consider server unavailable
        server 192.168.1.10:8080 weight=1 max_fails=3 fail_timeout=30s;
        server 192.168.1.11:8080 weight=1 max_fails=3 fail_timeout=30s;
        server 192.168.1.12:8080 weight=1 max_fails=3 fail_timeout=30s;

        # Backup server - used only when all others are down
        server 192.168.1.20:8080 backup;

        # Keep connections alive to backends
        keepalive 32;
    }

    # Server block
    server {
        listen 80;
        listen 443 ssl;
        server_name example.com;

        # SSL configuration
        ssl_certificate /etc/ssl/certs/server.crt;
        ssl_certificate_key /etc/ssl/private/server.key;
        ssl_protocols TLSv1.2 TLSv1.3;

        location / {
            proxy_pass http://app_backend;

            # Pass original client information to backend
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # Connection keep-alive to upstream
            proxy_http_version 1.1;
            proxy_set_header Connection "";

            # Timeouts
            proxy_connect_timeout 5s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Health check endpoint (proxied to backend)
        location /health {
            proxy_pass http://app_backend/health;
            access_log off;
        }
    }
}
```

### Hash-Based Persistence (Consistent Hashing)

```nginx
upstream app_backend {
    # Use consistent hash based on a variable
    # $request_uri: hash based on the request URI
    # $cookie_sessionid: hash based on session cookie
    # $remote_addr: hash based on client IP (similar to ip_hash)
    hash $cookie_sessionid consistent;

    # Backend servers
    server 192.168.1.10:8080;
    server 192.168.1.11:8080;
    server 192.168.1.12:8080;

    keepalive 32;
}
```

### WebSocket Configuration

```nginx
# Map for WebSocket upgrade header
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

upstream websocket_backend {
    # IP hash for WebSocket persistence
    ip_hash;

    server 192.168.1.10:8080;
    server 192.168.1.11:8080;

    keepalive 32;
}

server {
    listen 80;
    listen 443 ssl;
    server_name ws.example.com;

    # SSL configuration
    ssl_certificate /etc/ssl/certs/server.crt;
    ssl_certificate_key /etc/ssl/private/server.key;

    location /ws {
        proxy_pass http://websocket_backend;

        # WebSocket headers
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;

        # Extended timeouts for WebSocket
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }
}
```

---

## Cloud Load Balancer Settings

### AWS Application Load Balancer (ALB)

AWS ALB supports cookie-based stickiness through target group settings.

```bash
# Create target group with stickiness enabled
aws elbv2 create-target-group \
    --name my-sticky-targets \
    --protocol HTTP \
    --port 80 \
    --vpc-id vpc-12345678 \
    --health-check-path /health \
    --health-check-interval-seconds 30 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 3

# Enable stickiness on the target group
# Duration-based stickiness (ALB-generated cookie)
aws elbv2 modify-target-group-attributes \
    --target-group-arn arn:aws:elasticloadbalancing:region:account:targetgroup/my-sticky-targets/1234567890 \
    --attributes \
        Key=stickiness.enabled,Value=true \
        Key=stickiness.type,Value=lb_cookie \
        Key=stickiness.lb_cookie.duration_seconds,Value=3600

# Application-based stickiness (uses app's own cookie)
aws elbv2 modify-target-group-attributes \
    --target-group-arn arn:aws:elasticloadbalancing:region:account:targetgroup/my-sticky-targets/1234567890 \
    --attributes \
        Key=stickiness.enabled,Value=true \
        Key=stickiness.type,Value=app_cookie \
        Key=stickiness.app_cookie.cookie_name,Value=JSESSIONID \
        Key=stickiness.app_cookie.duration_seconds,Value=3600
```

### AWS Network Load Balancer (NLB)

NLB operates at Layer 4 and uses source IP for persistence.

```bash
# Create NLB target group
# NLB automatically maintains source IP persistence
aws elbv2 create-target-group \
    --name my-nlb-targets \
    --protocol TCP \
    --port 8080 \
    --vpc-id vpc-12345678 \
    --health-check-protocol TCP \
    --health-check-port 8080

# Enable connection draining (deregistration delay)
aws elbv2 modify-target-group-attributes \
    --target-group-arn arn:aws:elasticloadbalancing:region:account:targetgroup/my-nlb-targets/1234567890 \
    --attributes \
        Key=deregistration_delay.timeout_seconds,Value=300
```

### Google Cloud Load Balancer

```bash
# Create backend service with session affinity
gcloud compute backend-services create my-backend-service \
    --protocol=HTTP \
    --port-name=http \
    --health-checks=my-health-check \
    --global \
    --session-affinity=GENERATED_COOKIE \
    --affinity-cookie-ttl-sec=3600

# Alternative: Client IP affinity
gcloud compute backend-services create my-backend-service-ip \
    --protocol=HTTP \
    --port-name=http \
    --health-checks=my-health-check \
    --global \
    --session-affinity=CLIENT_IP

# For TCP/UDP (Network Load Balancer)
gcloud compute backend-services create my-tcp-backend \
    --protocol=TCP \
    --health-checks=my-tcp-health-check \
    --global \
    --session-affinity=CLIENT_IP \
    --connection-draining-timeout=300
```

### Azure Load Balancer

```bash
# Create load balancer with session persistence
az network lb create \
    --resource-group myResourceGroup \
    --name myLoadBalancer \
    --sku Standard \
    --frontend-ip-name myFrontEnd \
    --backend-pool-name myBackEndPool

# Create load balancing rule with session persistence
# SourceIP: based on source IP
# SourceIPProtocol: based on source IP and protocol
az network lb rule create \
    --resource-group myResourceGroup \
    --lb-name myLoadBalancer \
    --name myHTTPRule \
    --protocol Tcp \
    --frontend-port 80 \
    --backend-port 80 \
    --frontend-ip-name myFrontEnd \
    --backend-pool-name myBackEndPool \
    --probe-name myHealthProbe \
    --load-distribution SourceIP \
    --idle-timeout 15

# Application Gateway with cookie-based affinity
az network application-gateway create \
    --resource-group myResourceGroup \
    --name myAppGateway \
    --sku Standard_v2 \
    --capacity 2

# Enable cookie-based affinity on backend settings
az network application-gateway http-settings update \
    --resource-group myResourceGroup \
    --gateway-name myAppGateway \
    --name myHTTPSettings \
    --cookie-based-affinity Enabled \
    --affinity-cookie-name ApplicationGatewayAffinity
```

---

## Best Practices Summary

### Choosing the Right Method

| Scenario | Recommended Method |
|----------|-------------------|
| Web applications with browser clients | Cookie-based affinity |
| Mobile apps with changing IPs | Cookie-based affinity |
| Non-HTTP protocols (TCP/UDP) | Source IP persistence |
| Corporate users behind NAT | Cookie-based affinity |
| Simple setups without cookie support | IP hash |
| WebSocket connections | IP hash or consistent hashing |

### Configuration Guidelines

1. **Set appropriate timeouts** - Session persistence timeout should match your application's session timeout. Too short causes unnecessary rebalancing; too long wastes resources.

2. **Plan for server failures** - When a server goes down, its sessions are lost. Either accept this or implement session replication at the application layer.

3. **Monitor session distribution** - Uneven distribution indicates problems. Use your load balancer's statistics to verify balanced traffic.

4. **Use health checks** - Always configure health checks so the load balancer can remove unhealthy servers from rotation.

5. **Consider graceful degradation** - Design your application to handle session loss gracefully. Users should be able to re-authenticate without data loss.

6. **Document your persistence strategy** - Make sure your team understands which method is used and why. This prevents debugging headaches.

### Security Considerations

1. **Secure your persistence cookies** - Use HttpOnly, Secure, and SameSite attributes to prevent cookie theft.

2. **Do not expose server information** - Cookie values should not reveal internal server names or IP addresses.

3. **Implement session validation** - Do not rely solely on load balancer persistence for security. Validate sessions at the application layer.

4. **Rotate persistence cookies** - For long-lived sessions, periodically rotate the persistence cookie to limit exposure.

### Performance Tips

1. **Prefer cookie-based over IP-based** - Cookie affinity handles NAT and mobile users better.

2. **Use consistent hashing** - When using IP hash, consistent hashing minimizes disruption when servers are added or removed.

3. **Keep connections alive** - Configure keepalive connections to backends to reduce connection overhead.

4. **Cache session data** - Even with persistence, caching session data in Redis improves performance and enables graceful failover.

---

## Conclusion

Session persistence is a necessary tool for stateful applications in load-balanced environments. While the ideal solution is to design stateless applications with externalized session storage, practical constraints often require load balancer-level persistence.

Choose cookie-based affinity for web applications, IP-based methods for non-HTTP protocols, and always implement proper health checks and monitoring. Most importantly, design your application to handle session loss gracefully - because eventually, servers fail and sessions are lost.

For comprehensive monitoring of your load balancers, backends, and session health, [OneUptime](https://oneuptime.com) provides unified observability that helps you detect and resolve issues before they impact users.
