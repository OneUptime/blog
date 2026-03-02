# How to Set Up Nginx with NAXSI WAF on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Nginx, WAF, Security, Web Application Firewall

Description: Install and configure NAXSI, the Nginx Anti XSS and SQL Injection WAF module, on Ubuntu to protect web applications from common injection attacks.

---

NAXSI (Nginx Anti XSS and SQL Injection) is a web application firewall module for Nginx that uses a whitelist-based approach to block malicious requests. Unlike blacklist-based WAFs that try to enumerate all possible attacks, NAXSI starts by blocking everything that looks like it could be dangerous and you whitelist the exceptions your application actually needs. This makes it very effective against unknown attack patterns.

## How NAXSI Works

NAXSI assigns a score to each request based on its content. Individual rules add points to this score when they match characters or patterns that could indicate an attack. When the total score for a request exceeds a threshold, NAXSI blocks the request. This scoring approach means a single suspicious character does not necessarily block a request, but multiple suspicious patterns together do.

The module operates in two modes:
- **Learning mode** - logs what it would block without actually blocking. Use this first to collect whitelists.
- **Enforcing mode** - actively blocks requests that exceed the score threshold.

## Install NAXSI on Ubuntu

```bash
# Install nginx with the NAXSI module
# The naxsi package provides both nginx and the WAF module
sudo apt-get update
sudo apt-get install -y nginx-naxsi

# Verify the NAXSI-enabled nginx is installed
nginx -V 2>&1 | grep naxsi

# Or build nginx with NAXSI from source if you need a specific version
# (shown below as an alternative)
```

### Alternative: Build from Source

```bash
# Install build dependencies
sudo apt-get install -y build-essential libpcre3-dev zlib1g-dev libssl-dev libgd-dev

# Download nginx and NAXSI source
NGINX_VERSION=1.24.0
wget http://nginx.org/download/nginx-${NGINX_VERSION}.tar.gz
wget https://github.com/nbs-system/naxsi/archive/refs/heads/master.zip -O naxsi.zip

tar xzf nginx-${NGINX_VERSION}.tar.gz
unzip naxsi.zip

cd nginx-${NGINX_VERSION}

# Configure with NAXSI module
./configure \
    --add-module=../naxsi-master/naxsi_src \
    --with-http_ssl_module \
    --with-http_v2_module \
    --prefix=/etc/nginx \
    --sbin-path=/usr/sbin/nginx \
    --conf-path=/etc/nginx/nginx.conf \
    --error-log-path=/var/log/nginx/error.log \
    --http-log-path=/var/log/nginx/access.log

make -j$(nproc)
sudo make install
```

## Download the Core Rules

NAXSI comes with a set of core rules that define what patterns are suspicious. Download the latest rules:

```bash
# The core rules file is included with the naxsi source
wget https://raw.githubusercontent.com/nbs-system/naxsi/master/naxsi_config/naxsi_core.rules \
    -O /etc/nginx/naxsi_core.rules

# Verify the rules file
head -30 /etc/nginx/naxsi_core.rules
```

The core rules define scores for patterns like SQL keywords, JavaScript injection characters, and other attack indicators.

## Basic NAXSI Configuration

Include the core rules in the main nginx.conf:

```bash
sudo nano /etc/nginx/nginx.conf
```

```nginx
http {
    # Include NAXSI core rules at the http level
    include /etc/nginx/naxsi_core.rules;

    # ... rest of your http configuration
}
```

## Configure a Virtual Host with NAXSI

```bash
sudo nano /etc/nginx/sites-available/protected-site.conf
```

```nginx
server {
    listen 80;
    server_name example.com;

    # Application root
    root /var/www/html;
    index index.html index.php;

    location / {
        # Include NAXSI rules for this location
        include /etc/nginx/naxsi.rules;

        try_files $uri $uri/ /index.php?$args;
    }

    location ~ \.php$ {
        include /etc/nginx/naxsi.rules;
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }

    # NAXSI error handling - where to redirect blocked requests
    location /RequestDenied {
        return 403 "Request blocked by WAF";
    }

    # Log blocked requests
    error_log /var/log/nginx/naxsi-blocked.log warn;
    access_log /var/log/nginx/naxsi-access.log combined;
}
```

Create the NAXSI rules file for the location:

```bash
sudo nano /etc/nginx/naxsi.rules
```

```nginx
# NAXSI rules for a web application location

# Where to redirect blocked requests
DeniedUrl "/RequestDenied";

# Enable NAXSI in learning mode initially (set to 0 to block)
LearningMode;

# Score thresholds - block when score exceeds this value
SecRulesEnabled;

# Check rules
CheckRule "$SQL >= 8" BLOCK;
CheckRule "$RFI >= 8" BLOCK;
CheckRule "$TRAVERSAL >= 4" BLOCK;
CheckRule "$EVADE >= 4" BLOCK;
CheckRule "$XSS >= 8" BLOCK;
```

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Collect Whitelists in Learning Mode

