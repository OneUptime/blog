# How to Set Up Varnish Cache in Front of Nginx on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Varnish, NGINX, Caching, Performance

Description: Configure Varnish Cache as a reverse proxy in front of Nginx on Ubuntu to dramatically improve web application performance and reduce backend server load.

---

Varnish Cache is an HTTP accelerator designed specifically for content-heavy dynamic web applications. Sitting in front of your web server, Varnish caches responses in memory and serves them directly to subsequent requesters without hitting the application backend at all. The result can be response times that are 10x to 300x faster and dramatically reduced load on your origin server.

This guide walks through setting up Varnish in front of Nginx on Ubuntu, including VCL configuration, cache tuning, and handling HTTPS with Nginx as an SSL terminator.

## Architecture Overview

The request flow looks like this:

```
Client -> Nginx (port 443, SSL termination) -> Varnish (port 6081) -> Nginx backend (port 8080)
```

Nginx handles SSL because Varnish doesn't support HTTPS natively. After SSL termination, traffic goes to Varnish, which either serves a cached response or passes the request through to Nginx's backend configuration.

## Prerequisites

- Ubuntu 22.04 or 24.04
- Nginx installed and serving your application
- Root or sudo access

## Installing Varnish

Ubuntu's default Varnish package is often outdated. Use the official Varnish repository:

```bash
# Install the apt repository tools
sudo apt install -y curl gnupg apt-transport-https

# Add Varnish's signing key and repository
curl -fsSL https://packagecloud.io/varnishcache/varnish75/gpgkey | \
  sudo gpg --dearmor -o /usr/share/keyrings/varnish-archive-keyring.gpg

echo "deb [signed-by=/usr/share/keyrings/varnish-archive-keyring.gpg] \
  https://packagecloud.io/varnishcache/varnish75/ubuntu/ \
  $(lsb_release -cs) main" | \
  sudo tee /etc/apt/sources.list.d/varnish.list

sudo apt update
sudo apt install -y varnish
```

Verify the version:

```bash
varnishd -V
```

## Reconfiguring Nginx to Listen on Port 8080

Your current Nginx setup listens on port 80. Move it to port 8080 so Varnish can sit in front:

```bash
sudo nano /etc/nginx/sites-available/your-site.conf
```

Change the listen directive:

```nginx
# Before: listen 80; and listen 443 ssl;
# After: backend listens on 8080 (no SSL here - that's handled by the frontend Nginx)

server {
    # Varnish will connect to this port
    listen 127.0.0.1:8080;
    server_name example.com www.example.com;

    root /var/www/html;
    index index.php index.html;

    # Your existing location blocks...
    location / {
        try_files $uri $uri/ /index.php?$args;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.1-fpm.sock;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }
}
```

Test and reload Nginx:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## Configuring Varnish

### Setting the Listen Port and Cache Size

Edit the Varnish systemd service to configure startup options:

```bash
sudo nano /etc/systemd/system/varnish.service
```

Or create a systemd override:

```bash
sudo systemctl edit varnish
```

```ini
[Service]
# Override the ExecStart to set port and memory
ExecStart=
ExecStart=/usr/sbin/varnishd \
    -a :6081 \
    -a localhost:8443,PROXY \
    -f /etc/varnish/default.vcl \
    -s malloc,256m \
    -T localhost:6082
```

### Writing the VCL Configuration

VCL (Varnish Configuration Language) is what controls caching behavior:

```bash
sudo nano /etc/varnish/default.vcl
```

