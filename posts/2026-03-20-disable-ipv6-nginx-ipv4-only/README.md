# How to Disable IPv6 in Nginx and Force IPv4-Only Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Nginx, IPv4, IPv6, Web Server, Networking

Description: Disable IPv6 in Nginx configuration and force it to accept connections only over IPv4 by removing IPv6 listen directives and optionally disabling IPv6 at the OS level.

## Introduction

Nginx listens on IPv6 when `listen [::]:80` directives are present. Removing these directives forces IPv4-only operation. For a broader system-wide IPv6 disable, also change the OS-level IPv6 configuration. This is useful in environments where IPv6 is not deployed or not desired.

## Remove IPv6 Listen Directives

```nginx
# /etc/nginx/sites-available/default

server {
    # IPv4 only - listen on all IPv4 addresses
    listen 80;

    # REMOVED: listen [::]:80;
    # REMOVED: listen [::]:443 ssl;

    server_name example.com;

    location / {
        root /var/www/html;
        index index.html;
    }
}
```

## Full IPv4-Only Configuration

```nginx
# /etc/nginx/nginx.conf
http {
    server {
        listen 80 default_server;
        # No [::]:80 directive
        server_name _;

        location / {
            root /var/www/html;
        }
    }

    server {
        listen 443 ssl default_server;
        # No [::]:443 directive
        server_name _;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        location / {
            root /var/www/html;
        }
    }
}
```

## Verify No IPv6 Listening

```bash
# Check Nginx configuration syntax
nginx -t

# Reload
systemctl reload nginx

# Confirm no IPv6 sockets
ss -6tlnp | grep nginx
# Should show no output - Nginx is not listening on IPv6

# Confirm IPv4 is still working
ss -4tlnp | grep nginx
# Should show: LISTEN 0.0.0.0:80 and 0.0.0.0:443
```

## Check Default Nginx Configuration

On many Linux distributions, the default Nginx configuration includes IPv6:

```bash
# Look for IPv6 listen directives
grep -r "listen \[::" /etc/nginx/

# Remove or comment out [::] entries in each file
```

## Disable IPv6 via Nginx Configuration Comment

```nginx
server {
    listen 80;
    # listen [::]:80;  # Disabled - IPv4 only

    server_name example.com;
}
```

## System-Wide IPv6 Disable (Optional)

```bash
# This disables IPv6 on interfaces system-wide
cat > /etc/sysctl.d/99-no-ipv6.conf << 'EOF'
net.ipv6.conf.all.disable_ipv6 = 1
net.ipv6.conf.default.disable_ipv6 = 1
EOF

sysctl -p /etc/sysctl.d/99-no-ipv6.conf

# Restart Nginx after disabling IPv6
systemctl restart nginx
```

## Test IPv4 Access

```bash
# Test HTTP access over IPv4
curl -4 http://example.com/

# Test HTTPS over IPv4
curl -4 https://example.com/
```

## Conclusion

Disable IPv6 in Nginx by removing all `listen [::]:` directives from server blocks. Only IPv4 `listen` directives should remain. Verify with `ss -6tlnp | grep nginx` (expect no output) and `ss -4tlnp | grep nginx` (expect listening ports). For a broader system-wide IPv6 disable, also apply the `disable_ipv6` sysctl settings shown above.
