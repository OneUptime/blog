# How to Configure ACME HTTP-01 Challenge over IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ACME, HTTP-01, IPv6, Let's Encrypt, TLS, Certificate, Nginx

Description: Learn how to set up and validate ACME HTTP-01 domain ownership challenges over IPv6, including web server configuration, firewall rules, and troubleshooting validation failures.

---

The ACME HTTP-01 challenge verifies domain ownership by placing a token file at a specific URL path. When your domain has an AAAA record, Let's Encrypt will prefer IPv6 for the initial validation request, making proper IPv6 configuration essential.

## How HTTP-01 Challenge Works

The ACME client places a file at:
```text
http://yourdomain.example.com/.well-known/acme-challenge/<token>
```

Let's Encrypt fetches this URL over HTTP (port 80). If your DNS has both A and AAAA records, Let's Encrypt will prefer IPv6 for the initial connection and retry IPv4 only if the IPv6 connection times out at the network level.

## Prerequisites Check

```bash
# Verify AAAA record exists

dig AAAA yourdomain.example.com +short
# Expected: 2001:db8::1 (your server's IPv6 address)

# Verify port 80 is open for IPv6
ip6tables -L INPUT -n | grep "dpt:80"

# Check your web server listens on IPv6
ss -tlnp | grep ':80'
# Expected: 0.0.0.0:80 and [::]:80 or *:80
```

## Configuring Nginx for HTTP-01 over IPv6

If your domain has both A and AAAA records, the web server should listen on both IPv4 and IPv6 on port 80:

```nginx
# /etc/nginx/sites-available/default
server {
    # CRITICAL: Both lines are required for dual-stack
    listen 80;
    listen [::]:80;

    server_name yourdomain.example.com;

    # Serve ACME challenge files - Let's Encrypt fetches from here
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        # Allow ACME servers to access this path
        allow all;
        # Default deny for everything else (optional security)
    }

    # Block all other HTTP and redirect to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}
```

Reload Nginx after changes:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## Configuring Apache for HTTP-01 over IPv6

Apache can listen on all interfaces with a single `Listen 80` directive:

```apache
# /etc/apache2/ports.conf
Listen 80

# /etc/apache2/sites-available/000-default.conf
<VirtualHost *:80>
    ServerName yourdomain.example.com

    # Allow ACME challenge access
    Alias /.well-known/acme-challenge/ /var/www/html/.well-known/acme-challenge/
    <Directory "/var/www/html/.well-known/acme-challenge/">
        Options None
        AllowOverride None
        Require all granted
    </Directory>
</VirtualHost>
```

## Firewall Rules for HTTP-01 over IPv6

Ensure IPv6 port 80 is open in ip6tables:

```bash
# Allow inbound HTTP on IPv6 (required for ACME validation)
sudo ip6tables -A INPUT -p tcp --dport 80 -j ACCEPT

# Allow established connections (return traffic)
sudo ip6tables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Save rules persistently using your distro's firewall persistence mechanism
```

## Running the HTTP-01 Challenge

With your web server and firewall configured:

```bash
# Create the webroot directory for ACME challenges
sudo mkdir -p /var/www/html/.well-known/acme-challenge

# Run certbot with webroot method
sudo certbot certonly \
  --webroot \
  --webroot-path /var/www/html \
  --domain yourdomain.example.com \
  --email admin@example.com \
  --agree-tos \
  --preferred-challenges http

# Verify the certificate was issued
sudo certbot certificates
```

## Testing HTTP-01 Reachability from IPv6

Before running certbot, manually test that the challenge path is reachable:

```bash
# Create a test challenge file
echo "ipv6-test" | sudo tee /var/www/html/.well-known/acme-challenge/test-token

# Test from an IPv6-capable external host
curl -6 http://yourdomain.example.com/.well-known/acme-challenge/test-token
# Expected output: ipv6-test

# Clean up test file
sudo rm /var/www/html/.well-known/acme-challenge/test-token
```

## Common HTTP-01 IPv6 Failures

**Timeout during validation**: Let's Encrypt cannot reach port 80 over IPv6. Check firewall rules and confirm the web server listens on port 80 over IPv6.

**Connection refused**: The server has an AAAA record but no service on port 80 over IPv6. Verify with `ss -tlnp | grep 80`.

**404 Not Found**: The web server is reachable but the challenge file path is misconfigured. Verify the webroot path matches the server config.

**Mixed IPv4/IPv6 issues**: If your server has both A and AAAA records, Let's Encrypt will prefer IPv6 for the initial connection. It retries over IPv4 only if the IPv6 connection times out at the network level, so ensure the challenge works over IPv6 and also over IPv4 if an A record exists:

```bash
# Test IPv4 path
curl -4 http://yourdomain.example.com/.well-known/acme-challenge/test

# Test IPv6 path
curl -6 http://yourdomain.example.com/.well-known/acme-challenge/test
```

Ensuring the IPv6 path works, and the IPv4 path too if you publish an A record, gives you a reliable certificate issuance pipeline for HTTP-01 validation.
