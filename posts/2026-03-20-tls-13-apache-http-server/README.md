# How to Configure TLS 1.3 on Apache HTTP Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TLS, Apache, SSL, HTTPS, Security, Web Server

Description: Learn how to enable TLS 1.3 on Apache HTTP Server with strong cipher suites, HSTS, and OCSP stapling for a secure A+ SSL configuration.

## Prerequisites

- Apache 2.4.37+ (for TLS 1.3 support)
- OpenSSL 1.1.1+ (for TLS 1.3 support)
- mod_ssl enabled

## Step 1: Verify Apache and OpenSSL Support

```bash
# Check Apache version

apache2 -v

# Check OpenSSL version (must be 1.1.1+)
openssl version

# Verify mod_ssl is enabled
apache2ctl -M | grep ssl

# Enable mod_ssl if not loaded
sudo a2enmod ssl
sudo a2enmod headers   # For security headers
```

## Step 2: Configure TLS 1.3 in Apache

Edit your SSL virtual host configuration:

```apache
# /etc/apache2/sites-available/example.com-ssl.conf

<VirtualHost *:443>
    ServerName example.com
    ServerAlias www.example.com
    DocumentRoot /var/www/html

    SSLEngine on
    SSLCertificateFile      /etc/ssl/certs/example.com-fullchain.crt
    SSLCertificateKeyFile   /etc/ssl/private/example.com.key

    # Enable TLS 1.2 and TLS 1.3 (disable older versions)
    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1

    # Cipher suites for TLS 1.2 (TLS 1.3 suites are automatic)
    SSLCipherSuite ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384

    # TLS 1.3 specific cipher suites (Apache 2.4.37+)
    SSLCipherSuite TLSv1.3 TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256

    # Use client cipher preference where applicable
    SSLHonorCipherOrder off

    # Enable OCSP stapling
    SSLUseStapling On
    SSLStaplingResponderTimeout 5
    SSLStaplingReturnResponderErrors off

    # Security Headers
    Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
    Header always set X-Frame-Options "DENY"
    Header always set X-Content-Type-Options "nosniff"
    Header always set Referrer-Policy "no-referrer-when-downgrade"

    # Logging
    ErrorLog ${APACHE_LOG_DIR}/example.com-ssl-error.log
    CustomLog ${APACHE_LOG_DIR}/example.com-ssl-access.log combined
</VirtualHost>
```

## Step 3: Configure Global SSL Settings

Edit `/etc/apache2/mods-enabled/ssl.conf` for global settings:

```apache
# /etc/apache2/mods-enabled/ssl.conf

SSLRandomSeed startup file:/dev/urandom 256
SSLRandomSeed connect builtin

# Session cache for performance
SSLSessionCache         shmcb:${APACHE_RUN_DIR}/ssl_scache(512000)
SSLSessionCacheTimeout  300

# Global OCSP stapling
SSLUseStapling On
SSLStaplingCache "shmcb:${APACHE_RUN_DIR}/ssl_stapling(32768)"

# Disable SSL compression (CRIME vulnerability)
SSLCompression off

# TLS session tickets are enabled by default; only configure a rotated ticket key file for clustered setups
```

## Step 4: Add HTTP to HTTPS Redirect

```apache
# /etc/apache2/sites-available/example.com.conf
<VirtualHost *:80>
    ServerName example.com
    ServerAlias www.example.com

    # Redirect all HTTP to HTTPS
    RewriteEngine On
    RewriteRule ^(.*)$ https://%{HTTP_HOST}$1 [R=301,L]
</VirtualHost>
```

Enable the site and rewrite module:

```bash
sudo a2enmod rewrite
sudo a2ensite example.com.conf
sudo a2ensite example.com-ssl.conf
```

## Step 5: Generate Strong DH Parameters

```bash
# Generate 2048-bit DH parameters
openssl dhparam -out /etc/apache2/dhparam.pem 2048

# Add to ssl.conf:
# SSLOpenSSLConfCmd DHParameters "/etc/apache2/dhparam.pem"
```

## Step 6: Test and Reload Apache

```bash
# Test configuration
sudo apache2ctl configtest

# Reload Apache
sudo systemctl reload apache2

# Verify TLS 1.3 is working
openssl s_client -connect example.com:443 -tls1_3 2>&1 | grep Protocol

# Expected output: Protocol  : TLSv1.3
```

## Step 7: Test with testssl.sh

```bash
# Comprehensive SSL/TLS testing
wget https://testssl.sh/testssl.sh
chmod +x testssl.sh
./testssl.sh example.com

# Check for:
# TLS 1.3: offered (OK)
# TLS 1.2: offered (OK)
# TLS 1.1: not offered (OK)
# TLS 1.0: not offered (OK)
# SSLv3:   not offered (OK)
```

## Conclusion

TLS 1.3 on Apache HTTP Server requires Apache 2.4.37+ and OpenSSL 1.1.1+. Use `SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1` to enable TLS 1.2 and 1.3 only, configure TLS 1.3 cipher suites with `SSLCipherSuite TLSv1.3`, enable OCSP stapling for performance, and add HSTS headers to enforce HTTPS. Always test with `openssl s_client -tls1_3` and testssl.sh to verify the configuration is correct.
