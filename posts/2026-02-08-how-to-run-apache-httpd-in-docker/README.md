# How to Run Apache httpd in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Apache, httpd, Web Servers, DevOps, Reverse Proxy

Description: Deploy Apache httpd web server in Docker with virtual hosts, SSL termination, reverse proxy, and module configuration

---

Apache httpd has been serving web traffic since 1995. It remains one of the most widely deployed web servers, powering everything from simple static sites to complex application stacks with mod_rewrite, mod_proxy, and dozens of other modules. Running Apache in Docker gives you a reproducible, version-controlled web server configuration that deploys identically everywhere.

## Quick Start

Serve static files with a single command.

```bash
# Serve files from the current directory
docker run -d \
  --name apache \
  -p 8080:80 \
  -v $(pwd)/html:/usr/local/apache2/htdocs/:ro \
  httpd:2.4
```

Create a simple test page.

```bash
mkdir -p html
echo "<h1>Hello from Apache in Docker</h1>" > html/index.html
```

Open `http://localhost:8080` to see the page.

## Docker Compose Setup

A production-style configuration with custom config, logging, and health checks.

```yaml
# docker-compose.yml
version: "3.8"

services:
  apache:
    image: httpd:2.4
    container_name: apache
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      # Static content
      - ./html:/usr/local/apache2/htdocs/:ro
      # Custom Apache configuration
      - ./httpd.conf:/usr/local/apache2/conf/httpd.conf:ro
      # Additional config files
      - ./conf.d:/usr/local/apache2/conf/extra/:ro
      # SSL certificates
      - ./certs:/usr/local/apache2/certs/:ro
      # Logs
      - apache_logs:/usr/local/apache2/logs
    healthcheck:
      test: ["CMD", "httpd", "-t"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  apache_logs:
```

## Custom Configuration

Start by extracting the default configuration from the image.

```bash
# Extract the default httpd.conf for customization
docker run --rm httpd:2.4 cat /usr/local/apache2/conf/httpd.conf > httpd.conf
```

Enable commonly needed modules by uncommenting them in httpd.conf.

```apache
# httpd.conf - Key modules to enable (uncomment these lines)

# Enable mod_rewrite for URL rewriting
LoadModule rewrite_module modules/mod_rewrite.so

# Enable mod_proxy for reverse proxy functionality
LoadModule proxy_module modules/mod_proxy.so
LoadModule proxy_http_module modules/mod_proxy_http.so
LoadModule proxy_wstunnel_module modules/mod_proxy_wstunnel.so

# Enable SSL
LoadModule ssl_module modules/mod_ssl.so
LoadModule socache_shmcb_module modules/mod_socache_shmcb.so

# Enable mod_headers for custom headers
LoadModule headers_module modules/mod_headers.so

# Enable compression
LoadModule deflate_module modules/mod_deflate.so

# Include extra configuration files
Include conf/extra/httpd-vhosts.conf
Include conf/extra/httpd-ssl.conf
```

## Virtual Hosts

Configure multiple sites on the same Apache instance.

```apache
# conf.d/httpd-vhosts.conf

# Main site
<VirtualHost *:80>
    ServerName www.example.com
    ServerAlias example.com
    DocumentRoot "/usr/local/apache2/htdocs/main"

    <Directory "/usr/local/apache2/htdocs/main">
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    # Enable gzip compression
    <IfModule mod_deflate.c>
        AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json
    </IfModule>

    # Security headers
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-XSS-Protection "1; mode=block"

    ErrorLog "/usr/local/apache2/logs/main-error.log"
    CustomLog "/usr/local/apache2/logs/main-access.log" combined
</VirtualHost>

# API documentation site
<VirtualHost *:80>
    ServerName docs.example.com
    DocumentRoot "/usr/local/apache2/htdocs/docs"

    <Directory "/usr/local/apache2/htdocs/docs">
        Options -Indexes
        AllowOverride None
        Require all granted
    </Directory>

    # Cache static assets for 30 days
    <FilesMatch "\.(css|js|png|jpg|gif|svg|woff2)$">
        Header set Cache-Control "max-age=2592000, public"
    </FilesMatch>

    ErrorLog "/usr/local/apache2/logs/docs-error.log"
    CustomLog "/usr/local/apache2/logs/docs-access.log" combined
</VirtualHost>
```

## Reverse Proxy Configuration

Use Apache as a reverse proxy in front of backend applications.

