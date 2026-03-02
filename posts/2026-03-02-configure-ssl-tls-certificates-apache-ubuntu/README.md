# How to Configure SSL/TLS Certificates for Apache on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Apache, SSL/TLS, Security

Description: Learn how to configure SSL/TLS certificates for Apache on Ubuntu, including enabling SSL modules, configuring virtual hosts for HTTPS, and hardening TLS settings.

---

Apache handles SSL/TLS through the `mod_ssl` module and virtual host configuration. Whether you're using a Let's Encrypt certificate or one issued by a commercial CA, the process involves enabling the right modules, configuring a virtual host with your certificate paths, and applying proper TLS settings. This guide covers all of it.

## Prerequisites

Apache installed and running with a domain name pointing to your server:

```bash
# Verify Apache is running
sudo systemctl status apache2

# Ensure ports 80 and 443 are open
sudo ufw allow 'Apache Full'
sudo ufw status
```

## Enabling SSL and Required Modules

```bash
# Enable the SSL module
sudo a2enmod ssl

# Enable the headers module (needed for security headers)
sudo a2enmod headers

# Enable the rewrite module (needed for HTTP to HTTPS redirects)
sudo a2enmod rewrite

# Restart Apache to load the new modules
sudo systemctl restart apache2

# Verify modules are loaded
apache2ctl -M | grep -E "ssl|headers|rewrite"
```

## Obtaining a Certificate with Certbot (Let's Encrypt)

```bash
# Install Certbot and the Apache plugin
sudo apt update
sudo apt install certbot python3-certbot-apache

# Obtain a certificate and configure Apache automatically
sudo certbot --apache -d yourdomain.com -d www.yourdomain.com

# Certbot will:
# 1. Verify domain ownership via HTTP challenge
# 2. Obtain the certificate
# 3. Create or modify Apache virtual host configs for HTTPS
# 4. Set up automatic renewal
```

After Certbot runs, certificate files are at:
- `/etc/letsencrypt/live/yourdomain.com/fullchain.pem`
- `/etc/letsencrypt/live/yourdomain.com/privkey.pem`

## Manual Apache SSL Virtual Host Configuration

Understanding the virtual host structure matters whether you're using Certbot or a commercial certificate:

```bash
# Create the site configuration file
sudo nano /etc/apache2/sites-available/yourdomain.com.conf
```

```apache
# HTTP to HTTPS redirect
<VirtualHost *:80>
    ServerName yourdomain.com
    ServerAlias www.yourdomain.com

    # Redirect all HTTP traffic to HTTPS
    RewriteEngine On
    RewriteCond %{HTTPS} off
    RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
</VirtualHost>

# HTTPS Virtual Host
<VirtualHost *:443>
    ServerName yourdomain.com
    ServerAlias www.yourdomain.com

    DocumentRoot /var/www/yourdomain.com/html

    # SSL Configuration
    SSLEngine on
    SSLCertificateFile      /etc/letsencrypt/live/yourdomain.com/fullchain.pem
    SSLCertificateKeyFile   /etc/letsencrypt/live/yourdomain.com/privkey.pem

    # Include TLS hardening settings
    Include /etc/apache2/conf-available/ssl-params.conf

    # Logging
    ErrorLog ${APACHE_LOG_DIR}/yourdomain.com-error.log
    CustomLog ${APACHE_LOG_DIR}/yourdomain.com-access.log combined

    <Directory /var/www/yourdomain.com/html>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

## Creating a Shared TLS Parameters Configuration

```bash
sudo nano /etc/apache2/conf-available/ssl-params.conf
```

```apache
# TLS Protocol versions - only allow TLS 1.2 and 1.3
SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1

# Cipher suite - strong modern ciphers only
SSLCipherSuite ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256

# Honor server cipher order
SSLHonorCipherOrder off

# TLS session cache
SSLSessionCache shmcb:/run/apache2/sslcache(512000)
SSLSessionCacheTimeout 300

# Disable SSL compression (CRIME attack mitigation)
SSLCompression off

# Enable OCSP Stapling
SSLUseStapling on
SSLStaplingCache "shmcb:logs/ssl_stapling(32768)"
SSLStaplingResponderTimeout 5
SSLStaplingReturnResponderErrors off

# HSTS - tell browsers to always use HTTPS
Header always set Strict-Transport-Security "max-age=63072000"

# Diffie-Hellman parameters
SSLOpenSSLConfCmd DHParameters "/etc/apache2/dhparam.pem"

# Security headers
Header always set X-Frame-Options DENY
Header always set X-Content-Type-Options nosniff
Header always set Referrer-Policy "strict-origin-when-cross-origin"
```

Generate the DH parameters file:

```bash
# Generate 2048-bit DH parameters (takes a few minutes)
sudo openssl dhparam -out /etc/apache2/dhparam.pem 2048

# Enable OCSP Stapling (must be set at server level, not virtual host)
sudo nano /etc/apache2/apache2.conf
# Add: SSLUseStapling On
# Add: SSLStaplingCache shmcb:/var/run/apache2/stapling_cache(128000)
```

## Enabling the Site

```bash
# Enable the SSL parameters config
sudo a2enconf ssl-params

