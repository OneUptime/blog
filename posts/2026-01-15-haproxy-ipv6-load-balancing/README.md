# How to Configure HAProxy for IPv6 Load Balancing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: IPv6, HAProxy, Load Balancing, High Availability, Networking, DevOps

Description: A comprehensive guide to configuring HAProxy for IPv6 load balancing, covering dual-stack setups, health checks, SSL termination, and production-ready configurations.

---

IPv4 address exhaustion is no longer a distant warning-it is the present reality. Major cloud providers, mobile carriers, and enterprises are rapidly adopting IPv6 as the primary protocol for new deployments. If your load balancer cannot handle IPv6 traffic natively, you are building technical debt into your infrastructure from day one.

HAProxy remains the go-to solution for high-performance load balancing, and its IPv6 support is mature, battle-tested, and production-ready. This guide walks through everything you need to configure HAProxy for IPv6 environments, from basic setups to advanced dual-stack configurations that handle both protocol families seamlessly.

## Quick Reference Table

| Configuration Aspect | IPv4 Syntax | IPv6 Syntax | Notes |
| --- | --- | --- | --- |
| **Bind address** | `bind 192.168.1.10:80` | `bind [2001:db8::1]:80` | IPv6 addresses require square brackets |
| **Wildcard bind** | `bind 0.0.0.0:80` | `bind :::80` | `:::` binds to all IPv6 addresses |
| **Dual-stack bind** | `bind *:80` | `bind *:80,:::80` | Separate binds for each protocol family |
| **Backend server** | `server web1 192.168.1.20:8080` | `server web1 [2001:db8::20]:8080` | Backend servers use same bracket notation |
| **Health check source** | `source 192.168.1.10` | `source [2001:db8::1]` | Source IP for health checks |
| **ACL matching** | `src 192.168.0.0/16` | `src 2001:db8::/32` | Standard CIDR notation for both |
| **Stick table key** | `src` | `src` | Works identically for both protocols |
| **DNS resolution** | A records | AAAA records | Configure resolvers appropriately |

## Why IPv6 Load Balancing Matters

Before diving into configuration, understand why IPv6 support is critical:

1. **Mobile traffic is primarily IPv6.** Most mobile carriers assign IPv6 addresses by default. If your infrastructure is IPv4-only, you are forcing NAT64 translation for a significant portion of your users.

2. **Cloud-native environments prefer IPv6.** Kubernetes, container orchestrators, and service meshes often use IPv6 for internal communication to avoid address conflicts.

3. **Performance benefits.** IPv6 eliminates NAT overhead, reduces routing table complexity, and enables end-to-end connectivity without address translation.

4. **Future-proofing.** IPv4 addresses are expensive and scarce. Building IPv6-native infrastructure now prevents costly migrations later.

## Basic HAProxy IPv6 Configuration

Let us start with a minimal IPv6-only configuration to understand the fundamentals.

### Minimal IPv6 Frontend

```haproxy
global
    log /dev/log local0
    log /dev/log local1 notice
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin
    stats timeout 30s
    user haproxy
    group haproxy
    daemon

    # Enable IPv6 support explicitly
    tune.ssl.default-dh-param 2048

defaults
    log     global
    mode    http
    option  httplog
    option  dontlognull
    timeout connect 5000
    timeout client  50000
    timeout server  50000
    errorfile 400 /etc/haproxy/errors/400.http
    errorfile 403 /etc/haproxy/errors/403.http
    errorfile 408 /etc/haproxy/errors/408.http
    errorfile 500 /etc/haproxy/errors/500.http
    errorfile 502 /etc/haproxy/errors/502.http
    errorfile 503 /etc/haproxy/errors/503.http
    errorfile 504 /etc/haproxy/errors/504.http

frontend http_ipv6_front
    # Bind to all IPv6 addresses on port 80
    bind :::80

    default_backend web_servers

backend web_servers
    balance roundrobin
    option httpchk GET /health

    # IPv6 backend servers - note the bracket notation
    server web1 [2001:db8:1::10]:8080 check
    server web2 [2001:db8:1::11]:8080 check
    server web3 [2001:db8:1::12]:8080 check
```

### Key Syntax Rules for IPv6

1. **Square brackets are mandatory** when specifying an IPv6 address with a port. Without brackets, HAProxy cannot distinguish between the address colons and the port separator.

2. **The `:::` notation** binds to all available IPv6 addresses, equivalent to `0.0.0.0` for IPv4.

3. **Link-local addresses** (starting with `fe80::`) require a zone identifier (interface name) and are rarely used in load balancing scenarios.

## Dual-Stack Configuration

Most production environments need to serve both IPv4 and IPv6 clients simultaneously. HAProxy handles this elegantly with multiple bind statements.

### Complete Dual-Stack Setup

