# How to Redirect All HTTP Traffic to HTTPS Using Nginx or Apache

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HTTP, HTTPS, Redirect, Nginx, Apache, TLS, Security

Description: Learn how to configure permanent 301 redirects from HTTP to HTTPS in Nginx and Apache to enforce secure connections for all visitors.

## Why Redirect HTTP to HTTPS?

HTTP traffic is unencrypted and vulnerable to eavesdropping and man-in-the-middle attacks. Redirecting all HTTP requests to HTTPS ensures all visitors use encrypted connections. Combined with HSTS, this provides strong enforcement.

## Nginx: Basic HTTP to HTTPS Redirect

The simplest and most performant approach uses a dedicated `server` block for port 80:

```nginx
# /etc/nginx/conf.d/example.com.conf

# HTTP - redirect to HTTPS

server {
    listen 80;
    listen [::]:80;   # Also listen on IPv6
    server_name example.com www.example.com;

    # Permanent redirect (301) to HTTPS
    return 301 https://$host$request_uri;
}

# HTTPS - main site
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name example.com www.example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    root /var/www/html;
}
```

The `$host` and `$request_uri` variables preserve the hostname and original request URI, including the query string.

## Nginx: Catch-All HTTP Redirect

To redirect all HTTP requests that reach this server, including unmatched hostnames:

```nginx
# Catch-all for any HTTP request
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    return 301 https://$host$request_uri;
}
```

## Nginx: Except Let's Encrypt Validation

If you want to serve Certbot's webroot challenge directly on port 80, exclude the `.well-known/acme-challenge` path from the redirect:

```nginx
server {
    listen 80;
    server_name example.com www.example.com;

    # Allow Let's Encrypt challenge over HTTP
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirect everything else to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}
```

## Apache: Basic HTTP to HTTPS Redirect

```apache
# /etc/apache2/sites-available/example.com.conf
<VirtualHost *:80>
    ServerName example.com
    ServerAlias www.example.com

    # Permanent redirect to HTTPS
    Redirect permanent / https://example.com/
</VirtualHost>
```

Or using mod_rewrite for more flexibility:

```apache
<VirtualHost *:80>
    ServerName example.com
    ServerAlias www.example.com

    RewriteEngine On

    # Exception for Let's Encrypt
    RewriteRule ^/.well-known/acme-challenge/ - [L]

    # Redirect all other traffic to HTTPS
    RewriteCond %{HTTPS} off
    RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]
</VirtualHost>
```

## Apache: SSL Virtual Host with Redirect

```apache
# HTTP VirtualHost
<VirtualHost *:80>
    ServerName example.com
    ServerAlias www.example.com
    Redirect 301 / https://example.com/
</VirtualHost>

# HTTPS VirtualHost
<VirtualHost *:443>
    ServerName example.com
    ServerAlias www.example.com

    SSLEngine on
    SSLCertificateFile    /etc/letsencrypt/live/example.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/example.com/privkey.pem

    DocumentRoot /var/www/html
</VirtualHost>
```

## Testing the Redirect

```bash
# Test with curl (follow redirects)
curl -L -v http://example.com/ 2>&1 | grep -E "Location|HTTP/"

# Expected output:
# < HTTP/1.1 301 Moved Permanently
# < Location: https://example.com/

# Verify no redirect loop
curl -I https://example.com/

# Test with a specific path is preserved
curl -I http://example.com/about/
# Should redirect to https://example.com/about/
```

## Common Mistakes to Avoid

1. **Redirect loop:** Ensure the HTTPS server block doesn't also redirect
2. **Path not preserved:** Use `$request_uri` in Nginx. In Apache, `Redirect` preserves the path automatically, or use `%{REQUEST_URI}` in `mod_rewrite`
3. **Breaking ACME challenge:** If you use HTTP-01, make sure `/.well-known/acme-challenge/` stays reachable during validation
4. **Missing www:** Handle both `example.com` and `www.example.com` in `server_name` or `ServerAlias`

## Add HSTS After Redirect Is Working

Once the redirect is confirmed working, add HSTS to prevent future HTTP connections:

```nginx
server {
    listen 443 ssl;
    # ...
    # Instruct browsers to always use HTTPS for this domain for 1 year
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
```

## Conclusion

HTTP to HTTPS redirects use a simple `return 301` in Nginx or `Redirect permanent` in Apache. In Nginx, use `$host$request_uri` to preserve the hostname and original request URI; in Apache, `Redirect` preserves the matched path automatically, or use `%{REQUEST_URI}` with `mod_rewrite`. If you use Certbot's HTTP-01 challenge, ensure `/.well-known/acme-challenge/` remains reachable during validation, and add HSTS after confirming the redirect works correctly to enforce HTTPS at the browser level.