# Enable the site
sudo a2ensite yourdomain.com.conf

# Test the configuration for syntax errors
sudo apache2ctl configtest

# If the test shows "Syntax OK", reload Apache
sudo systemctl reload apache2
```

## Using a Commercial Certificate

If your certificate comes from a CA like DigiCert or Comodo:

```bash
# Store certificate files securely
sudo mkdir -p /etc/apache2/ssl
sudo chmod 700 /etc/apache2/ssl

# Copy your files
sudo cp yourdomain.crt /etc/apache2/ssl/
sudo cp yourdomain.key /etc/apache2/ssl/
sudo cp ca_bundle.crt /etc/apache2/ssl/

# Set permissions
sudo chmod 600 /etc/apache2/ssl/yourdomain.key
sudo chmod 644 /etc/apache2/ssl/yourdomain.crt
sudo chmod 644 /etc/apache2/ssl/ca_bundle.crt
```

In your virtual host config:

```apache
SSLCertificateFile    /etc/apache2/ssl/yourdomain.crt
SSLCertificateKeyFile /etc/apache2/ssl/yourdomain.key
# For Apache 2.4.8+, fullchain goes in SSLCertificateFile
# For older versions, use SSLCertificateChainFile
SSLCertificateChainFile /etc/apache2/ssl/ca_bundle.crt
```

## Enabling HTTP/2

HTTP/2 improves performance significantly. Apache supports it through `mod_http2`:

```bash
# Enable HTTP/2 module
sudo a2enmod http2

# Add to your virtual host or the global config
sudo nano /etc/apache2/sites-available/yourdomain.com.conf
```

```apache
<VirtualHost *:443>
    # Enable HTTP/2
    Protocols h2 http/1.1
    # ... rest of config
</VirtualHost>
```

```bash
sudo systemctl restart apache2
```

## Testing the SSL Configuration

```bash
# Test configuration syntax
sudo apache2ctl configtest

# Verify HTTPS is working
curl -I https://yourdomain.com

# Check the certificate and TLS details
openssl s_client -connect yourdomain.com:443 -brief

# Check expiry date
openssl s_client -connect yourdomain.com:443 </dev/null 2>/dev/null | openssl x509 -noout -enddate

# Test that HTTP redirects to HTTPS
curl -I http://yourdomain.com
# Should show: HTTP/1.1 301 Moved Permanently
# Location: https://yourdomain.com/

# Check TLS protocol version
openssl s_client -tls1_2 -connect yourdomain.com:443
# Should succeed

openssl s_client -tls1 -connect yourdomain.com:443
# Should fail if TLS 1.0 is disabled
```

## Configuring Name-Based SSL Virtual Hosts

Multiple HTTPS sites on one IP address require SNI (Server Name Indication), which Apache 2.4 supports by default:

```bash
# Enable the SSL virtual hosts - each with their own certificate
sudo a2ensite site1.com.conf
sudo a2ensite site2.com.conf

# Apache handles SNI automatically - each VirtualHost just needs its own cert
```

```apache
<VirtualHost *:443>
    ServerName site1.com
    SSLCertificateFile /etc/letsencrypt/live/site1.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/site1.com/privkey.pem
    # ...
</VirtualHost>

<VirtualHost *:443>
    ServerName site2.com
    SSLCertificateFile /etc/letsencrypt/live/site2.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/site2.com/privkey.pem
    # ...
</VirtualHost>
```

## Automatic Certificate Renewal Verification

```bash
# Test that renewal works (no actual renewal happens)
sudo certbot renew --dry-run

# Check the systemd renewal timer
sudo systemctl status certbot.timer
sudo systemctl list-timers | grep certbot

# Force a renewal test for a specific domain
sudo certbot renew --cert-name yourdomain.com --dry-run
```

## Common Troubleshooting

**AH01909: Certificate does not include a SAN**

Modern browsers require Subject Alternative Names in certificates. Let's Encrypt handles this. For older commercial certs, use a newer one or check the CSR requirements.

**"SSLCertificateFile does not exist"**

Verify the path is correct and Apache has read access:

```bash
sudo ls -la /etc/letsencrypt/live/yourdomain.com/
sudo apache2ctl -D DUMP_VHOSTS
```

**Mixed content warnings**

After enabling HTTPS, check that your site's assets (images, scripts) also use HTTPS. Update hardcoded HTTP URLs in your application or use a Content Security Policy to catch them.

## Summary

Configuring Apache for SSL/TLS involves enabling `mod_ssl`, creating a virtual host with your certificate paths, applying strong TLS settings through a shared configuration file, and testing the result. Use Certbot for free Let's Encrypt certificates and automatic renewal. Apply the shared TLS parameters configuration to all HTTPS virtual hosts to maintain consistent security settings. Always test with `apache2ctl configtest` before reloading, and verify the final result with `openssl s_client` and SSL Labs.