```vcl
# /etc/varnish/default.vcl
vcl 4.1;

# Import the standard library
import std;

# Backend definition - points to Nginx
backend default {
    .host = "127.0.0.1";
    .port = "8080";

    # Connection probe to detect backend health
    .probe = {
        .url = "/health";
        .timeout = 5s;
        .interval = 10s;
        .window = 5;
        .threshold = 3;
    }
}

# Called when a request is received
sub vcl_recv {
    # Pass through requests that should never be cached

    # Don't cache authenticated requests
    if (req.http.Authorization) {
        return (pass);
    }

    # Don't cache POST, PUT, DELETE requests
    if (req.method != "GET" && req.method != "HEAD") {
        return (pass);
    }

    # Don't cache requests with cookies (unless we strip them below)
    # For WordPress/CMS, strip unnecessary cookies
    if (req.http.Cookie) {
        # Keep only authentication-related cookies
        # Remove tracking cookies like Google Analytics
        set req.http.Cookie = regsuball(req.http.Cookie, "(__utm|_ga|_gid|_gat)[^;]*;?\s*", "");
        set req.http.Cookie = regsuball(req.http.Cookie, "(?i)(utm_source|utm_medium|utm_term|utm_content|utm_campaign)=[^;]*;?\s*", "");

        # Trim any leading/trailing semicolons
        set req.http.Cookie = regsub(req.http.Cookie, "^;\s*", "");
        set req.http.Cookie = regsub(req.http.Cookie, "\s*;$", "");

        # If only tracking cookies remain (now empty), unset the header
        if (req.http.Cookie == "") {
            unset req.http.Cookie;
        }
    }

    # Strip query string parameters that don't affect content
    set req.url = regsuball(req.url, "[?&](utm_source|utm_medium|utm_campaign|utm_term|utm_content|fbclid|gclid)=[^&]*", "");
    set req.url = regsub(req.url, "^([^?]*)\?$", "\1");

    # Add the client's real IP to the backend request
    if (req.restarts == 0) {
        if (req.http.X-Forwarded-For) {
            set req.http.X-Forwarded-For = req.http.X-Forwarded-For + ", " + client.ip;
        } else {
            set req.http.X-Forwarded-For = client.ip;
        }
    }
}

# Called when the backend has a response
sub vcl_backend_response {
    # Cache 404s, 301s, and 500s for a short time
    if (beresp.status == 404) {
        set beresp.ttl = 30s;
    }

    # Don't cache if backend says not to
    if (beresp.http.Cache-Control ~ "no-cache|no-store|private") {
        set beresp.uncacheable = true;
        set beresp.ttl = 120s;
        return (deliver);
    }

    # Cache responses without Cache-Control for a default time
    if (!beresp.http.Cache-Control) {
        set beresp.http.Cache-Control = "public, max-age=3600";
        set beresp.ttl = 1h;
    }

    # Set stale-while-revalidate
    set beresp.grace = 6h;

    # Enable ESI processing if your app uses it
    # set beresp.do_esi = true;
}

# Called before delivering a response to the client
sub vcl_deliver {
    # Add debug headers to see cache status (remove in production if desired)
    if (obj.hits > 0) {
        set resp.http.X-Cache = "HIT";
        set resp.http.X-Cache-Hits = obj.hits;
    } else {
        set resp.http.X-Cache = "MISS";
    }

    # Remove internal Varnish headers
    unset resp.http.X-Varnish;
    unset resp.http.Via;
    unset resp.http.Age;
}
```

Apply changes:

```bash
sudo systemctl daemon-reload
sudo systemctl enable varnish
sudo systemctl restart varnish
sudo systemctl status varnish
```

## Configuring Nginx as the SSL Frontend

Now set up Nginx on ports 80 and 443 to proxy to Varnish:

```nginx
# /etc/nginx/sites-available/ssl-frontend.conf

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name example.com www.example.com;
    return 301 https://$host$request_uri;
}

# HTTPS frontend - terminates SSL and passes to Varnish
server {
    listen 443 ssl http2;
    server_name example.com www.example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Pass to Varnish
    location / {
        proxy_pass http://127.0.0.1:6081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/ssl-frontend.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## Monitoring Cache Performance

Varnish ships with excellent CLI tools for monitoring cache hit rates:

```bash
# Real-time statistics
varnishstat

# Watch cache hit rate specifically
varnishstat -f MAIN.cache_hit,MAIN.cache_miss,MAIN.cache_hitpass

# View logs in real time
varnishlog

# Purge a specific URL from the cache
varnishadm "ban req.url == /path/to/page"
```

Check your hit rate with:

```bash
varnishstat -1 -f MAIN.cache_hit,MAIN.cache_miss | \
  awk '{print $1, $2}' | \
  awk 'NR==1{hit=$2} NR==2{miss=$2} END{printf "Hit rate: %.1f%%\n", hit/(hit+miss)*100}'
```

A well-tuned Varnish setup should achieve 80-95% cache hit rates for typical content-heavy sites. Monitor your application's overall availability and response times with [OneUptime](https://oneuptime.com) to confirm the performance improvements are working as expected.
