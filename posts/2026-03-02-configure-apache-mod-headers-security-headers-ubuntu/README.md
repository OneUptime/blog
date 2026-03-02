# How to Configure Apache mod_headers for Security Headers on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Apache, Security, HTTP Headers, Web Server

Description: Configure Apache mod_headers on Ubuntu to add HTTP security headers that protect against XSS, clickjacking, MIME sniffing, and other client-side attacks.

---

HTTP security headers tell browsers how to handle your site's content. They prevent a range of client-side attacks including cross-site scripting (XSS), clickjacking, MIME type confusion, and data leakage through referrer headers. Configuring them in Apache takes a few minutes and can dramatically improve the security posture of any web application.

## Enable mod_headers

```bash
# Enable the headers module
sudo a2enmod headers

# Verify it is active
sudo systemctl restart apache2
apache2ctl -M | grep headers
```

## Add Headers Globally or Per Virtual Host

You can add security headers at three levels:
- **Server level** - in `apache2.conf` (applies to all virtual hosts)
- **Virtual host level** - in individual site configuration files
- **Directory level** - in `.htaccess` or `<Directory>` blocks

For most setups, adding headers at the virtual host level gives the best balance of control and clarity.

```bash
sudo nano /etc/apache2/sites-available/mysite.conf
```

## Core Security Headers

### Strict-Transport-Security (HSTS)

Forces browsers to always use HTTPS for your domain. Once a browser sees this header, it will not send any HTTP requests to your domain for the specified duration.

```apache
<VirtualHost *:443>
    ServerName example.com

    # max-age in seconds (63072000 = 2 years)
    # includeSubDomains - applies to all subdomains
    # preload - submits to HSTS preload lists (hard to undo)
    Header always set Strict-Transport-Security \
        "max-age=63072000; includeSubDomains; preload"
```

Start with a short `max-age` (like 3600) while testing, then increase it. HSTS is hard to reverse if you add `preload` and need to switch away from HTTPS.

### X-Frame-Options (Clickjacking Protection)

Prevents your site from being embedded in iframes on other domains, which is how clickjacking attacks work.

```apache
# DENY - never allow any framing
Header always set X-Frame-Options "DENY"

# SAMEORIGIN - allow framing only from the same origin
# Header always set X-Frame-Options "SAMEORIGIN"
```

Note: The Content-Security-Policy `frame-ancestors` directive is the modern replacement for X-Frame-Options and should be preferred when possible.

### X-Content-Type-Options (MIME Sniffing Prevention)

Tells browsers not to sniff the MIME type of a response. Without this header, browsers may interpret a file with the wrong content type, enabling some attacks.

```apache
Header always set X-Content-Type-Options "nosniff"
```

This is a one-value header. There are no variants to worry about.

### Referrer-Policy

Controls how much information the browser includes in the `Referer` header when navigating from your site to another.

```apache
# Only send origin (no path) when going cross-origin, full URL within same origin
Header always set Referrer-Policy "strict-origin-when-cross-origin"

# Options (from most to least restrictive):
# no-referrer - never send a Referer header
# strict-origin - only the domain, no path, only over HTTPS
# strict-origin-when-cross-origin - full URL same-origin, domain-only cross-origin
# same-origin - only send when navigating within the same origin
```

### Permissions-Policy (Feature Policy)

Restricts which browser features your site and embedded content can use.

```apache
Header always set Permissions-Policy \
    "geolocation=(), microphone=(), camera=(), payment=(), usb=(), \
    autoplay=(self), fullscreen=(self)"
```

The empty parentheses `()` disable the feature entirely. `(self)` allows it for your own origin only.

### X-XSS-Protection

A legacy header for older IE and Chrome versions that enabled a built-in XSS filter. Modern browsers have removed this filter, but setting it to safe values does not hurt:

```apache
# Mode=block stops rendering if XSS is detected (rather than sanitizing)
Header always set X-XSS-Protection "1; mode=block"
```

This header has no effect on modern browsers, but it does not cause harm and may help legacy users.

## Content-Security-Policy (CSP)

