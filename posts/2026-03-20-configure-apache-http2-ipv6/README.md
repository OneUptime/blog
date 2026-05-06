# How to Configure Apache HTTP/2 with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache, HTTP/2, IPv6, Web Server, TLS, Performance, Mod_http2

Description: Configure Apache HTTP Server with HTTP/2 protocol support on IPv6 interfaces, enabling modern multiplexed connections for improved web performance.

---

Apache HTTP Server supports HTTP/2 through the `mod_http2` module. Enabling HTTP/2 on IPv6 requires enabling the module, configuring TLS for browser-facing `h2`, and ensuring Apache listens on IPv6 interfaces.

## Enabling mod_http2

```bash
# Enable HTTP/2 module

sudo a2enmod http2
sudo a2enmod ssl
sudo a2enmod rewrite
sudo a2enmod headers
sudo a2enmod status

# Verify module is loaded
apache2ctl -M | grep "http2"
```

## Apache Configuration with HTTP/2 and IPv6

```apache
# /etc/apache2/ports.conf
# Listen on all interfaces; on dual-stack builds this includes IPv6
Listen 80
Listen 443
```

```apache
# /etc/apache2/sites-available/yourdomain.conf

# HTTP VirtualHost (redirect to HTTPS)
<VirtualHost *:80>
    ServerName yourdomain.com

    # Redirect all traffic to HTTPS
    RewriteEngine On
    RewriteRule ^(.*)$ https://%{HTTP_HOST}$1 [R=301,L]
</VirtualHost>

# HTTPS VirtualHost with HTTP/2 and IPv6
<VirtualHost *:443>
    ServerName yourdomain.com

    # Enable HTTP/2 over TLS
    Protocols h2 http/1.1

    SSLEngine on
    SSLCertificateFile    /etc/letsencrypt/live/yourdomain.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/yourdomain.com/privkey.pem

    # TLS settings compatible with browser HTTP/2 use
    SSLProtocol -all +TLSv1.2 +TLSv1.3
    SSLHonorCipherOrder off
    SSLSessionTickets off

    DocumentRoot /var/www/html

    <Directory /var/www/html>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    # Server push via Link header for clients that support it
    <FilesMatch "\.html$">
        Header add Link "</css/styles.css>; rel=preload; as=style"
        Header add Link "</js/app.js>; rel=preload; as=script"
    </FilesMatch>

    ErrorLog ${APACHE_LOG_DIR}/yourdomain_error.log
    CustomLog ${APACHE_LOG_DIR}/yourdomain_access.log combined
</VirtualHost>
```

## IPv6-Only Apache Configuration

```apache
# Bind only the IPv6 address
Listen [2001:db8::1]:443

<VirtualHost [2001:db8::1]:443>
    ServerName yourdomain.com

    Protocols h2 http/1.1

    SSLEngine on
    SSLCertificateFile    /etc/ssl/certs/server.crt
    SSLCertificateKeyFile /etc/ssl/private/server.key

    DocumentRoot /var/www/html
</VirtualHost>
```

## mod_http2 Tuning

```apache
# /etc/apache2/conf-available/http2.conf

# Direct protocol switch for h2c when h2c is enabled
H2Direct on

# Maximum concurrent streams per HTTP/2 session
H2MaxSessionStreams 100

# Stream push configuration
H2Push on
H2PushPriority * after 32

# Worker thread settings
H2MinWorkers 10
H2MaxWorkers 75

# Stream timeout
H2StreamTimeout 5

# Disable TLS warmup on reliable networks
H2TLSWarmUpSize 0
```

## Enabling and Testing

```bash
# Enable site and HTTP/2 config
sudo a2ensite yourdomain
sudo a2enconf http2

# Test configuration
sudo apache2ctl configtest

# Restart Apache
sudo systemctl restart apache2

# Verify HTTP/2 is active
curl -6 --http2 -I https://yourdomain.com/
# Look for: HTTP/2 200

# Check that ALPN negotiates HTTP/2
openssl s_client \
  -connect '[2001:db8::1]:443' \
  -servername yourdomain.com \
  -alpn h2 < /dev/null 2>&1 | grep "ALPN protocol"
# Expected: ALPN protocol: h2
```

## Monitoring HTTP/2 on Apache

```apache
# Expose server statistics via mod_status
<Location /server-status>
    SetHandler server-status
    Require ip ::1 127.0.0.1
</Location>

# Log the request protocol separately
LogFormat "%h %l %u %t \"%r\" %>s %b %H" http2_combined
CustomLog /var/log/apache2/http2_access.log http2_combined
```

Apache's `mod_http2` with IPv6-capable virtual hosts provides a reliable path to HTTP/2 multiplexing for websites served from IPv6 infrastructure, improving performance through connection multiplexing and header compression.
