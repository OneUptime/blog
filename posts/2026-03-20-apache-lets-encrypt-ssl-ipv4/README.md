# How to Set Up Let's Encrypt SSL with Apache on an IPv4 Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache, Let's Encrypt, SSL, IPv4, Certbot, HTTPS, Security

Description: Learn how to obtain and automatically renew a free Let's Encrypt TLS certificate for an Apache server bound to an IPv4 address.

---

Let's Encrypt provides free, automated TLS certificates via the ACME protocol. Certbot is a widely used ACME client recommended by Let's Encrypt that integrates directly with Apache to install and renew certificates with minimal manual work.

## Prerequisites

- A domain pointing to your server's IPv4 address in DNS.
- Apache running and reachable on port 80 (for the HTTP-01 challenge).
- Ports 80 and 443 open in your firewall.

## Installing Certbot

```bash
# Debian/Ubuntu

apt update && apt install certbot python3-certbot-apache -y

# RHEL/Rocky/AlmaLinux (via EPEL)
dnf install epel-release -y
dnf install certbot python3-certbot-apache -y
```

## Obtain and Install the Certificate

Certbot's Apache plugin automatically edits your virtual host configuration.

```bash
# Replace example.com with your actual domain
# Certbot will detect the Apache vhost and configure SSL automatically
certbot --apache -d example.com -d www.example.com
```

Certbot will:
1. Verify domain ownership via an HTTP-01 challenge on port 80.
2. Obtain a certificate from Let's Encrypt.
3. Create or update an SSL virtual host configuration.
4. Configure automatic HTTP → HTTPS redirection.

## What Certbot Creates

After running Certbot, you'll find an SSL configuration like this (on Debian/Ubuntu, the generated file is often named similarly to this):

```apacheconf
# /etc/apache2/sites-available/example.com-le-ssl.conf (auto-generated)
<VirtualHost *:443>
    ServerName example.com
    ServerAlias www.example.com
    DocumentRoot /var/www/example

    SSLEngine on
    SSLCertificateFile    /etc/letsencrypt/live/example.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/example.com/privkey.pem

    Include /etc/letsencrypt/options-ssl-apache.conf
</VirtualHost>
```

## Binding to a Specific IPv4 Address

If you want Apache to bind the HTTPS virtual host to one IPv4 address, make sure the `Listen` directive and the generated virtual host both use that address:

```apacheconf
Listen 203.0.113.10:443

<VirtualHost 203.0.113.10:443>
    ServerName example.com
    # ... rest of SSL config
</VirtualHost>
```

## Automatic Renewal

Certbot installs a systemd timer (or cron job) that renews certificates before expiry.

```bash
# Test the renewal process (dry run, no changes made)
certbot renew --dry-run

# If your installation uses systemd, list timers and look for certbot
systemctl list-timers

# Manually list all certificates and their expiry dates
certbot certificates
```

## Forcing HTTPS Redirect

```apacheconf
# /etc/apache2/sites-available/example.com.conf
<VirtualHost 203.0.113.10:80>
    ServerName example.com
    ServerAlias www.example.com
    # Redirect all HTTP traffic to HTTPS permanently
    RewriteEngine On
    RewriteRule ^(.*)$ https://%{HTTP_HOST}$1 [R=301,L]
</VirtualHost>
```

## Key Takeaways

- `certbot --apache` automates certificate installation and Apache configuration.
- Certbot's scheduled renewal task runs periodically and renews certificates automatically when they are near expiry.
- Use `certbot renew --dry-run` to verify renewal works before the actual expiry.
- If you need Apache to listen on one IPv4 address only, update both the `Listen` directive and the generated virtual host.