```haproxy
global
    log /dev/log local0
    log /dev/log local1 notice
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin expose-fd listeners
    stats timeout 30s
    user haproxy
    group haproxy
    daemon

    # Performance tuning
    maxconn 50000
    tune.ssl.default-dh-param 2048

    # Enable multi-threading for better performance
    nbthread 4

defaults
    log     global
    mode    http
    option  httplog
    option  dontlognull
    option  forwardfor
    option  http-server-close

    timeout connect 5s
    timeout client  30s
    timeout server  30s
    timeout http-request 10s
    timeout http-keep-alive 10s
    timeout queue 30s

    # Retry failed connections
    retries 3

    # Default error files
    errorfile 400 /etc/haproxy/errors/400.http
    errorfile 403 /etc/haproxy/errors/403.http
    errorfile 408 /etc/haproxy/errors/408.http
    errorfile 500 /etc/haproxy/errors/500.http
    errorfile 502 /etc/haproxy/errors/502.http
    errorfile 503 /etc/haproxy/errors/503.http
    errorfile 504 /etc/haproxy/errors/504.http

frontend http_dual_stack
    # Bind to both IPv4 and IPv6
    bind 0.0.0.0:80
    bind :::80

    # Optionally bind to specific addresses
    # bind 192.168.1.100:80
    # bind [2001:db8:1::100]:80

    # Add custom header to identify protocol version
    http-request set-header X-Client-IP-Version ipv4 if { src -f /etc/haproxy/ipv4_networks.lst }
    http-request set-header X-Client-IP-Version ipv6 if { src -f /etc/haproxy/ipv6_networks.lst }

    # Route based on path
    acl is_api path_beg /api
    acl is_static path_beg /static

    use_backend api_servers if is_api
    use_backend static_servers if is_static
    default_backend web_servers

frontend https_dual_stack
    # HTTPS with dual-stack support
    bind 0.0.0.0:443 ssl crt /etc/haproxy/certs/combined.pem alpn h2,http/1.1
    bind :::443 ssl crt /etc/haproxy/certs/combined.pem alpn h2,http/1.1

    # HSTS header
    http-response set-header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"

    # Route to appropriate backend
    default_backend web_servers_ssl

backend web_servers
    balance roundrobin
    option httpchk GET /health HTTP/1.1\r\nHost:\ localhost
    http-check expect status 200

    # Mixed IPv4 and IPv6 backend servers
    server web1-v4 192.168.1.10:8080 check weight 100
    server web1-v6 [2001:db8:1::10]:8080 check weight 100
    server web2-v4 192.168.1.11:8080 check weight 100
    server web2-v6 [2001:db8:1::11]:8080 check weight 100
    server web3-v4 192.168.1.12:8080 check weight 100
    server web3-v6 [2001:db8:1::12]:8080 check weight 100

backend web_servers_ssl
    balance roundrobin
    option httpchk GET /health HTTP/1.1\r\nHost:\ localhost
    http-check expect status 200

    # SSL backend connections (if needed)
    server web1 [2001:db8:1::10]:8443 check ssl verify none
    server web2 [2001:db8:1::11]:8443 check ssl verify none
    server web3 [2001:db8:1::12]:8443 check ssl verify none

backend api_servers
    balance leastconn
    option httpchk GET /api/health HTTP/1.1\r\nHost:\ localhost
    http-check expect status 200

    server api1 [2001:db8:2::10]:9000 check
    server api2 [2001:db8:2::11]:9000 check

backend static_servers
    balance roundrobin

    server static1 [2001:db8:3::10]:8080 check
    server static2 [2001:db8:3::11]:8080 check
```

## IPv6 Health Checks

Health checks in IPv6 environments work identically to IPv4, but you need to ensure your health check endpoints are accessible over IPv6.

### Advanced Health Check Configuration

```haproxy
backend web_servers_advanced_checks
    balance roundrobin

    # HTTP health check with custom request
    option httpchk
    http-check connect
    http-check send meth GET uri /health ver HTTP/1.1 hdr Host localhost hdr User-Agent HAProxy-Health-Check
    http-check expect status 200

    # Server definitions with comprehensive check options
    server web1 [2001:db8:1::10]:8080 check inter 5s fall 3 rise 2 weight 100
    server web2 [2001:db8:1::11]:8080 check inter 5s fall 3 rise 2 weight 100
    server web3 [2001:db8:1::12]:8080 check inter 5s fall 3 rise 2 weight 100

    # Backup server (only used when all primary servers are down)
    server backup1 [2001:db8:1::99]:8080 check backup

backend tcp_servers_health_check
    mode tcp
    balance roundrobin

    # TCP health check (layer 4)
    option tcp-check
    tcp-check connect
    tcp-check send PING\r\n
    tcp-check expect string PONG

    server tcp1 [2001:db8:4::10]:6379 check inter 3s
    server tcp2 [2001:db8:4::11]:6379 check inter 3s

backend external_health_check
    balance roundrobin

    # Use external script for health checks
    option external-check
    external-check path "/usr/bin:/bin"
    external-check command /etc/haproxy/scripts/health-check.sh

    server ext1 [2001:db8:5::10]:8080 check
    server ext2 [2001:db8:5::11]:8080 check
```

### Health Check Script Example

Create `/etc/haproxy/scripts/health-check.sh`:

```bash
#!/bin/bash
# HAProxy external health check script for IPv6 servers
# Arguments: $1=server_addr $2=server_port $3=server_name

SERVER_ADDR=$1
SERVER_PORT=$2
SERVER_NAME=$3

# For IPv6 addresses, curl needs brackets
if [[ $SERVER_ADDR == *":"* ]]; then
    SERVER_ADDR="[$SERVER_ADDR]"
fi

# Perform health check
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    --connect-timeout 5 \
    --max-time 10 \
    "http://${SERVER_ADDR}:${SERVER_PORT}/health")

if [ "$RESPONSE" = "200" ]; then
    exit 0
else
    exit 1
fi
```

