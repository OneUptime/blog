# How to Enable HTTP/2 in Apache on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Apache, HTTP2, Performance, Web Server

Description: Enable HTTP/2 support in Apache2 on Ubuntu to improve web performance through multiplexing, header compression, and server push capabilities.

---

HTTP/2 offers significant performance improvements over HTTP/1.1: request multiplexing (multiple requests over one connection), header compression, and optional server push. Browsers have supported HTTP/2 for years, but it requires HTTPS and explicit server configuration. This guide covers enabling HTTP/2 in Apache on Ubuntu.

## Prerequisites

HTTP/2 in Apache requires:
- Apache 2.4.17 or newer (Ubuntu 20.04+ ships with compatible versions)
- HTTPS enabled (HTTP/2 requires TLS in all major browsers)
- The Event or Worker MPM (not Prefork) - this is the most common blocker

Check your Apache version:

```bash
apache2 -version
# Should show 2.4.17 or newer
```

## The MPM Problem: Why HTTP/2 Requires Event MPM

Apache's HTTP/2 module (`mod_http2`) requires either the Event or Worker MPM. The Prefork MPM, which is the default when `mod_php` (not PHP-FPM) is used, is incompatible with HTTP/2.

Check your current MPM:

```bash
# Check which MPM is active
sudo apache2ctl -M | grep mpm
# mpm_prefork_module (shared)  <- incompatible with HTTP/2
# mpm_event_module (shared)    <- compatible with HTTP/2
```

If you see `mpm_prefork`, you need to switch to Event MPM. This usually means migrating from `mod_php` to PHP-FPM first.

### Switching from Prefork to Event MPM

```bash
# Disable mod_php if it's enabled (check first)
sudo apache2ctl -M | grep php
# If you see php7.4_module or similar, disable it:
sudo a2dismod php8.1   # Use your actual PHP version

# Install PHP-FPM
sudo apt install php8.1-fpm   # Use your PHP version

# Enable PHP-FPM integration modules
sudo a2enmod proxy_fcgi setenvif

# Enable the PHP-FPM configuration
sudo a2enconf php8.1-fpm

# Disable Prefork MPM
sudo a2dismod mpm_prefork

# Enable Event MPM
sudo a2enmod mpm_event

# Restart Apache (required for MPM change)
sudo systemctl restart apache2

# Verify Event MPM is now active
sudo apache2ctl -M | grep mpm
```

## Enabling mod_http2

```bash
# Enable the HTTP/2 module
sudo a2enmod http2

# Reload Apache to activate
sudo systemctl reload apache2

# Verify the module loaded
sudo apache2ctl -M | grep http2
# Should show: http2_module (shared)
```

## Configuring HTTP/2 in Your VirtualHost

HTTP/2 needs to be explicitly enabled in the virtual host configuration:

```bash
sudo nano /etc/apache2/sites-available/example.com-ssl.conf
```

```apache
<VirtualHost *:443>
    ServerName example.com
    ServerAlias www.example.com

    DocumentRoot /var/www/example.com/public_html

    # Enable HTTP/2 protocols
    # H2 = HTTP/2 over TLS (preferred)
    # HTTP/1.1 = fallback for older clients
    Protocols h2 h2c http/1.1

    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/example.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/example.com/privkey.pem

    # TLS settings that work well with HTTP/2
    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384
    SSLHonorCipherOrder off
    SSLSessionTickets off

    ErrorLog ${APACHE_LOG_DIR}/example.com-error.log
    CustomLog ${APACHE_LOG_DIR}/example.com-access.log combined

    <Directory /var/www/example.com/public_html>
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

Note: `h2c` is HTTP/2 cleartext (without TLS). Most browsers don't support HTTP/2 without TLS, so `h2c` is mainly useful for internal services.

### Enabling Globally in apache2.conf

To enable HTTP/2 for all virtual hosts at once:

```bash
sudo nano /etc/apache2/apache2.conf
```

```apache
# Enable HTTP/2 protocols globally
# This applies to all virtual hosts that have SSLEngine on
Protocols h2 http/1.1
```

Or add it to a separate configuration file:

```bash
sudo nano /etc/apache2/conf-available/http2.conf
```

```apache
# Enable HTTP/2
Protocols h2 h2c http/1.1

# HTTP/2 specific settings
H2Direct on
H2MaxSessionStreams 100
H2MinWorkers 10
H2MaxWorkers 100
H2WindowSize 65535
```

```bash
sudo a2enconf http2
sudo systemctl reload apache2
```

## Verifying HTTP/2 Is Working

### Using curl

```bash
# Check if the server negotiates HTTP/2
curl -I --http2 https://example.com

# Expected output includes:
# HTTP/2 200
# or
# HTTP/2 301

