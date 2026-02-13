# How to Set Up HTTPS with Let's Encrypt and Certbot on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, HTTPS, SSL, Let's Encrypt, Certbot, Security, Tutorial

Description: Comprehensive guide to securing your websites with free SSL/TLS certificates from Let's Encrypt using Certbot on Ubuntu.

---

HTTPS is no longer optional-browsers mark HTTP sites as insecure, and search engines penalize them. Let's Encrypt provides free, automated SSL/TLS certificates, and Certbot makes obtaining and renewing them simple. This guide covers setup for Apache and Nginx on Ubuntu.

## Prerequisites

- Ubuntu 20.04, 22.04, or 24.04
- A registered domain name pointing to your server
- Apache or Nginx installed and configured
- Root or sudo access
- Ports 80 and 443 open in firewall

## Understanding Let's Encrypt

Let's Encrypt is a free, automated Certificate Authority that provides:
- **Domain Validated (DV) certificates**: Verifies you control the domain
- **90-day validity**: Certificates must be renewed regularly (automated)
- **Rate limits**: 50 certificates per domain per week
- **Wildcard support**: Requires DNS validation

## Installing Certbot

### For Ubuntu 20.04+

```bash
# Install Certbot from Ubuntu repositories
sudo apt update
sudo apt install certbot -y
```

### Install Web Server Plugin

Choose based on your web server:

```bash
# For Apache
sudo apt install python3-certbot-apache -y

# For Nginx
sudo apt install python3-certbot-nginx -y
```

## Obtaining Certificates

### For Apache

```bash
# Obtain and install certificate automatically
sudo certbot --apache -d example.com -d www.example.com
```

Certbot will:
1. Verify domain ownership
2. Obtain certificate
3. Configure Apache virtual host
4. Set up HTTPS redirect (if selected)

### For Nginx

```bash
# Obtain and install certificate automatically
sudo certbot --nginx -d example.com -d www.example.com
```

### Interactive Prompts

During setup, you'll be asked:
- **Email address**: For renewal notifications
- **Terms of Service**: Must agree to continue
- **Share email with EFF**: Optional
- **Redirect HTTP to HTTPS**: Recommended (option 2)

## Certificate-Only Mode

If you want just the certificate without automatic configuration:

```bash
# Obtain certificate without modifying web server config
sudo certbot certonly --webroot -w /var/www/example.com -d example.com -d www.example.com
```

Or using standalone mode (temporarily binds to port 80):

```bash
# Stop web server first if running on port 80
sudo systemctl stop nginx  # or apache2

# Obtain certificate using standalone server
sudo certbot certonly --standalone -d example.com -d www.example.com

# Restart web server
sudo systemctl start nginx
```

## Certificate Locations

Certificates are stored in:

```
/etc/letsencrypt/live/example.com/
├── cert.pem       # Domain certificate
├── chain.pem      # Intermediate certificates
├── fullchain.pem  # cert.pem + chain.pem (use this for most servers)
├── privkey.pem    # Private key (keep secure!)
└── README
```

## Manual Web Server Configuration

### Apache SSL Configuration

If using certificate-only mode, configure Apache manually:

```bash
# Enable SSL module
sudo a2enmod ssl

# Create SSL virtual host
sudo nano /etc/apache2/sites-available/example.com-ssl.conf
```

```apache
<VirtualHost *:443>
    ServerName example.com
    ServerAlias www.example.com
    DocumentRoot /var/www/example.com

    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/example.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/example.com/privkey.pem

    # Modern SSL settings
    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384
    SSLHonorCipherOrder off
    SSLSessionTickets off

    # HSTS (optional, but recommended)
    Header always set Strict-Transport-Security "max-age=63072000"

    <Directory /var/www/example.com>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/example.com_ssl_error.log
    CustomLog ${APACHE_LOG_DIR}/example.com_ssl_access.log combined
</VirtualHost>
```

Enable and restart:

```bash
# Enable headers module for HSTS
sudo a2enmod headers

# Enable the SSL site
sudo a2ensite example.com-ssl.conf

# Test configuration
sudo apache2ctl configtest

# Restart Apache
sudo systemctl restart apache2
```

### Nginx SSL Configuration

```bash
# Edit server block
sudo nano /etc/nginx/sites-available/example.com
```

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name example.com www.example.com;
    root /var/www/example.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # SSL Settings
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    # Modern configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;

    location / {
        try_files $uri $uri/ =404;
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name example.com www.example.com;
    return 301 https://$server_name$request_uri;
}
```

Test and restart:

```bash
# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## Automatic Renewal

Let's Encrypt certificates expire after 90 days. Certbot sets up automatic renewal.

### Test Renewal

```bash
# Test renewal process (dry run)
sudo certbot renew --dry-run
```

### Check Renewal Timer

```bash
# View systemd timer status
sudo systemctl status certbot.timer

# List scheduled timers
sudo systemctl list-timers
```

### Manual Renewal