## DNS Resolution for IPv6 Backends

When backend servers are specified by hostname, HAProxy needs proper DNS resolver configuration to handle both A and AAAA records.

### DNS Resolver Configuration

```haproxy
resolvers dns_servers
    # IPv4 DNS servers
    nameserver dns1 8.8.8.8:53
    nameserver dns2 8.8.4.4:53

    # IPv6 DNS servers
    nameserver dns3 [2001:4860:4860::8888]:53
    nameserver dns4 [2001:4860:4860::8844]:53

    # Internal DNS servers (if applicable)
    nameserver internal1 [2001:db8:100::53]:53

    # Resolution settings
    accepted_payload_size 8192
    resolve_retries 3
    timeout resolve 1s
    timeout retry 1s
    hold valid 10s
    hold obsolete 30s
    hold timeout 30s
    hold refused 30s
    hold nx 30s
    hold other 30s

backend web_servers_dns
    balance roundrobin
    option httpchk GET /health

    # Use DNS resolution with IPv6 preference
    server-template web 5 web.example.com:8080 check resolvers dns_servers resolve-prefer ipv6 init-addr last,libc,none

backend web_servers_dns_ipv4_fallback
    balance roundrobin
    option httpchk GET /health

    # Prefer IPv4 but fall back to IPv6
    server-template web 5 web.example.com:8080 check resolvers dns_servers resolve-prefer ipv4 init-addr last,libc,none

backend web_servers_dns_both
    balance roundrobin
    option httpchk GET /health

    # Resolve both IPv4 and IPv6 addresses
    server-template web-v4 5 web.example.com:8080 check resolvers dns_servers resolve-prefer ipv4
    server-template web-v6 5 web.example.com:8080 check resolvers dns_servers resolve-prefer ipv6
```

## SSL/TLS Termination with IPv6

SSL termination works the same for IPv6 as IPv4. The key is ensuring your certificates and bind statements are properly configured.

### Complete SSL Configuration

```haproxy
global
    log /dev/log local0
    log /dev/log local1 notice
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin expose-fd listeners
    stats timeout 30s
    user haproxy
    group haproxy
    daemon

    # SSL/TLS global settings
    ssl-default-bind-ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384
    ssl-default-bind-ciphersuites TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256
    ssl-default-bind-options ssl-min-ver TLSv1.2 no-tls-tickets
    ssl-default-server-ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256
    ssl-default-server-options ssl-min-ver TLSv1.2 no-tls-tickets

    tune.ssl.default-dh-param 2048
    ssl-dh-param-file /etc/haproxy/dhparam.pem

defaults
    log     global
    mode    http
    option  httplog
    option  dontlognull
    option  forwardfor

    timeout connect 5s
    timeout client  30s
    timeout server  30s

frontend https_ipv6_front
    # Dual-stack HTTPS binding
    bind 0.0.0.0:443 ssl crt /etc/haproxy/certs/ alpn h2,http/1.1
    bind :::443 ssl crt /etc/haproxy/certs/ alpn h2,http/1.1

    # HTTP to HTTPS redirect frontend
    bind 0.0.0.0:80
    bind :::80

    # Redirect HTTP to HTTPS
    http-request redirect scheme https unless { ssl_fc }

    # Security headers
    http-response set-header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    http-response set-header X-Frame-Options "SAMEORIGIN"
    http-response set-header X-Content-Type-Options "nosniff"
    http-response set-header X-XSS-Protection "1; mode=block"
    http-response set-header Referrer-Policy "strict-origin-when-cross-origin"

    # Log SSL information
    http-request set-header X-SSL-Protocol %[ssl_fc_protocol]
    http-request set-header X-SSL-Cipher %[ssl_fc_cipher]

    default_backend web_servers

backend web_servers
    balance roundrobin
    option httpchk GET /health

    # Backend servers (can be IPv4 or IPv6)
    server web1 [2001:db8:1::10]:8080 check
    server web2 [2001:db8:1::11]:8080 check
    server web3 [2001:db8:1::12]:8080 check
```

### SNI-Based Routing with IPv6

```haproxy
frontend https_sni_front
    bind 0.0.0.0:443 ssl crt /etc/haproxy/certs/default.pem
    bind :::443 ssl crt /etc/haproxy/certs/default.pem

    # SNI-based ACLs
    acl is_app1 ssl_fc_sni -i app1.example.com
    acl is_app2 ssl_fc_sni -i app2.example.com
    acl is_api ssl_fc_sni -i api.example.com

    # Route based on SNI
    use_backend app1_servers if is_app1
    use_backend app2_servers if is_app2
    use_backend api_servers if is_api
    default_backend default_servers

backend app1_servers
    balance roundrobin
    server app1-1 [2001:db8:10::1]:8080 check
    server app1-2 [2001:db8:10::2]:8080 check

backend app2_servers
    balance roundrobin
    server app2-1 [2001:db8:20::1]:8080 check
    server app2-2 [2001:db8:20::2]:8080 check

backend api_servers
    balance leastconn
    server api1 [2001:db8:30::1]:9000 check
    server api2 [2001:db8:30::2]:9000 check

backend default_servers
    balance roundrobin
    server default1 [2001:db8:1::1]:8080 check
```

