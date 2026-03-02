# How to Configure Apache mod_proxy for Reverse Proxying on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Apache, Reverse Proxy, Web Server, Networking

Description: Configure Apache mod_proxy on Ubuntu as a reverse proxy for backend applications, including load balancing, SSL termination, WebSocket support, and header manipulation.

---

Apache's mod_proxy module turns the web server into a reverse proxy that forwards requests to backend applications. This is useful for putting Apache in front of Node.js, Python, Java, or any other application server to handle SSL termination, load balancing, and caching. The module is included with Apache and just needs to be enabled.

## Enabling Required Modules

Apache ships with mod_proxy but it is disabled by default. Enable it along with related submodules:

```bash
# Enable the proxy modules
sudo a2enmod proxy
sudo a2enmod proxy_http       # For HTTP/HTTPS proxying
sudo a2enmod proxy_balancer   # For load balancing
sudo a2enmod lbmethod_byrequests  # Load balancing method
sudo a2enmod proxy_wstunnel   # For WebSocket proxying
sudo a2enmod headers          # For header manipulation
sudo a2enmod rewrite          # For URL rewriting
sudo a2enmod ssl              # For HTTPS

# Restart Apache to load the modules
sudo systemctl restart apache2

# Verify modules are loaded
apache2ctl -M | grep proxy
```

## Basic Reverse Proxy Configuration

The simplest case: proxy all requests to a backend application:

```bash
sudo nano /etc/apache2/sites-available/myapp.conf
```

```apache
<VirtualHost *:80>
    ServerName app.example.com
    ServerAdmin admin@example.com

    # Redirect HTTP to HTTPS
    Redirect permanent / https://app.example.com/

    ErrorLog ${APACHE_LOG_DIR}/app.example.com.error.log
    CustomLog ${APACHE_LOG_DIR}/app.example.com.access.log combined
</VirtualHost>

<VirtualHost *:443>
    ServerName app.example.com
    ServerAdmin admin@example.com

    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/app.example.com/cert.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/app.example.com/privkey.pem
    SSLCertificateChainFile /etc/letsencrypt/live/app.example.com/chain.pem

    # Disable buffering for better performance with streaming
    ProxyBadHeader Ignore

    # Required: prevent header injection attacks
    ProxyPreserveHost On

    # The main proxy directive - forward everything to the backend
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/

    # Pass client information to the backend
    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Real-IP %{REMOTE_ADDR}s

    ErrorLog ${APACHE_LOG_DIR}/app.example.com.error.log
    CustomLog ${APACHE_LOG_DIR}/app.example.com.access.log combined
</VirtualHost>
```

Enable the site:

```bash
sudo a2ensite myapp.conf
sudo apache2ctl configtest
sudo systemctl reload apache2
```

## Path-Based Routing

Route different URL paths to different backend services:

```apache
<VirtualHost *:443>
    ServerName example.com

    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/example.com.pem
    SSLCertificateKeyFile /etc/ssl/private/example.com.key

    # API requests go to Node.js backend
    ProxyPass /api/ http://localhost:3000/
    ProxyPassReverse /api/ http://localhost:3000/

    # Admin panel goes to Python backend
    ProxyPass /admin/ http://localhost:5000/
    ProxyPassReverse /admin/ http://localhost:5000/

    # WebSocket endpoint
    ProxyPass /ws/ ws://localhost:3001/
    ProxyPassReverse /ws/ ws://localhost:3001/

    # Everything else served from static files
    DocumentRoot /var/www/html
    <Directory /var/www/html>
        AllowOverride None
        Require all granted
    </Directory>

    # Don't proxy requests for static assets
    ProxyPass /static/ !
    ProxyPass /images/ !

    ErrorLog ${APACHE_LOG_DIR}/error.log
    CustomLog ${APACHE_LOG_DIR}/access.log combined
</VirtualHost>
```

## Load Balancing with ProxyBalancer

Distribute traffic across multiple backend servers:

```apache
<VirtualHost *:443>
    ServerName lb.example.com

    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/lb.example.com.pem
    SSLCertificateKeyFile /etc/ssl/private/lb.example.com.key

    # Define the backend cluster
    <Proxy balancer://mycluster>
        # Each BalancerMember is a backend server
        BalancerMember http://10.0.0.10:3000 loadfactor=1
        BalancerMember http://10.0.0.11:3000 loadfactor=1
        BalancerMember http://10.0.0.12:3000 loadfactor=2  # Gets double the traffic

        # A "hot standby" only used when others are down
        BalancerMember http://10.0.0.13:3000 status=+H

        # Load balancing method: byrequests, bytraffic, bybusyness, heartbeat
        ProxySet lbmethod=byrequests

        # Session stickiness: route same client to same backend
        # ProxySet stickysession=ROUTEID
    </Proxy>

    # Enable the Balancer Manager web interface (protect it!)
    <Location /balancer-manager>
        SetHandler balancer-manager
        Require ip 127.0.0.1 192.168.1.0/24
    </Location>

    # Proxy all requests to the cluster
    ProxyPass / balancer://mycluster/
    ProxyPassReverse / balancer://mycluster/

    # Forward original client IP
    ProxyPreserveHost On
    RequestHeader set X-Forwarded-For %{REMOTE_ADDR}s
    RequestHeader set X-Forwarded-Proto "https"

    ErrorLog ${APACHE_LOG_DIR}/lb.error.log
    CustomLog ${APACHE_LOG_DIR}/lb.access.log combined
</VirtualHost>
```

