# How to Configure Nginx HTTP/3 (QUIC) with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Nginx, HTTP/3, QUIC, IPv6, Web Performance, UDP, TLS

Description: Configure Nginx with HTTP/3 (QUIC) protocol support on IPv6 interfaces, enabling UDP-based low-latency connections for modern browsers connecting over IPv6.

---

HTTP/3 uses QUIC (UDP-based transport) instead of TCP. IPv6 is particularly well-suited for QUIC since both avoid the connection overhead of older protocols. Nginx supports HTTP/3 via the QUIC module in version 1.25+.

## Requirements

```bash
# Check if Nginx has QUIC/HTTP3 support

nginx -V 2>&1 | grep -i quic

# If not, compile from source or use a package with QUIC support
# Ubuntu with mainline Nginx:
sudo add-apt-repository ppa:nginx/mainline
sudo apt update && sudo apt install nginx

# Or build from source with QUIC support:
# ./configure --with-http_v3_module ...
```

## Nginx HTTP/3 Configuration with IPv6

```nginx
# /etc/nginx/sites-available/default

server {
    # HTTP/3 (QUIC) on IPv4 and IPv6 - uses UDP
    listen 443 quic reuseport;
    listen [::]:443 quic reuseport;

    # HTTP/2 fallback (TCP)
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    server_name yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # QUIC requires TLS 1.3
    ssl_protocols TLSv1.3;
    ssl_ciphers TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256;

    # Tell clients that HTTP/3 is available (Alt-Svc header)
    add_header Alt-Svc 'h3=":443"; ma=86400';

    # Enable 0-RTT (use cautiously - replay attack risk)
    # ssl_early_data on;

    location / {
        root /var/www/html;
        index index.html;
    }
}

# HTTP redirect
server {
    listen 80;
    listen [::]:80;
    return 301 https://$host$request_uri;
}
```

## Firewall Rules for QUIC (UDP 443)

QUIC uses UDP, which needs a separate firewall rule:

```bash
# Allow UDP port 443 for QUIC (IPv6)
sudo ip6tables -A INPUT -p udp --dport 443 -j ACCEPT

# Allow TCP port 443 for HTTPS/HTTP2 (IPv6)
sudo ip6tables -A INPUT -p tcp --dport 443 -j ACCEPT

# Save rules
sudo ip6tables-save > /etc/iptables/rules.v6
```

## Testing HTTP/3 over IPv6

```bash
# Check if Alt-Svc header is sent
curl -6 -I https://yourdomain.com/ | grep "Alt-Svc"
# Expected: alt-svc: h3=":443"; ma=86400

# Test HTTP/3 directly with curl (requires curl 7.66+ with QUIC support)
curl --http3 -6 https://yourdomain.com/ -v 2>&1 | grep "< HTTP/3"

# Use quiche-client for testing
/path/to/quiche-client https://yourdomain.com/

# Check QUIC traffic with tcpdump (UDP)
sudo tcpdump -i eth0 -n ip6 and udp port 443 -v

# Use Chrome with QUIC flag to test
# chrome --enable-quic --quic-version=h3-29 https://yourdomain.com/
```

## 0-RTT Configuration (Careful Use)

```nginx
# /etc/nginx/sites-available/yourdomain.com
server {
    listen [::]:443 quic reuseport;
    listen [::]:443 ssl http2;

    ssl_certificate     /etc/ssl/certs/server.crt;
    ssl_certificate_key /etc/ssl/private/server.key;

    # Enable early data (0-RTT reconnects)
    ssl_early_data on;

    # Protect against replay attacks for non-idempotent requests
    if ($ssl_early_data = "1") {
        # Add header to track early data
        add_header Early-Data $ssl_early_data;
    }

    add_header Alt-Svc 'h3=":443"; ma=86400';

    location / {
        root /var/www/html;
    }
}
```

## Monitoring HTTP/3 Connections

```nginx
# Log format with HTTP version
log_format quic_log '$remote_addr [$time_local] "$request" $status '
                    '$server_protocol "$http_user_agent"';

access_log /var/log/nginx/quic_access.log quic_log;
```

```bash
# Analyze HTTP/3 vs HTTP/2 usage
grep "HTTP/3" /var/log/nginx/quic_access.log | wc -l
grep "HTTP/2" /var/log/nginx/quic_access.log | wc -l
```

HTTP/3 with QUIC over IPv6 provides the best combination of latency reduction (QUIC 0-RTT), connection migration (beneficial for mobile clients), and the larger address space of IPv6 for modern high-performance web servers.