## Rate Limiting and Stick Tables with IPv6

Stick tables work seamlessly with IPv6 addresses. You can use them for session persistence, rate limiting, and abuse prevention.

### Rate Limiting Configuration

```haproxy
frontend http_rate_limited
    bind 0.0.0.0:80
    bind :::80

    # Define stick table for rate limiting
    # Key type 'ipv6' works for both IPv4 and IPv6 (IPv4 mapped)
    stick-table type ipv6 size 1m expire 30s store http_req_rate(10s),conn_cur,conn_rate(10s)

    # Track client IP in stick table
    http-request track-sc0 src

    # Define rate limit thresholds
    acl is_rate_limited sc_http_req_rate(0) gt 100
    acl too_many_connections sc_conn_cur(0) gt 50
    acl connection_rate_exceeded sc_conn_rate(0) gt 20

    # Block or tarpit abusive clients
    http-request deny deny_status 429 if is_rate_limited
    http-request deny deny_status 429 if too_many_connections
    http-request deny deny_status 429 if connection_rate_exceeded

    # Add rate limit headers
    http-response set-header X-RateLimit-Limit 100
    http-response set-header X-RateLimit-Remaining %[sc_http_req_rate(0),sub(100)]

    default_backend web_servers

frontend http_advanced_rate_limit
    bind 0.0.0.0:80
    bind :::80

    # Multiple stick tables for different purposes
    # Table for general rate limiting
    stick-table type ipv6 size 1m expire 60s store http_req_rate(60s),bytes_out_rate(60s) name rate_limit_table

    # Table for authentication failures
    stick-table type ipv6 size 100k expire 5m store gpc0,gpc0_rate(1m) name auth_failure_table

    # Table for session persistence
    stick-table type ipv6 size 200k expire 30m store server_id name session_table

    # Track in rate limit table
    http-request track-sc0 src table rate_limit_table

    # Track authentication failures
    acl is_login_page path_beg /login /auth
    http-request track-sc1 src table auth_failure_table if is_login_page

    # Rate limit rules
    acl rate_abuse sc_http_req_rate(0,rate_limit_table) gt 1000
    acl bandwidth_abuse sc_bytes_out_rate(0,rate_limit_table) gt 104857600
    acl auth_abuse sc_gpc0_rate(1,auth_failure_table) gt 10

    http-request deny deny_status 429 if rate_abuse
    http-request deny deny_status 429 if bandwidth_abuse
    http-request deny deny_status 403 if auth_abuse

    default_backend web_servers
```

### Session Persistence with IPv6

```haproxy
backend web_servers_sticky
    balance roundrobin

    # Stick table for session persistence using IPv6 addresses
    stick-table type ipv6 size 200k expire 30m
    stick on src

    server web1 [2001:db8:1::10]:8080 check
    server web2 [2001:db8:1::11]:8080 check
    server web3 [2001:db8:1::12]:8080 check

backend web_servers_cookie_sticky
    balance roundrobin

    # Cookie-based persistence (works regardless of IP version)
    cookie SERVERID insert indirect nocache

    server web1 [2001:db8:1::10]:8080 check cookie web1
    server web2 [2001:db8:1::11]:8080 check cookie web2
    server web3 [2001:db8:1::12]:8080 check cookie web3
```

## ACLs and Routing with IPv6

ACL rules for IPv6 use standard CIDR notation. You can match on source addresses, create allowlists and blocklists, and implement geographic or network-based routing.

### IPv6 ACL Examples

```haproxy
frontend http_with_acls
    bind 0.0.0.0:80
    bind :::80

    # IPv6 network ACLs
    acl is_internal_v6 src 2001:db8:100::/48
    acl is_internal_v4 src 10.0.0.0/8 172.16.0.0/12 192.168.0.0/16
    acl is_internal or is_internal_v4 is_internal_v6

    # Specific IPv6 address ACL
    acl is_monitoring_server src 2001:db8:100::53

    # IPv6 prefix ACL (match any address in prefix)
    acl is_office_network src 2001:db8:200::/48

    # Block specific IPv6 addresses or ranges
    acl is_blocked_v6 src 2001:db8:bad::/48
    acl is_blocked_v4 src 192.0.2.0/24
    http-request deny if is_blocked_v6 or is_blocked_v4

    # Allow internal access to admin paths
    acl is_admin_path path_beg /admin /management
    http-request deny if is_admin_path !is_internal

    # Route monitoring traffic differently
    use_backend monitoring_backend if is_monitoring_server

    # Route internal traffic to internal backend
    use_backend internal_servers if is_internal

    default_backend public_servers

frontend http_geo_routing
    bind 0.0.0.0:80
    bind :::80

    # Load IPv6 networks from files for geographic routing
    acl is_north_america_v6 src -f /etc/haproxy/geo/north_america_v6.lst
    acl is_europe_v6 src -f /etc/haproxy/geo/europe_v6.lst
    acl is_asia_v6 src -f /etc/haproxy/geo/asia_v6.lst

    # IPv4 counterparts
    acl is_north_america_v4 src -f /etc/haproxy/geo/north_america_v4.lst
    acl is_europe_v4 src -f /etc/haproxy/geo/europe_v4.lst
    acl is_asia_v4 src -f /etc/haproxy/geo/asia_v4.lst

    # Combined ACLs
    acl is_north_america or is_north_america_v4 is_north_america_v6
    acl is_europe or is_europe_v4 is_europe_v6
    acl is_asia or is_asia_v4 is_asia_v6

    # Route to regional backends
    use_backend na_servers if is_north_america
    use_backend eu_servers if is_europe
    use_backend asia_servers if is_asia

    default_backend global_servers

backend na_servers
    balance roundrobin
    server na1 [2001:db8:na::1]:8080 check
    server na2 [2001:db8:na::2]:8080 check

backend eu_servers
    balance roundrobin
    server eu1 [2001:db8:eu::1]:8080 check
    server eu2 [2001:db8:eu::2]:8080 check

backend asia_servers
    balance roundrobin
    server asia1 [2001:db8:asia::1]:8080 check
    server asia2 [2001:db8:asia::2]:8080 check

backend global_servers
    balance roundrobin
    server global1 [2001:db8:global::1]:8080 check
    server global2 [2001:db8:global::2]:8080 check
```