## WebSocket Proxying

WebSocket connections require the `proxy_wstunnel` module and special handling because the connection is upgraded from HTTP:

```apache
<VirtualHost *:443>
    ServerName ws.example.com

    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/ws.example.com.pem
    SSLCertificateKeyFile /etc/ssl/private/ws.example.com.key

    # Rewrite WebSocket upgrade requests
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteRule /ws/(.*) ws://localhost:8080/$1 [P,L]

    # Regular WebSocket path
    ProxyPass /ws/ ws://localhost:8080/
    ProxyPassReverse /ws/ ws://localhost:8080/

    # Regular HTTP API on same server
    ProxyPass /api/ http://localhost:8080/api/
    ProxyPassReverse /api/ http://localhost:8080/api/

    ErrorLog ${APACHE_LOG_DIR}/ws.error.log
    CustomLog ${APACHE_LOG_DIR}/ws.access.log combined
</VirtualHost>
```

## Header Manipulation

Control what headers are sent to backends and returned to clients:

```apache
<VirtualHost *:443>
    ServerName api.example.com

    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/api.example.com.pem
    SSLCertificateKeyFile /etc/ssl/private/api.example.com.key

    ProxyPass / http://localhost:8080/
    ProxyPassReverse / http://localhost:8080/

    # Headers sent to the backend (upstream)
    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Real-IP %{REMOTE_ADDR}s
    RequestHeader set X-Request-ID %{UNIQUE_ID}e

    # Remove sensitive headers before forwarding
    RequestHeader unset Authorization
    RequestHeader unset Cookie

    # Headers sent to the client (downstream)
    # Remove server identification headers
    Header unset X-Powered-By
    Header always unset Server

    # Add security headers
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"

    # CORS headers (if needed)
    Header always set Access-Control-Allow-Origin "https://frontend.example.com"
    Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
    Header always set Access-Control-Allow-Headers "Authorization, Content-Type"

    ErrorLog ${APACHE_LOG_DIR}/api.error.log
    CustomLog ${APACHE_LOG_DIR}/api.access.log combined
</VirtualHost>
```

## Proxy Timeout and Connection Settings

Tune timeouts to match your backend's response time:

```apache
<VirtualHost *:443>
    ServerName slow-backend.example.com

    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/cert.pem
    SSLCertificateKeyFile /etc/ssl/private/key.pem

    # Timeout settings
    ProxyTimeout 300          # Total proxy timeout in seconds
    Timeout 300               # Apache's overall request timeout

    # Connection pooling settings
    <Proxy http://localhost:8080>
        # Max number of connections to keep open
        # ProxySet max=100 min=10
    </Proxy>

    ProxyPass / http://localhost:8080/
    ProxyPassReverse / http://localhost:8080/

    # For slow backends: return 503 immediately if backend is unavailable
    # rather than waiting for timeout
    ProxyPass / http://localhost:8080/ retry=0

    ErrorLog ${APACHE_LOG_DIR}/timeout.error.log
    CustomLog ${APACHE_LOG_DIR}/timeout.access.log combined
</VirtualHost>
```

## Caching Proxy Responses

Enable proxy caching to reduce load on backends:

```bash
# Enable cache modules
sudo a2enmod cache
sudo a2enmod cache_disk
sudo a2enmod cache_socache
sudo systemctl restart apache2
```

```apache
# Add to /etc/apache2/conf-available/proxy-cache.conf
CacheRoot /var/cache/apache2/mod_cache_disk
CacheEnable disk /
CacheDirLevels 2
CacheDirLength 1
CacheMaxFileSize 1000000
CacheMinFileSize 1

# Do not cache authenticated requests
CacheIgnoreHeaders Authorization
```

```bash
# Create cache directory
sudo mkdir -p /var/cache/apache2/mod_cache_disk
sudo chown www-data:www-data /var/cache/apache2/mod_cache_disk

# Enable the cache config
sudo a2enconf proxy-cache
sudo systemctl reload apache2
```

## Testing and Debugging

```bash
# Test configuration syntax
sudo apache2ctl configtest

# Test the proxy is working
curl -v https://app.example.com/api/health

# Check headers being passed
curl -v https://app.example.com/ 2>&1 | grep -E "< |> "

# View Apache error log for proxy errors
sudo tail -f /var/log/apache2/error.log

# Check if the backend is reachable from Apache's perspective
curl -v http://localhost:3000/
```

Common errors and their meanings:

- "503 Service Unavailable" - backend is down or not accepting connections
- "502 Bad Gateway" - backend responded with an invalid response
- "504 Gateway Timeout" - backend took too long to respond (increase `ProxyTimeout`)

With these configurations, Apache handles all the client-facing concerns - SSL, security headers, rate limiting via mod_ratelimit - while your backend applications focus on serving requests.
