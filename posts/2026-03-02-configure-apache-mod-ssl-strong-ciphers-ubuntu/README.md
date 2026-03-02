# How to Configure Apache mod_ssl with Strong Ciphers on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Apache, SSL, TLS, Security

Description: Configure Apache mod_ssl with strong cipher suites on Ubuntu to achieve an A+ SSL Labs rating and protect against known TLS vulnerabilities.

---

Default Apache SSL configurations on Ubuntu are not optimally secured. They often support older TLS versions, weak cipher suites, and deprecated key exchange methods that leave sites vulnerable to attacks like POODLE, BEAST, SWEET32, and LOGJAM. Hardening mod_ssl configuration involves disabling outdated protocols, selecting strong cipher suites, and enabling modern TLS features.

## Enable mod_ssl

```bash
# Install Apache if needed
sudo apt-get update
sudo apt-get install -y apache2

# Enable SSL module
sudo a2enmod ssl
sudo a2enmod headers
sudo a2enmod rewrite

# Enable the default SSL site to start
sudo a2ensite default-ssl

sudo systemctl restart apache2
```

## Generate a Certificate

For testing or internal use, generate a self-signed certificate. For production, use Let's Encrypt.

```bash
# Generate a 4096-bit RSA key and self-signed certificate
sudo openssl req -x509 -nodes -days 365 -newkey rsa:4096 \
    -keyout /etc/ssl/private/apache-selfsigned.key \
    -out /etc/ssl/certs/apache-selfsigned.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=example.com"

# Set restrictive permissions
sudo chmod 640 /etc/ssl/private/apache-selfsigned.key
sudo chown root:ssl-cert /etc/ssl/private/apache-selfsigned.key
```

For Let's Encrypt:

```bash
sudo apt-get install -y certbot python3-certbot-apache
sudo certbot --apache -d example.com -d www.example.com
```

## Create a Strong SSL Configuration File

Rather than embedding SSL settings in each virtual host, create a shared configuration file:

```bash
sudo nano /etc/apache2/conf-available/ssl-hardening.conf
```

```apache
# Disable SSL 2.0 and 3.0, and TLS 1.0 and 1.1
# Only allow TLS 1.2 and 1.3 (required for PCI DSS compliance as of 2024)
SSLProtocol -all +TLSv1.2 +TLSv1.3

# Strong cipher suites only
# This configuration prioritizes TLS 1.3 ciphers (no user config needed)
# and falls back to strong TLS 1.2 ciphers
SSLCipherSuite ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:\
ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:\
ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:\
DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA256

# Honor the server's cipher preference (not the client's)
SSLHonorCipherOrder on

# Enable only server-side compression (client compression is a security risk)
SSLCompression off

# Enable stapling for OCSP (certificate revocation checking)
SSLUseStapling on

# Enable session tickets for session resumption (improves performance)
SSLSessionTickets off

# Prevent session ID reuse across virtual hosts
SSLSessionCache shmcb:/run/apache2/ssl_scache(512000)
SSLSessionCacheTimeout 300
```

```bash
# Enable the hardening configuration
sudo a2enconf ssl-hardening
```

## Configure OCSP Stapling

OCSP stapling lets the server check its own certificate's revocation status and include the result in the TLS handshake, saving clients a round trip to the CA.

```bash
sudo nano /etc/apache2/conf-available/ocsp-stapling.conf
```

```apache
# Enable OCSP stapling globally
SSLUseStapling on

# Cache stapling responses for 7 days
SSLStaplingResponseMaxAge 604800

# Timeout waiting for OCSP response
SSLStaplingResponderTimeout 5

# If OCSP lookup fails, continue without stapling (don't fail the handshake)
SSLStaplingReturnResponderErrors off

# Cache for OCSP responses
SSLStaplingCache shmcb:/var/run/apache2/stapling-cache(128000)
```

```bash
sudo a2enconf ocsp-stapling
```

## Configure a Secure Virtual Host

```bash
sudo nano /etc/apache2/sites-available/secure-site.conf
```