## Logging and Monitoring IPv6 Traffic

Proper logging is essential for troubleshooting IPv6 deployments. HAProxy logs include client IP addresses in their native format.

### Enhanced Logging Configuration

```haproxy
global
    log /dev/log local0 info
    log /dev/log local1 notice

    # Alternative: log to remote syslog server over IPv6
    log [2001:db8:log::1]:514 local0 info

    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin
    user haproxy
    group haproxy
    daemon

defaults
    log global
    mode http

    # Custom log format including IP version indicator
    log-format "%ci:%cp [%tr] %ft %b/%s %TR/%Tw/%Tc/%Tr/%Ta %ST %B %CC %CS %tsc %ac/%fc/%bc/%sc/%rc %sq/%bq %hr %hs %{+Q}r"

    option httplog
    option dontlognull

frontend http_with_logging
    bind 0.0.0.0:80
    bind :::80

    # Capture headers for logging
    capture request header Host len 64
    capture request header User-Agent len 128
    capture request header X-Forwarded-For len 64
    capture request header X-Real-IP len 64

    # Add custom headers for logging IP version
    http-request set-var(txn.ip_version) str(ipv6) if { src -m found } { src,ipv6 }
    http-request set-var(txn.ip_version) str(ipv4) if { src -m found } !{ src,ipv6 }

    # Add header indicating IP version for backend processing
    http-request set-header X-IP-Version %[var(txn.ip_version)]

    default_backend web_servers

# Stats page accessible over IPv6
listen stats
    bind 0.0.0.0:8404
    bind :::8404

    stats enable
    stats uri /stats
    stats realm HAProxy\ Statistics
    stats auth admin:secure_password_here
    stats refresh 10s

    # Restrict stats access to internal networks
    acl is_internal src 10.0.0.0/8 172.16.0.0/12 192.168.0.0/16 2001:db8:100::/48
    http-request deny unless is_internal
```

### Prometheus Metrics Export

```haproxy
frontend prometheus_exporter
    bind 0.0.0.0:8405
    bind :::8405

    http-request use-service prometheus-exporter if { path /metrics }

    # Restrict to monitoring servers
    acl is_prometheus src 2001:db8:monitor::0/64 10.0.100.0/24
    http-request deny unless is_prometheus

    stats enable
    stats uri /stats
    stats refresh 10s
```

## High Availability with IPv6

For production deployments, you need redundant HAProxy instances. This section covers keepalived integration with IPv6 virtual IPs.

### Keepalived Configuration for IPv6 VIPs

Create `/etc/keepalived/keepalived.conf` on the primary node:

```
vrrp_script chk_haproxy {
    script "/usr/bin/killall -0 haproxy"
    interval 2
    weight 2
}

vrrp_instance VI_1 {
    state MASTER
    interface eth0
    virtual_router_id 51
    priority 101
    advert_int 1

    authentication {
        auth_type PASS
        auth_pass secure_password
    }

    # IPv4 virtual IP
    virtual_ipaddress {
        192.168.1.100/24
    }

    # IPv6 virtual IP
    virtual_ipaddress_excluded {
        2001:db8:1::100/64
    }

    track_script {
        chk_haproxy
    }
}
```

Secondary node configuration:

```
vrrp_script chk_haproxy {
    script "/usr/bin/killall -0 haproxy"
    interval 2
    weight 2
}

vrrp_instance VI_1 {
    state BACKUP
    interface eth0
    virtual_router_id 51
    priority 100
    advert_int 1

    authentication {
        auth_type PASS
        auth_pass secure_password
    }

    virtual_ipaddress {
        192.168.1.100/24
    }

    virtual_ipaddress_excluded {
        2001:db8:1::100/64
    }

    track_script {
        chk_haproxy
    }
}
```

### HAProxy Configuration for VIPs

```haproxy
frontend http_ha
    # Bind to virtual IPs
    bind 192.168.1.100:80
    bind [2001:db8:1::100]:80

    # Also bind to node-specific IPs for direct access
    bind 192.168.1.10:80
    bind [2001:db8:1::10]:80

    default_backend web_servers

frontend https_ha
    bind 192.168.1.100:443 ssl crt /etc/haproxy/certs/
    bind [2001:db8:1::100]:443 ssl crt /etc/haproxy/certs/

    bind 192.168.1.10:443 ssl crt /etc/haproxy/certs/
    bind [2001:db8:1::10]:443 ssl crt /etc/haproxy/certs/

    default_backend web_servers
```