In learning mode, NAXSI logs requests it would have blocked instead of actually blocking them. Run in this mode against your application to collect the exceptions your legitimate traffic needs.

Generate traffic against your application while monitoring the NAXSI error log:

```bash
# Watch for NAXSI learning mode log entries
sudo tail -f /var/log/nginx/error.log | grep NAXSI

# NAXSI log entries look like this:
# NAXSI_FMT: ip=1.2.3.4&server=example.com&uri=/search&learning=1&
# vers=0.55.3&total_processed=1&total_blocked=1&
# block=1&cscore0=$SQL&score0=8&zone0=ARGS&id0=1001&var_name0=q
```

Use the naxsi-ui or nxtool to analyze the logs and generate whitelist rules:

```bash
# Install nxtool (the NAXSI whitelist generator)
sudo apt-get install -y python3-pip
pip3 install nxtool

# Analyze logs and generate whitelists
nxtool.py -c naxsi_core.rules \
    --colors \
    -l /var/log/nginx/error.log \
    -o whitelist

cat whitelist
```

## Writing Manual Whitelists

For common legitimate patterns that NAXSI flags, write whitelist rules manually:

```bash
sudo nano /etc/nginx/naxsi_whitelist.rules
```

```nginx
# Whitelist rules for common false positives

# Allow SQL-like keywords in search forms (the 'q' parameter)
# id 1001 = SQL keywords; zone = ARGS means request arguments
BasicRule wl:1001 "mz:$ARGS_VAR:q";
BasicRule wl:1009 "mz:$ARGS_VAR:q";  # More SQL patterns

# Allow WordPress admin users to submit HTML content in 'content' field
BasicRule wl:1001,1002,1005,1008,1009,1010,1011 "mz:$BODY_VAR:content";

# Allow the 'editor' parameter to contain special characters (rich text editor)
BasicRule wl:1000 "mz:$BODY_VAR:editor";

# Whitelist entire URLs from NAXSI (use sparingly)
# BasicRule wl:0 "mz:URL";  # Whitelist everything for this URL

# Allow specific header values
BasicRule wl:1006 "mz:$HEADERS_VAR:cookie";
```

Include the whitelist in your location block:

```nginx
location / {
    include /etc/nginx/naxsi.rules;
    include /etc/nginx/naxsi_whitelist.rules;
    # ...
}
```

## Switch to Enforcing Mode

After collecting whitelists and verifying your application works in learning mode, enable blocking:

```bash
sudo nano /etc/nginx/naxsi.rules
```

```nginx
# Remove or comment out LearningMode
# LearningMode;

DeniedUrl "/RequestDenied";

SecRulesEnabled;

# Thresholds - tune these based on your application's risk tolerance
CheckRule "$SQL >= 8" BLOCK;
CheckRule "$RFI >= 8" BLOCK;
CheckRule "$TRAVERSAL >= 4" BLOCK;
CheckRule "$EVADE >= 4" BLOCK;
CheckRule "$XSS >= 8" BLOCK;
```

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Test that attacks are now blocked:

```bash
# Test SQL injection blocking
curl "http://localhost/search?q=1+OR+1=1--"
# Should return 403

# Test XSS blocking
curl "http://localhost/search?q=<script>alert(1)</script>"
# Should return 403

# Verify legitimate requests still work
curl "http://localhost/search?q=hello+world"
# Should return 200
```

## Monitor Blocked Requests

```bash
# Watch the error log for NAXSI blocks
sudo tail -f /var/log/nginx/error.log | grep -i naxsi

# Count blocks per rule ID to identify the most triggered rules
sudo grep NAXSI_FMT /var/log/nginx/error.log | \
    grep -o 'id0=[0-9]*' | sort | uniq -c | sort -rn

# Find top blocked IP addresses
sudo grep NAXSI_FMT /var/log/nginx/error.log | \
    grep -o 'ip=[0-9.]*' | sort | uniq -c | sort -rn | head -20
```

## Fine-Tune Score Thresholds

If too many legitimate requests are blocked, raise the thresholds. If attacks are getting through, lower them:

```nginx
# More permissive thresholds (fewer false positives, more risk)
CheckRule "$SQL >= 16" BLOCK;
CheckRule "$XSS >= 16" BLOCK;

# Stricter thresholds (fewer bypasses, more false positives)
CheckRule "$SQL >= 4" BLOCK;
CheckRule "$XSS >= 4" BLOCK;
```

NAXSI requires more upfront configuration than signature-based WAFs because you need to build whitelists for your specific application. However, that investment pays off in a WAF that is highly tuned to your traffic patterns and much harder to bypass with novel attack techniques not covered by existing signatures.
