# How to Configure Nginx SSL/TLS with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Nginx, SSL, TLS, HTTPS

Description: Learn how to configure Nginx with SSL/TLS encryption for IPv6 listeners, including HTTPS on specific IPv6 addresses, dual-stack HTTPS, and HSTS configuration.

## Basic HTTPS with IPv6

```nginx
server {
    # IPv6 HTTPS listener
    listen [::]:443 ssl ipv6only=on;
    # IPv4 HTTPS listener
    listen 443 ssl;

    server_name example.com;

    # SSL certificate and key
    ssl_certificate     /etc/ssl/certs/example.com.crt;
    ssl_certificate_key /etc/ssl/private/example.com.key;

    # Modern TLS settings
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    location / {
        root /var/www/html;
    }
}
```

## HTTP to HTTPS Redirect (Dual-Stack)

```nginx
# HTTP redirect to HTTPS (both IPv4 and IPv6)

server {
    listen 80;
    listen [::]:80 ipv6only=on;

    server_name example.com;
    return 301 https://$host$request_uri;
}

# HTTPS server (dual-stack)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2 ipv6only=on;

    server_name example.com;

    ssl_certificate     /etc/ssl/certs/example.com.crt;
    ssl_certificate_key /etc/ssl/private/example.com.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 10m;

    add_header Strict-Transport-Security "max-age=31536000" always;

    location / {
        root /var/www/html;
    }
}
```

## HTTPS on Specific IPv6 Address

```nginx
server {
    # Only listen on one IPv6 address
    listen [2001:db8::10]:443 ssl;

    server_name example.com;

    ssl_certificate     /etc/ssl/certs/example.com.crt;
    ssl_certificate_key /etc/ssl/private/example.com.key;

    location / {
        root /var/www/html;
    }
}
```

## Let's Encrypt Certificate for IPv6 Hosts

```bash
# Obtain certificate (works for both IPv4 and IPv6)
certbot certonly --nginx -d example.com

# If your server is IPv6-only, ensure Let's Encrypt can reach it
# Check: can Let's Encrypt's servers connect over IPv6?
curl -6 https://acme-v02.api.letsencrypt.org/directory

# Nginx config with Let's Encrypt certificate
server {
    listen [::]:443 ssl ipv6only=on;
    listen 443 ssl;

    server_name example.com;

    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;
}
```

## Test SSL/TLS over IPv6

```bash
# Test HTTPS connection over IPv6
curl -6 -v https://example.com 2>&1 | grep -E 'Connected|TLS|SSL|subject|issuer'

# Test with specific IPv6 address
curl --connect-to example.com:443:[2001:db8::10]:443 https://example.com

# OpenSSL test over IPv6
openssl s_client -connect '[2001:db8::10]:443' -servername example.com

# Check certificate served to IPv6 clients
echo "" | openssl s_client -6 -connect example.com:443 2>&1 | \
    openssl x509 -noout -subject -dates
```

## Summary

Configure Nginx HTTPS for IPv6 by adding `listen [::]:443 ssl ipv6only=on;` alongside the IPv4 `listen 443 ssl;` directive. SSL settings (certificate, protocols, ciphers) apply to both listeners in the same server block. Use `ssl_protocols TLSv1.2 TLSv1.3` and `ssl_session_cache` for performance. Test with `curl -6 https://example.com` and `openssl s_client -connect '[2001:db8::10]:443'`.