## Proxy Protocol with IPv6

When HAProxy sits behind another proxy or CDN, use PROXY protocol to preserve the original client IP address.

### PROXY Protocol Configuration

```haproxy
frontend http_proxy_protocol
    # Accept PROXY protocol from trusted sources
    bind 0.0.0.0:80 accept-proxy
    bind :::80 accept-proxy

    # Mixed: some connections use PROXY protocol, others do not
    bind 0.0.0.0:8080
    bind :::8080

    # Log the real client IP (from PROXY protocol header)
    option forwardfor

    default_backend web_servers

frontend http_proxy_protocol_v2
    # PROXY protocol v2 support
    bind 0.0.0.0:80 accept-proxy
    bind :::80 accept-proxy

    # The src fetch sample returns the original client IP
    # even for IPv6 addresses passed via PROXY protocol

    acl is_internal src 10.0.0.0/8 2001:db8::/32

    default_backend web_servers

backend web_servers_send_proxy
    balance roundrobin

    # Forward PROXY protocol to backend servers
    server web1 [2001:db8:1::10]:8080 check send-proxy-v2
    server web2 [2001:db8:1::11]:8080 check send-proxy-v2
```

## TCP Load Balancing with IPv6

For non-HTTP protocols, HAProxy operates in TCP mode. IPv6 configuration is identical to HTTP mode.

### TCP Mode Configuration

```haproxy
defaults tcp_defaults
    mode tcp
    log global
    option tcplog
    option dontlognull

    timeout connect 10s
    timeout client 300s
    timeout server 300s

frontend mysql_front
    bind 0.0.0.0:3306
    bind :::3306

    default_backend mysql_servers

backend mysql_servers
    balance leastconn
    option mysql-check user haproxy

    server mysql1 [2001:db8:db::1]:3306 check
    server mysql2 [2001:db8:db::2]:3306 check backup

frontend redis_front
    bind 0.0.0.0:6379
    bind :::6379

    default_backend redis_servers

backend redis_servers
    balance first
    option tcp-check
    tcp-check send PING\r\n
    tcp-check expect string +PONG

    server redis1 [2001:db8:cache::1]:6379 check inter 1s
    server redis2 [2001:db8:cache::2]:6379 check inter 1s

frontend postgres_front
    bind 0.0.0.0:5432
    bind :::5432

    default_backend postgres_servers

backend postgres_servers
    balance roundrobin
    option pgsql-check user haproxy

    server pg1 [2001:db8:db::10]:5432 check
    server pg2 [2001:db8:db::11]:5432 check
    server pg3 [2001:db8:db::12]:5432 check
```

## Troubleshooting IPv6 Issues

### Common Problems and Solutions

**Problem: HAProxy fails to start with IPv6 bind error**

```
[ALERT] ... : Starting frontend XXXX: cannot bind socket [:::80]
```

Solution: Ensure IPv6 is enabled on the system and the address is available:

```bash
# Check if IPv6 is enabled
cat /proc/sys/net/ipv6/conf/all/disable_ipv6
# Should return 0

# Check available IPv6 addresses
ip -6 addr show

# Enable IPv6 if disabled
sysctl -w net.ipv6.conf.all.disable_ipv6=0
```

**Problem: IPv6 health checks fail but IPv4 works**

Solution: Verify backend servers are listening on IPv6:

```bash
# Check if service is listening on IPv6
ss -tlnp | grep -E ':::8080|[::]:8080'

# Test connectivity
curl -6 -v http://[2001:db8:1::10]:8080/health
```

**Problem: IPv6 connections timeout**

Solution: Check firewall rules and routing:

```bash
# Check ip6tables rules
ip6tables -L -n -v

# Test routing
traceroute6 2001:db8:1::10

# Check for path MTU issues
ping6 -M do -s 1452 2001:db8:1::10
```

### Debugging Configuration

```haproxy
global
    log /dev/log local0 debug

    # Enable debug mode (do not use in production)
    # debug

    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin
    user haproxy
    group haproxy
    daemon

defaults
    log global
    mode http
    option httplog
    option dontlognull

    # Enable detailed logging
    log-format "%ci:%cp [%tr] %ft %b/%s %TR/%Tw/%Tc/%Tr/%Ta %ST %B %CC %CS %tsc %ac/%fc/%bc/%sc/%rc %sq/%bq %hr %hs %{+Q}r [ip_ver:%[src,ipv6,iif(ipv6,ipv4)]]"

frontend debug_front
    bind 0.0.0.0:80
    bind :::80

    # Log all requests including headers
    option httplog
    capture request header Host len 64
    capture request header X-Forwarded-For len 128

    # Return debug information
    http-request return status 200 content-type text/plain string "Client IP: %[src]\nIP Version: %[src,ipv6,iif(ipv6,ipv4)]\nServer Address: %[dst]\nServer Port: %[dst_port]\n" if { path /debug }

    default_backend web_servers
```

### Runtime Debugging Commands