```apache
# Redirect HTTP to HTTPS
<VirtualHost *:80>
    ServerName example.com
    ServerAlias www.example.com

    # Permanent redirect to HTTPS
    RewriteEngine On
    RewriteRule ^(.*)$ https://example.com$1 [R=301,L]
</VirtualHost>

<VirtualHost *:443>
    ServerName example.com
    ServerAlias www.example.com
    DocumentRoot /var/www/html

    # SSL certificate and key
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/example.com/cert.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/example.com/privkey.pem
    SSLCertificateChainFile /etc/letsencrypt/live/example.com/chain.pem

    # Override protocols and ciphers for this host if needed
    # (the global conf-available file covers defaults)

    # Diffie-Hellman parameters for DHE cipher suites
    SSLOpenSSLConfCmd DHParameters "/etc/ssl/dhparam.pem"

    # HSTS - tell browsers to always use HTTPS for 2 years
    # includeSubDomains applies to all subdomains
    # preload submits to browser preload lists
    Header always set Strict-Transport-Security \
        "max-age=63072000; includeSubDomains; preload"

    # Prevent clickjacking
    Header always set X-Frame-Options "DENY"

    # Prevent MIME type sniffing
    Header always set X-Content-Type-Options "nosniff"

    # Enable browser XSS protection (legacy browsers)
    Header always set X-XSS-Protection "1; mode=block"

    # Referrer policy
    Header always set Referrer-Policy "strict-origin-when-cross-origin"

    # Content Security Policy (adjust for your application)
    Header always set Content-Security-Policy \
        "default-src 'self'; script-src 'self'; style-src 'self'"

    # Permissions Policy
    Header always set Permissions-Policy \
        "geolocation=(), microphone=(), camera=()"
</VirtualHost>
```

## Generate Strong DH Parameters

The default Diffie-Hellman parameters used by Apache may be weak. Generate a custom 4096-bit dhparam file:

```bash
# This takes several minutes
sudo openssl dhparam -out /etc/ssl/dhparam.pem 4096

# Verify the file
sudo openssl dhparam -in /etc/ssl/dhparam.pem -text | head -5
```

Reference it in the virtual host configuration as shown above with `SSLOpenSSLConfCmd DHParameters`.

## Enable and Test the Configuration

```bash
# Test for syntax errors
sudo apache2ctl configtest

# Enable the site and reload
sudo a2ensite secure-site.conf
sudo systemctl reload apache2

# Test SSL connection locally
openssl s_client -connect example.com:443 -tls1_3

# Show the negotiated cipher
curl -v https://example.com 2>&1 | grep -E 'SSL|TLS|cipher'
```

## Test Against SSL Labs

The definitive test for TLS configuration quality is the Qualys SSL Labs scanner:

```bash
# Using the CLI tool sslyze
sudo apt-get install python3-sslyze
python3 -m sslyze example.com --regular

# Or use testssl.sh locally
sudo apt-get install testssl.sh
testssl example.com
```

Target results:
- Protocol: TLS 1.2 and 1.3 only
- Key: RSA 4096 or ECDSA 256+
- Cipher suites: only ECDHE and DHE with GCM/CHACHA20
- OCSP stapling: YES
- HSTS: YES
- Forward secrecy: YES

## Disable Weak Options Globally

Edit the main Apache SSL configuration to apply defaults system-wide:

```bash
sudo nano /etc/apache2/mods-available/ssl.conf
```

Find and update the `SSLCipherSuite` and `SSLProtocol` lines. Some Ubuntu packages already include secure defaults, so verify what is currently set before changing anything.

```apache
# In ssl.conf, apply strong defaults globally
SSLProtocol -all +TLSv1.2 +TLSv1.3
SSLCipherSuite HIGH:!aNULL:!MD5:!DES:!RC4:!EXPORT:!ADH:!3DES
SSLHonorCipherOrder on
SSLCompression off
```

After making changes:

```bash
sudo systemctl reload apache2

# Verify TLS 1.0 and 1.1 are rejected
openssl s_client -connect example.com:443 -tls1_1 2>&1 | grep -E 'CONNECTED|error'
# Should return a handshake failure for TLS 1.1

# Verify TLS 1.3 works
openssl s_client -connect example.com:443 -tls1_3 2>&1 | grep -E 'CONNECTED|Protocol'
```

A properly hardened Apache SSL configuration protects your users and your infrastructure from a known set of exploitable TLS weaknesses. The configuration changes shown here represent current best practice and should achieve an A+ rating on SSL Labs when combined with a valid certificate and proper HSTS headers.
