# How to Set Up Portainer Behind Apache Reverse Proxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Apache, Reverse Proxy, HTTPS

Description: Configure Apache HTTP Server as a reverse proxy for Portainer with SSL termination and WebSocket support.

## Introduction

Apache HTTP Server is widely deployed and often already present on Linux servers. Using Apache as a reverse proxy for Portainer lets you leverage existing Apache configurations, mod_ssl setups, and virtual hosts. This guide covers the complete Apache configuration including WebSocket proxying required for Portainer's terminal feature.

## Prerequisites

- Apache 2.4+ installed
- `mod_proxy`, `mod_proxy_http`, `mod_proxy_wstunnel`, `mod_ssl`, `mod_rewrite`, `mod_headers` enabled
- SSL certificate files available
- Portainer running in Docker

## Step 1: Start Portainer

Run Portainer with HTTP enabled and published only on localhost (simplifies Apache proxying):

```bash
docker run -d \
  --name portainer \
  --restart always \
  -p 127.0.0.1:9000:9000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --http-enabled \
  --trusted-origins portainer.example.com
```

Portainer will now be reachable on `127.0.0.1:9000` over HTTP, which Apache will proxy.

## Step 2: Enable Required Apache Modules

```bash
# Enable required modules

sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod proxy_wstunnel   # Required for WebSocket (terminal feature)
sudo a2enmod ssl
sudo a2enmod rewrite
sudo a2enmod headers

# Restart Apache to load modules
sudo systemctl restart apache2
```

## Step 3: Create the Virtual Host Configuration

Create `/etc/apache2/sites-available/portainer.conf`:

```apache
# HTTP Virtual Host - redirect to HTTPS
<VirtualHost *:80>
    ServerName portainer.example.com
    RewriteEngine On
    RewriteRule ^(.*)$ https://%{HTTP_HOST}$1 [R=301,L]
</VirtualHost>

# HTTPS Virtual Host
<VirtualHost *:443>
    ServerName portainer.example.com

    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/portainer-fullchain.crt
    SSLCertificateKeyFile /etc/ssl/private/portainer.key

    # Recommended SSL settings
    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256
    SSLHonorCipherOrder off
    SSLSessionTickets off

    # Proxy headers - required for Portainer to identify the real client
    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-Port "443"

    # Proxy configuration
    ProxyPreserveHost On
    ProxyRequests Off

    # WebSocket proxy for Portainer terminal
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/?(.*) "ws://127.0.0.1:9000/$1" [P,L]

    # Standard HTTP proxy
    ProxyPass / http://127.0.0.1:9000/
    ProxyPassReverse / http://127.0.0.1:9000/

    # Logging
    ErrorLog ${APACHE_LOG_DIR}/portainer-error.log
    CustomLog ${APACHE_LOG_DIR}/portainer-access.log combined
</VirtualHost>
```

## Step 4: Enable the Site and Reload Apache

```bash
# Enable the site
sudo a2ensite portainer.conf

# Test configuration syntax
sudo apache2ctl configtest

# Reload Apache
sudo systemctl reload apache2
```

## Step 5: Configure Firewall

```bash
# Allow HTTP and HTTPS traffic
sudo ufw allow 443/tcp
sudo ufw allow 80/tcp

# Verify Portainer is listening on 9000 locally
ss -tlnp | grep 9000
```

## Troubleshooting

**WebSocket errors**: Ensure `mod_proxy_wstunnel` is enabled. Without it, Portainer's container terminal will not work.

**"Origin Invalid" error**: Confirm `--trusted-origins` is set to the domain used to access Portainer, for example `portainer.example.com`.

**502 errors**: Check that Portainer container is running and listening on the expected port:
```bash
docker ps | grep portainer
docker port portainer 9000
```

**SSL handshake failures**: If proxying to Portainer's HTTPS port, add `SSLProxyEngine On` and `SSLProxyVerify none` to disable verification of Portainer's self-signed cert.

## Conclusion

Apache's `mod_proxy` and `mod_proxy_wstunnel` provide everything needed to proxy Portainer, including WebSocket support for the container terminal. The configuration shown here handles HTTP-to-HTTPS redirection, proper forwarded headers, and WebSocket upgrading - all the requirements for a fully functional Portainer installation behind Apache.