```bash
# Show current connections by IP version
echo "show sess" | socat stdio /run/haproxy/admin.sock | grep -E 'src=[0-9a-f:]+' | head -20

# Show backend server status
echo "show servers state" | socat stdio /run/haproxy/admin.sock

# Show stick table contents (includes IPv6 entries)
echo "show table rate_limit_table" | socat stdio /run/haproxy/admin.sock

# Clear stick table entry for specific IPv6 address
echo "clear table rate_limit_table key 2001:db8:1::100" | socat stdio /run/haproxy/admin.sock

# Disable/enable server
echo "disable server web_servers/web1" | socat stdio /run/haproxy/admin.sock
echo "enable server web_servers/web1" | socat stdio /run/haproxy/admin.sock

# Get stats in CSV format
echo "show stat" | socat stdio /run/haproxy/admin.sock
```

## Performance Tuning for IPv6

IPv6 does not inherently perform differently than IPv4, but there are considerations for high-traffic deployments.

### System-Level Tuning

```bash
# /etc/sysctl.conf additions for IPv6 performance

# Increase connection tracking table size
net.netfilter.nf_conntrack_max = 1000000

# IPv6 specific settings
net.ipv6.conf.all.forwarding = 1
net.ipv6.conf.default.forwarding = 1

# Increase local port range
net.ipv4.ip_local_port_range = 1024 65535

# TCP tuning (applies to both IPv4 and IPv6)
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_fin_timeout = 10
net.ipv4.tcp_tw_reuse = 1

# Memory settings
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 87380 16777216
```

### HAProxy Performance Configuration

```haproxy
global
    log /dev/log local0
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin expose-fd listeners
    stats timeout 30s
    user haproxy
    group haproxy
    daemon

    # Performance tuning
    maxconn 100000
    nbthread 8
    cpu-map auto:1/1-8 0-7

    # SSL performance
    tune.ssl.default-dh-param 2048
    tune.ssl.cachesize 100000
    tune.ssl.lifetime 600
    ssl-engine rdrand

    # Buffer tuning
    tune.bufsize 32768
    tune.maxrewrite 8192
    tune.http.maxhdr 128

defaults
    log global
    mode http
    option httplog
    option dontlognull
    option http-server-close
    option forwardfor

    timeout connect 5s
    timeout client 30s
    timeout server 30s
    timeout http-request 10s
    timeout http-keep-alive 15s
    timeout queue 30s
    timeout tunnel 1h

    maxconn 50000

frontend high_performance_front
    bind 0.0.0.0:80
    bind :::80
    bind 0.0.0.0:443 ssl crt /etc/haproxy/certs/ alpn h2,http/1.1
    bind :::443 ssl crt /etc/haproxy/certs/ alpn h2,http/1.1

    # Connection limits per source IP
    stick-table type ipv6 size 1m expire 30s store conn_cur,conn_rate(10s)
    http-request track-sc0 src
    http-request deny deny_status 429 if { sc_conn_cur(0) gt 100 }

    default_backend web_servers

backend web_servers
    balance roundrobin
    option httpchk GET /health
    http-check expect status 200

    # Server connection limits and queuing
    default-server maxconn 5000 maxqueue 1000

    server web1 [2001:db8:1::10]:8080 check
    server web2 [2001:db8:1::11]:8080 check
    server web3 [2001:db8:1::12]:8080 check
    server web4 [2001:db8:1::13]:8080 check
```

## Complete Production Configuration

Here is a comprehensive production-ready configuration combining all the concepts covered.

