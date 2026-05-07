# How to Configure Apache mod_ssl for HTTPS on a Specific IPv4 Address

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache, SSL, HTTPS, IPv4, Mod_ssl, TLS, Security

Description: Learn how to configure Apache mod_ssl to enable HTTPS on a specific IPv4 address with proper TLS settings and cipher suites.

---

`mod_ssl` is Apache's module for handling TLS/SSL connections. Binding HTTPS to a specific IPv4 address is essential when your server hosts multiple IPs and you need granular control over which address serves secure traffic.

## Prerequisites

```bash
# On Debian/Ubuntu, enable mod_ssl

a2enmod ssl

# Verify mod_ssl is loaded
apache2ctl -M | grep ssl
```

## Generating a Self-Signed Certificate (for testing)

```bash
# Generate a private key and self-signed certificate valid for 365 days
openssl req -x509 -noenc -days 365 \
  -newkey rsa:2048 \
  -keyout /etc/ssl/private/mysite.key \
  -out /etc/ssl/certs/mysite.crt \
  -subj "/CN=mysite.example.com/O=My Org/C=US" \
  -addext "subjectAltName = DNS:mysite.example.com"
```

## Configuring the SSL Virtual Host

```apacheconf
# /etc/apache2/ports.conf
# Replace any existing wildcard Listen 80/443 lines with these
Listen 192.168.1.10:80
<IfModule ssl_module>
    Listen 192.168.1.10:443
</IfModule>

# /etc/apache2/sites-available/mysite-ssl.conf

# Match the SSL virtual host to the specific IPv4 address and port
<VirtualHost 192.168.1.10:443>
    ServerName mysite.example.com
    DocumentRoot /var/www/mysite

    # Enable SSL for this virtual host
    SSLEngine on

    # Path to the certificate and private key
    SSLCertificateFile    /etc/ssl/certs/mysite.crt
    SSLCertificateKeyFile /etc/ssl/private/mysite.key

    # Disable outdated protocols; only allow TLS 1.2 and 1.3
    SSLProtocol -all +TLSv1.2 +TLSv1.3

    # Use a strong cipher suite (TLS 1.2)
    SSLCipherSuite HIGH:!aNULL:!MD5:!3DES

    # Prefer server cipher order over client order for TLS 1.2 and earlier
    SSLHonorCipherOrder on

    # Enable HSTS to force HTTPS in browsers (max-age in seconds)
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"

    ErrorLog  ${APACHE_LOG_DIR}/mysite-ssl-error.log
    CustomLog ${APACHE_LOG_DIR}/mysite-ssl-access.log combined
</VirtualHost>
```

## Redirecting HTTP to HTTPS

Add a plain HTTP virtual host that permanently redirects to HTTPS.

```apacheconf
# /etc/apache2/sites-available/mysite.conf
<VirtualHost 192.168.1.10:80>
    ServerName mysite.example.com
    # 301 redirect all HTTP traffic to the HTTPS version
    Redirect permanent / https://mysite.example.com/
</VirtualHost>
```

## Enabling and Reloading

```bash
# Enable the required module and sites
a2enmod headers
a2ensite mysite.conf
a2ensite mysite-ssl.conf

# Test configuration
apache2ctl configtest

# Apply changes
systemctl reload apache2
```

## Verifying TLS

```bash
# Check the certificate and negotiated TLS details
openssl s_client -connect 192.168.1.10:443 -servername mysite.example.com

# Scan for weak protocols or ciphers
nmap --script ssl-enum-ciphers -p 443 192.168.1.10
```

## Key Takeaways

- Replace wildcard `Listen` directives with the target IP and use a matching `<VirtualHost ip:443>` block to restrict HTTPS to a specific IPv4 address.
- Disable TLS 1.0 and 1.1 with `SSLProtocol -all +TLSv1.2 +TLSv1.3`.
- Use `Header always set Strict-Transport-Security` (requires `mod_headers`) for HSTS.
- Always test with `apache2ctl configtest` before reloading to avoid downtime.