```bash
# Renew all certificates
sudo certbot renew

# Renew specific certificate
sudo certbot renew --cert-name example.com
```

### Custom Renewal Hooks

Run commands after renewal (e.g., restart web server):

```bash
# Create post-renewal hook
sudo nano /etc/letsencrypt/renewal-hooks/post/restart-webserver.sh
```

```bash
#!/bin/bash
# Restart web server after certificate renewal
systemctl reload nginx
# Or for Apache:
# systemctl reload apache2
```

```bash
# Make executable
sudo chmod +x /etc/letsencrypt/renewal-hooks/post/restart-webserver.sh
```

## Wildcard Certificates

Wildcard certificates cover all subdomains (`*.example.com`). They require DNS validation.

### Using DNS Challenge

```bash
# Request wildcard certificate with DNS challenge
sudo certbot certonly --manual --preferred-challenges dns -d "*.example.com" -d example.com
```

You'll be prompted to create DNS TXT records. Add them through your DNS provider, then continue.

### Automated DNS Challenge

For popular DNS providers, use DNS plugins:

```bash
# Install Cloudflare plugin
sudo apt install python3-certbot-dns-cloudflare -y

# Create credentials file
sudo nano /etc/letsencrypt/cloudflare.ini
```

```ini
# Cloudflare API credentials
dns_cloudflare_api_token = your-api-token-here
```

```bash
# Secure the credentials file
sudo chmod 600 /etc/letsencrypt/cloudflare.ini

# Obtain wildcard certificate
sudo certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini \
  -d "*.example.com" \
  -d example.com
```

Available DNS plugins:
- `python3-certbot-dns-cloudflare`
- `python3-certbot-dns-digitalocean`
- `python3-certbot-dns-route53`
- `python3-certbot-dns-google`

## Managing Certificates

### List Certificates

```bash
# Show all managed certificates
sudo certbot certificates
```

### Delete Certificate

```bash
# Remove a certificate
sudo certbot delete --cert-name example.com
```

### Revoke Certificate

```bash
# Revoke certificate (if compromised)
sudo certbot revoke --cert-path /etc/letsencrypt/live/example.com/cert.pem
```

### Expand Certificate

Add domains to existing certificate:

```bash
# Add new domains
sudo certbot --expand -d example.com -d www.example.com -d blog.example.com
```

## Multiple Certificates

For different sites on the same server:

```bash
# Site 1
sudo certbot --nginx -d site1.com -d www.site1.com

# Site 2
sudo certbot --nginx -d site2.com -d www.site2.com

# Each gets its own certificate in /etc/letsencrypt/live/
```

## Testing SSL Configuration

### Online Tools

- [SSL Labs](https://www.ssllabs.com/ssltest/): Comprehensive test
- [Security Headers](https://securityheaders.com/): Check HTTP headers

### Command Line

```bash
# Test SSL handshake
openssl s_client -connect example.com:443 -servername example.com

# Check certificate expiration
echo | openssl s_client -connect example.com:443 2>/dev/null | openssl x509 -noout -dates

# Check certificate details
echo | openssl s_client -connect example.com:443 2>/dev/null | openssl x509 -noout -text
```

## Troubleshooting

### "Domain Not Pointing to Server"

Verify DNS:

```bash
# Check A record
dig +short example.com

# Should return your server IP
```

### "Port 80 Already in Use"

```bash
# Find what's using port 80
sudo netstat -tlpn | grep :80

# Stop conflicting service temporarily
sudo systemctl stop nginx
sudo certbot certonly --standalone -d example.com
sudo systemctl start nginx
```

### "Rate Limited"

Let's Encrypt has rate limits:
- 50 certificates per registered domain per week
- 5 duplicate certificates per week
- Use staging for testing: `--staging` flag

```bash
# Use staging environment for testing
sudo certbot --staging --nginx -d example.com
```

### "Renewal Failed"

```bash
# Check renewal logs
sudo cat /var/log/letsencrypt/letsencrypt.log

# Test renewal manually
sudo certbot renew --dry-run

# Force renewal
sudo certbot renew --force-renewal
```

### Permission Issues

```bash
# Fix permissions on Let's Encrypt directories
sudo chmod -R 755 /etc/letsencrypt/live
sudo chmod -R 755 /etc/letsencrypt/archive
```

## Security Best Practices

1. **Enable HSTS**: Tells browsers to always use HTTPS
2. **Redirect HTTP to HTTPS**: Never serve content over HTTP
3. **Use modern TLS**: Disable TLS 1.0 and 1.1
4. **Regular renewal testing**: Run `--dry-run` monthly
5. **Monitor expiration**: Set up monitoring alerts
6. **Backup private keys**: Store securely offline

---

With Let's Encrypt and Certbot, there's no excuse for running unencrypted websites. The automated renewal ensures your certificates stay valid, and the free pricing removes cost barriers. For production sites, test your SSL configuration with SSL Labs and aim for an A+ rating.
