# How to Set Up HTTP to HTTPS Redirection on Apache

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache, HTTPS, HTTP, TLS, Web Server, Security, Redirect

Description: Learn how to configure Apache HTTP Server to automatically redirect all HTTP traffic to HTTPS using mod_rewrite and VirtualHost directives.

## Why HTTPS Redirection Matters

Forcing HTTPS helps ensure clients use an encrypted connection to your server. Apache provides multiple mechanisms to implement this redirect, from simple `Redirect` directives to full `mod_rewrite` rules.

## Method 1: Using the Redirect Directive

The simplest approach uses Apache's built-in `Redirect` directive inside the HTTP VirtualHost:

```apache
# /etc/apache2/sites-available/000-default.conf

<VirtualHost *:80>
    ServerName example.com
    ServerAlias www.example.com

    # Permanently redirect all HTTP traffic to HTTPS
    Redirect permanent / https://example.com/
</VirtualHost>
```

Enable the site and reload Apache:

```bash
a2ensite 000-default.conf
systemctl reload apache2
```

## Method 2: Using mod_rewrite

`mod_rewrite` gives you more flexibility, such as excluding specific paths:

```apache
<VirtualHost *:80>
    ServerName example.com
    ServerAlias www.example.com

    # Enable mod_rewrite engine
    RewriteEngine On

    # Allow Let's Encrypt ACME challenge over HTTP
    RewriteRule ^/.well-known/acme-challenge/ - [L]

    # Redirect everything else to HTTPS
    RewriteCond %{HTTPS} off
    RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
</VirtualHost>
```

Enable the required modules and reload:

```bash
a2enmod rewrite
systemctl reload apache2
```

## Method 3: Using .htaccess

For shared hosting environments where you lack access to VirtualHost configuration:

```apache
# .htaccess in your document root
RewriteEngine On

# Skip ACME challenge
RewriteRule ^\.well-known/acme-challenge/ - [L]

# Force HTTPS
RewriteCond %{HTTPS} !=on
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

Ensure `AllowOverride All` is set in the relevant `<Directory>` block for `.htaccess` to take effect.

## Configuring the HTTPS VirtualHost

The redirect target must have a properly configured HTTPS VirtualHost:

```apache
<VirtualHost *:443>
    ServerName example.com
    ServerAlias www.example.com

    SSLEngine on
    SSLCertificateFile      /etc/letsencrypt/live/example.com/fullchain.pem
    SSLCertificateKeyFile   /etc/letsencrypt/live/example.com/privkey.pem

    DocumentRoot /var/www/html

    # Enable HSTS for 1 year
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
</VirtualHost>
```

Enable SSL and headers modules:

```bash
a2enmod ssl headers
systemctl reload apache2
```

## Verifying the Redirect

Test the redirect with curl:

```bash
# Check the redirect chain
curl -I -L http://example.com
```

You should see a `301` redirecting to `https://example.com`, followed by a `200 OK`.

## Conclusion

Apache offers several ways to redirect HTTP to HTTPS. The `Redirect permanent` directive is the quickest, while `mod_rewrite` provides fine-grained control. Always pair your redirect with a valid SSL certificate and HSTS header for a fully hardened setup.