```apache
# conf.d/httpd-proxy.conf

<VirtualHost *:80>
    ServerName app.example.com

    # Proxy API requests to a backend service
    ProxyPreserveHost On
    ProxyTimeout 30

    # Forward /api requests to the backend
    ProxyPass /api http://backend:3000/api
    ProxyPassReverse /api http://backend:3000/api

    # WebSocket proxy for real-time features
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/ws/(.*) ws://backend:3000/ws/$1 [P,L]

    # Serve static files directly from Apache
    DocumentRoot "/usr/local/apache2/htdocs/static"

    # Health check endpoint
    <Location "/health">
        ProxyPass http://backend:3000/health
        ProxyPassReverse http://backend:3000/health
    </Location>
</VirtualHost>
```

Docker Compose with a backend application.

```yaml
# docker-compose-proxy.yml
version: "3.8"

services:
  apache:
    image: httpd:2.4
    container_name: apache-proxy
    ports:
      - "80:80"
    volumes:
      - ./httpd.conf:/usr/local/apache2/conf/httpd.conf:ro
      - ./conf.d:/usr/local/apache2/conf/extra/:ro
      - ./html:/usr/local/apache2/htdocs/:ro
    depends_on:
      - backend
    networks:
      - app-net

  backend:
    image: node:20-slim
    container_name: backend-app
    working_dir: /app
    volumes:
      - ./app:/app
    command: node server.js
    expose:
      - "3000"
    networks:
      - app-net

networks:
  app-net:
    driver: bridge
```

## SSL/TLS Configuration

Set up HTTPS with SSL certificates.

```apache
# conf.d/httpd-ssl.conf

Listen 443

<VirtualHost *:443>
    ServerName www.example.com
    DocumentRoot "/usr/local/apache2/htdocs/main"

    SSLEngine on
    SSLCertificateFile "/usr/local/apache2/certs/server.crt"
    SSLCertificateKeyFile "/usr/local/apache2/certs/server.key"

    # Modern SSL configuration
    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384
    SSLHonorCipherOrder off

    # HSTS header
    Header always set Strict-Transport-Security "max-age=63072000"

    <Directory "/usr/local/apache2/htdocs/main">
        Require all granted
    </Directory>
</VirtualHost>

# Redirect HTTP to HTTPS
<VirtualHost *:80>
    ServerName www.example.com
    Redirect permanent / https://www.example.com/
</VirtualHost>
```

Generate self-signed certificates for development.

```bash
# Create a self-signed certificate for testing
mkdir -p certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certs/server.key \
  -out certs/server.crt \
  -subj "/CN=localhost"
```

## URL Rewriting with .htaccess

Enable mod_rewrite for clean URLs and redirects.

```apache
# html/main/.htaccess

RewriteEngine On

# Redirect www to non-www
RewriteCond %{HTTP_HOST} ^www\.(.*)$ [NC]
RewriteRule ^(.*)$ https://%1/$1 [R=301,L]

# Remove trailing slash
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)/$ /$1 [R=301,L]

# Clean URLs: /about maps to /about.html
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_FILENAME}.html -f
RewriteRule ^(.+)$ $1.html [L]

# Custom 404 page
ErrorDocument 404 /404.html
```

## Building a Custom Apache Image

For production, bake your configuration into the image.

```dockerfile
# Dockerfile
FROM httpd:2.4

# Copy custom configuration
COPY httpd.conf /usr/local/apache2/conf/httpd.conf
COPY conf.d/ /usr/local/apache2/conf/extra/

# Copy static content
COPY html/ /usr/local/apache2/htdocs/

# Copy SSL certificates
COPY certs/ /usr/local/apache2/certs/

# Validate the configuration at build time
RUN httpd -t

EXPOSE 80 443
```

```bash
docker build -t my-apache .
docker run -d -p 80:80 -p 443:443 my-apache
```

## Monitoring and Logging

Enable the server-status module for monitoring.

```apache
# Add to httpd.conf
LoadModule status_module modules/mod_status.so

<Location "/server-status">
    SetHandler server-status
    # Restrict access to internal network
    Require ip 172.16.0.0/12
</Location>
```

```bash
# View server status
curl http://localhost/server-status?auto

# Tail access logs
docker logs -f apache

# Check configuration syntax
docker exec apache httpd -t
```

## Summary

Apache httpd in Docker gives you the full power of Apache's module system in a portable, reproducible package. Use virtual hosts for multi-site hosting, mod_proxy for reverse proxy setups, mod_rewrite for URL manipulation, and mod_ssl for HTTPS termination. Extract the default config, customize it, mount or bake it into your image, and validate with `httpd -t`. Apache's flexibility handles everything from simple static file serving to complex proxy topologies with WebSocket support.