# If you get HTTP/1.1, HTTP/2 is not working
```

### Using openssl

```bash
# Check ALPN negotiation (h2 in the output means HTTP/2 is offered)
openssl s_client -connect example.com:443 -alpn h2 < /dev/null 2>&1 | grep "ALPN"
# Should show: ALPN protocol: h2
```

### Using Chrome Developer Tools

1. Open Chrome and navigate to your site
2. Open DevTools (F12)
3. Go to the Network tab
4. Right-click the column headers and enable "Protocol"
5. Reload the page
6. You should see `h2` in the Protocol column for requests

### Using nghttp (HTTP/2 client)

```bash
# Install nghttp2 client
sudo apt install nghttp2-client

# Test HTTP/2 connection
nghttp -v https://example.com

# Check negotiated protocol
nghttp -nv https://example.com 2>&1 | grep "HTTP/2"
```

## HTTP/2 Server Push

HTTP/2 Server Push lets you send resources to the client before they're requested. This can reduce the critical path for loading CSS, fonts, or JavaScript needed for the initial render.

```apache
<VirtualHost *:443>
    ServerName example.com

    Protocols h2 http/1.1

    <FilesMatch "index\.html$">
        # When index.html is requested, also push these resources
        Header add Link "</css/styles.css>; rel=preload; as=style"
        Header add Link "</js/main.js>; rel=preload; as=script"
        Header add Link "</fonts/font.woff2>; rel=preload; as=font; crossorigin"
    </FilesMatch>
</VirtualHost>
```

Note: Server push effectiveness has diminished with modern browser caching. Browsers now handle `Link: rel=preload` headers by fetching resources in parallel rather than waiting for the server to push. Use push judiciously.

## Tuning HTTP/2 Settings

```apache
# Maximum number of concurrent streams per connection
H2MaxSessionStreams 100

# Minimum and maximum number of H2 worker threads per child
H2MinWorkers 10
H2MaxWorkers 100

# Stream window size (bytes) - affects throughput for large transfers
H2WindowSize 65535

# Stream initial window size for sending data to clients
H2StreamMaxMemSize 65536

# Enable direct HTTP/2 for non-TLS connections (for internal use)
H2Direct on

# Enable Upgrade from HTTP/1.1 to HTTP/2 (not supported by most browsers)
H2Upgrade on
```

## Troubleshooting HTTP/2 Issues

### Server Still Returns HTTP/1.1

```bash
# Check if HTTP/2 module is loaded
sudo apache2ctl -M | grep http2

# If not loaded:
sudo a2enmod http2
sudo systemctl reload apache2

# Check that Protocols directive is in place
sudo apache2ctl -t -D DUMP_VHOSTS

# Check for errors
sudo tail -20 /var/log/apache2/error.log
```

### "HTTP/2 not supported by mod_prefork" Error

```text
AH02030: HTTP/2 is not supported by mod_prefork.c
```

This is the MPM conflict. Switch to Event MPM:

```bash
sudo a2dismod mpm_prefork
sudo a2enmod mpm_event
sudo systemctl restart apache2
```

### Connections Fall Back to HTTP/1.1

If browsers connect but use HTTP/1.1 instead of HTTP/2:

```bash
# Check ALPN is properly configured
# The server must advertise "h2" during TLS handshake
openssl s_client -connect example.com:443 -alpn h2 2>&1 | grep "ALPN protocol"

# Ensure SSLProtocol includes TLS 1.2 or 1.3
# HTTP/2 requires TLS 1.2 minimum
sudo grep -r "SSLProtocol" /etc/apache2/

# Make sure mod_ssl is loaded
sudo apache2ctl -M | grep ssl
```

### PHP-FPM Not Working After MPM Switch

```bash
# Verify PHP-FPM is running
sudo systemctl status php8.1-fpm

# Check socket exists
ls -la /run/php/php8.1-fpm.sock

# Check Apache config points to the right socket
sudo cat /etc/apache2/conf-enabled/php8.1-fpm.conf

# Test a PHP file
echo "<?php phpinfo();" | sudo tee /var/www/html/test.php
curl http://localhost/test.php | head -5

# Clean up test file
sudo rm /var/www/html/test.php
```

## Checking HTTP/2 in Server Status

```bash
# Enable mod_status if not already enabled
sudo a2enmod status
sudo systemctl reload apache2

# Check server status (includes HTTP/2 connection info)
curl http://localhost/server-status?auto | grep -i h2
```

HTTP/2 provides real-world performance improvements, especially for pages with many assets. The main work is switching away from Prefork MPM and mod_php to Event MPM and PHP-FPM. Once that's done, enabling HTTP/2 itself takes just two steps: `a2enmod http2` and adding the `Protocols h2 http/1.1` directive.
