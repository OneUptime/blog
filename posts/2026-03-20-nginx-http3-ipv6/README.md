# How to Configure Nginx HTTP/3 with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Nginx, HTTP/3, QUIC, IPv6, Web Server

Description: Configure Nginx to serve HTTP/3 over QUIC on IPv6 addresses, enabling faster connections for clients supporting the protocol.

## Prerequisites

- Nginx 1.25.0+ (HTTP/3 support added in 1.25.0)
- SSL certificate (HTTP/3 requires TLS)
- IPv6 address on your server

## Step 1: Install Nginx with HTTP/3 Support

On Ubuntu 22.04+:

```bash
# Add Nginx mainline repository

sudo apt-get install nginx

# Verify HTTP/3 QUIC support
nginx -V 2>&1 | grep quic
# Should show: --with-http_v3_module or similar
```

For older systems, compile from source with BoringSSL:

```bash
# Download Nginx source with QUIC support
curl -O https://nginx.org/download/nginx-1.27.0.tar.gz
tar -xzf nginx-1.27.0.tar.gz

# Clone BoringSSL (required for QUIC)
git clone https://boringssl.googlesource.com/boringssl

# Build Nginx with QUIC
cd nginx-1.27.0
./configure \
  --with-http_ssl_module \
  --with-http_v2_module \
  --with-http_v3_module \
  --with-openssl=../boringssl
make && sudo make install
```

## Step 2: Configure Nginx for HTTP/3 over IPv6

```nginx
# /etc/nginx/sites-available/example.com

server {
    # Listen on IPv6 for HTTP/3 (QUIC/UDP port 443)
    listen [::]:443 quic reuseport;

    # Listen on IPv4 for HTTP/3
    listen 0.0.0.0:443 quic reuseport;

    # HTTP/2 fallback (TCP)
    listen [::]:443 ssl;
    listen 0.0.0.0:443 ssl;

    server_name example.com;

    # SSL configuration
    ssl_certificate /etc/ssl/certs/example.com.crt;
    ssl_certificate_key /etc/ssl/private/example.com.key;

    # Enable TLS 1.3 (required for HTTP/3)
    ssl_protocols TLSv1.3;

    # Advertise HTTP/3 support via Alt-Svc header
    add_header Alt-Svc 'h3=":443"; ma=86400';

    # QUIC-specific settings
    quic_retry on;       # Enable QUIC retry for DDoS protection
    ssl_early_data on;   # Enable 0-RTT

    location / {
        root /var/www/html;
        index index.html;
        # Add header for 0-RTT requests (replay protection)
        add_header Early-Data $ssl_early_data;
    }
}

# HTTP redirect to HTTPS
server {
    listen [::]:80;
    listen 0.0.0.0:80;
    server_name example.com;
    return 301 https://$host$request_uri;
}
```

## Step 3: Firewall Rules for QUIC/UDP

HTTP/3 uses UDP port 443. Ensure your firewall allows it:

```bash
# UFW (Ubuntu)
sudo ufw allow 443/udp comment "HTTP/3 QUIC IPv6"

# ip6tables directly
sudo ip6tables -A INPUT -p udp --dport 443 -j ACCEPT

# Save rules
sudo ip6tables-save > /etc/ip6tables/rules.v6
```

## Step 4: Test the Configuration

```bash
# Test Nginx config syntax
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Test HTTP/3 connectivity over IPv6
curl -6 --http3 https://example.com -v 2>&1 | grep "QUIC\|HTTP/3\|Alt-Svc"

# Verify Alt-Svc header is present
curl -6 -I https://example.com | grep alt-svc

# Use chrome://net-internals/#quic to test in browser
```

## Step 5: Verify IPv6 Listening

```bash
# Check that Nginx is listening on IPv6 UDP 443
sudo ss -tulnp | grep nginx
# Should show: udp UNCONN 0 0 [::]:443 *:* users:("nginx",...)

# Test with nc
nc -6 -u -zv 2001:db8::1 443
```

## Performance Tuning

```nginx
# Optimize QUIC performance
http {
    # Set appropriate MTU for IPv6
    # IPv6 minimum MTU is 1280 bytes
    # QUIC overhead: ~50 bytes for IPv6+UDP+QUIC headers

    # Increase proxy buffer sizes for QUIC connections
    proxy_buffer_size 16k;
    proxy_buffers 4 32k;
}
```

## Monitoring

Use [OneUptime](https://oneuptime.com) to monitor your HTTP/3 endpoints over IPv6. Create monitors that use IPv6 addresses with HTTP/3 protocol to alert when QUIC connectivity fails while HTTP/2 remains available.

## Conclusion

Nginx HTTP/3 over IPv6 requires the quic directive on listen lines, TLS 1.3, and the Alt-Svc header to advertise HTTP/3 support. Remember to open UDP port 443 in your firewall. Test with curl's `--http3` flag and verify the connection protocol in verbose output.