```haproxy
#---------------------------------------------------------------------
# Global settings
#---------------------------------------------------------------------
global
    log /dev/log local0
    log /dev/log local1 notice
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin expose-fd listeners
    stats timeout 30s
    user haproxy
    group haproxy
    daemon

    # Performance
    maxconn 100000
    nbthread 4

    # SSL
    tune.ssl.default-dh-param 2048
    ssl-default-bind-ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384
    ssl-default-bind-ciphersuites TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256
    ssl-default-bind-options ssl-min-ver TLSv1.2 no-tls-tickets

#---------------------------------------------------------------------
# DNS Resolvers
#---------------------------------------------------------------------
resolvers dns
    nameserver dns1 8.8.8.8:53
    nameserver dns2 [2001:4860:4860::8888]:53
    accepted_payload_size 8192
    resolve_retries 3
    timeout resolve 1s
    timeout retry 1s
    hold valid 10s

#---------------------------------------------------------------------
# Defaults
#---------------------------------------------------------------------
defaults
    log global
    mode http
    option httplog
    option dontlognull
    option forwardfor
    option http-server-close

    timeout connect 5s
    timeout client 30s
    timeout server 30s
    timeout http-request 10s
    timeout http-keep-alive 10s
    timeout queue 30s

    retries 3

    errorfile 400 /etc/haproxy/errors/400.http
    errorfile 403 /etc/haproxy/errors/403.http
    errorfile 408 /etc/haproxy/errors/408.http
    errorfile 500 /etc/haproxy/errors/500.http
    errorfile 502 /etc/haproxy/errors/502.http
    errorfile 503 /etc/haproxy/errors/503.http
    errorfile 504 /etc/haproxy/errors/504.http

#---------------------------------------------------------------------
# Stats
#---------------------------------------------------------------------
listen stats
    bind 0.0.0.0:8404
    bind :::8404
    stats enable
    stats uri /stats
    stats realm HAProxy\ Statistics
    stats auth admin:CHANGE_THIS_PASSWORD
    stats refresh 10s
    acl is_internal src 10.0.0.0/8 172.16.0.0/12 192.168.0.0/16 2001:db8::/32
    http-request deny unless is_internal

#---------------------------------------------------------------------
# Frontend: HTTP (redirect to HTTPS)
#---------------------------------------------------------------------
frontend http_front
    bind 0.0.0.0:80
    bind :::80

    # ACME challenge for Let's Encrypt
    acl is_acme path_beg /.well-known/acme-challenge/
    use_backend acme_backend if is_acme

    # Redirect everything else to HTTPS
    http-request redirect scheme https code 301 unless is_acme

#---------------------------------------------------------------------
# Frontend: HTTPS
#---------------------------------------------------------------------
frontend https_front
    bind 0.0.0.0:443 ssl crt /etc/haproxy/certs/ alpn h2,http/1.1
    bind :::443 ssl crt /etc/haproxy/certs/ alpn h2,http/1.1

    # Rate limiting
    stick-table type ipv6 size 1m expire 30s store http_req_rate(10s),conn_cur
    http-request track-sc0 src
    http-request deny deny_status 429 if { sc_http_req_rate(0) gt 100 }
    http-request deny deny_status 429 if { sc_conn_cur(0) gt 50 }

    # Security headers
    http-response set-header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    http-response set-header X-Frame-Options "SAMEORIGIN"
    http-response set-header X-Content-Type-Options "nosniff"
    http-response set-header X-XSS-Protection "1; mode=block"

    # ACLs
    acl is_internal src 10.0.0.0/8 172.16.0.0/12 192.168.0.0/16 2001:db8:100::/48
    acl is_api path_beg /api
    acl is_admin path_beg /admin
    acl is_static path_beg /static /assets /images

    # Block admin access from external IPs
    http-request deny if is_admin !is_internal

    # Routing
    use_backend api_servers if is_api
    use_backend static_servers if is_static
    default_backend web_servers

#---------------------------------------------------------------------
# Backend: Web Servers
#---------------------------------------------------------------------
backend web_servers
    balance roundrobin
    option httpchk GET /health HTTP/1.1\r\nHost:\ localhost
    http-check expect status 200

    cookie SERVERID insert indirect nocache

    server web1 [2001:db8:1::10]:8080 check cookie web1 weight 100
    server web2 [2001:db8:1::11]:8080 check cookie web2 weight 100
    server web3 [2001:db8:1::12]:8080 check cookie web3 weight 100

#---------------------------------------------------------------------
# Backend: API Servers
#---------------------------------------------------------------------
backend api_servers
    balance leastconn
    option httpchk GET /api/health HTTP/1.1\r\nHost:\ localhost
    http-check expect status 200

    server api1 [2001:db8:2::10]:9000 check
    server api2 [2001:db8:2::11]:9000 check

#---------------------------------------------------------------------
# Backend: Static Servers
#---------------------------------------------------------------------
backend static_servers
    balance roundrobin

    server static1 [2001:db8:3::10]:8080 check
    server static2 [2001:db8:3::11]:8080 check

#---------------------------------------------------------------------
# Backend: ACME Challenge
#---------------------------------------------------------------------
backend acme_backend
    server acme 127.0.0.1:8080
```

## Summary

Configuring HAProxy for IPv6 load balancing follows the same patterns as IPv4, with a few syntax differences:

| Configuration Item | Key Points |
| --- | --- |
| **Address notation** | Always use square brackets around IPv6 addresses with ports: `[2001:db8::1]:80` |
| **Wildcard binding** | Use `:::` to bind to all IPv6 addresses, equivalent to `0.0.0.0` for IPv4 |
| **Dual-stack setup** | Add separate bind statements for IPv4 and IPv6: `bind 0.0.0.0:80` and `bind :::80` |
| **ACL source matching** | IPv6 CIDR notation works identically: `src 2001:db8::/32` |
| **Stick tables** | Use `type ipv6` which handles both IPv4 and IPv6 addresses |
| **Health checks** | Work identically; ensure backends are reachable over IPv6 |
| **DNS resolution** | Configure AAAA record resolution with `resolve-prefer ipv6` |
| **SSL/TLS** | No changes required; certificates work for both protocol families |
| **PROXY protocol** | Preserves original client IPv6 addresses through proxy chains |
| **Logging** | Client IPs are logged in native format (IPv4 or IPv6) |

The key to successful IPv6 load balancing is ensuring your entire stack supports IPv6: the operating system, network configuration, firewalls, backend applications, and monitoring systems. HAProxy is just one piece of the puzzle-but it is a piece that works reliably once properly configured.

Start with dual-stack configurations that serve both IPv4 and IPv6 clients, then gradually shift traffic toward IPv6 as you validate your infrastructure. Monitor connection metrics by protocol version to understand your traffic composition and identify any issues early.

For ongoing monitoring of your HAProxy instances and backend health, integrate with observability platforms like OneUptime to get alerts when IPv6 connectivity degrades or backend servers become unreachable. This is especially important during the transition period when IPv6 issues might not be immediately obvious from IPv4-only monitoring.