CSP is the most powerful and complex security header. It defines which sources of scripts, styles, images, and other resources are allowed to load.

```apache
# Strict CSP - blocks inline scripts and external resources by default
Header always set Content-Security-Policy \
    "default-src 'self'; \
     script-src 'self'; \
     style-src 'self' 'unsafe-inline'; \
     img-src 'self' data: https:; \
     font-src 'self'; \
     connect-src 'self'; \
     frame-ancestors 'none'; \
     base-uri 'self'; \
     form-action 'self'"
```

CSP directives:
- `default-src 'self'` - default to same origin only
- `script-src 'self'` - only load scripts from your own origin
- `style-src 'self' 'unsafe-inline'` - own origin plus inline styles (needed for many frameworks)
- `img-src 'self' data: https:` - images from own origin, data URIs, and any HTTPS source
- `frame-ancestors 'none'` - modern replacement for X-Frame-Options DENY
- `form-action 'self'` - forms can only submit to your own origin

Start with a reporting-only policy to catch breakage before blocking:

```apache
# Report-only mode - logs violations but doesn't block
Header always set Content-Security-Policy-Report-Only \
    "default-src 'self'; report-uri /csp-violation-report"
```

## Complete Virtual Host Configuration

```bash
sudo nano /etc/apache2/sites-available/secure-site.conf
```

```apache
<VirtualHost *:80>
    ServerName example.com
    # Redirect all HTTP to HTTPS
    RewriteEngine On
    RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]
</VirtualHost>

<VirtualHost *:443>
    ServerName example.com
    DocumentRoot /var/www/html

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/example.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/example.com/privkey.pem

    # Remove headers that reveal server information
    Header always unset X-Powered-By
    Header always unset Server
    ServerTokens Prod
    ServerSignature Off

    # HSTS
    Header always set Strict-Transport-Security \
        "max-age=63072000; includeSubDomains"

    # Anti-clickjacking
    Header always set X-Frame-Options "DENY"

    # MIME sniffing prevention
    Header always set X-Content-Type-Options "nosniff"

    # Referrer policy
    Header always set Referrer-Policy "strict-origin-when-cross-origin"

    # Permissions policy
    Header always set Permissions-Policy "geolocation=(), microphone=(), camera=()"

    # XSS protection (legacy)
    Header always set X-XSS-Protection "1; mode=block"

    # CSP (adjust for your application)
    Header always set Content-Security-Policy \
        "default-src 'self'; script-src 'self'; style-src 'self'; \
         img-src 'self' data:; font-src 'self'; frame-ancestors 'none'; \
         base-uri 'self'; form-action 'self'"

    ErrorLog /var/log/apache2/error.log
    CustomLog /var/log/apache2/access.log combined
</VirtualHost>
```

```bash
sudo a2ensite secure-site.conf
sudo apache2ctl configtest
sudo systemctl reload apache2
```

## Verify Headers

```bash
# Check which headers your server sends
curl -I https://example.com

# Check specific headers
curl -s -I https://example.com | grep -E 'Strict|X-Frame|X-Content|Referrer|CSP|Permissions'
```

Use online tools like securityheaders.com or Mozilla Observatory to score your implementation. Mozilla Observatory checks all major headers and gives letter grades.

## Handle Headers for Static Files Differently

Sometimes you need different headers for different file types:

```apache
# Strict CSP for HTML
<FilesMatch "\.html?$">
    Header always set Content-Security-Policy \
        "default-src 'self'; script-src 'self'"
</FilesMatch>

# Relaxed headers for API endpoints that might be used cross-origin
<LocationMatch "^/api/">
    Header always set Access-Control-Allow-Origin "https://partner.example.com"
    Header always set Access-Control-Allow-Methods "GET, POST, OPTIONS"
    Header always set Access-Control-Allow-Headers "Content-Type, Authorization"
</LocationMatch>
```

Security headers are one of the cheapest and highest-impact security improvements you can make to a web server. They require no application changes for most of the headers, take minutes to add, and protect all users of your site from a well-understood set of browser-level attacks.
