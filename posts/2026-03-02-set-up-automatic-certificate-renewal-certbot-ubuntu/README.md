# How to Set Up Automatic Certificate Renewal with Certbot on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SSL/TLS, Certbot, Automation

Description: Learn how to configure automatic SSL certificate renewal with Certbot on Ubuntu, including renewal hooks, systemd timer configuration, and troubleshooting failed renewals.

---

Let's Encrypt certificates expire every 90 days. The short lifespan is intentional - it limits the damage from a compromised private key and encourages automation. Certbot handles renewal automatically, but understanding how renewal works and how to troubleshoot it prevents the panic of a certificate expiring on a production system.

## How Certbot Renewal Works

When you install Certbot and obtain a certificate, Certbot creates a systemd timer (or cron job on older systems) that runs twice daily. Each run checks whether any certificates are within 30 days of expiry. If they are, Certbot attempts renewal.

The renewal process:
1. Certbot checks `/etc/letsencrypt/renewal/` for renewal configuration files
2. For each near-expiry certificate, it runs the configured challenge (HTTP-01, DNS-01, etc.)
3. Let's Encrypt validates the challenge and issues a new certificate
4. Certbot saves the new certificate and runs any configured renewal hooks

## Checking the Renewal Setup

```bash
# View the certbot systemd timer
sudo systemctl status certbot.timer

# View the certbot service that the timer triggers
sudo systemctl status certbot.service

# List all timers to see when certbot will next run
sudo systemctl list-timers | grep certbot

# View renewal configuration for a specific domain
sudo cat /etc/letsencrypt/renewal/yourdomain.com.conf
```

The renewal config file shows how Certbot will renew the certificate:

```ini
# Example /etc/letsencrypt/renewal/yourdomain.com.conf
[renewalparams]
account = abc123...
authenticator = nginx    # or apache, standalone, dns-cloudflare, etc.
installer = nginx        # which web server plugin to update
server = https://acme-v02.api.letsencrypt.org/directory
```

## Testing Renewal

Always test renewal before relying on it:

```bash
# Dry run - simulates the entire renewal process without actually renewing
# This is the most important test to run
sudo certbot renew --dry-run

# Dry run for a specific certificate
sudo certbot renew --cert-name yourdomain.com --dry-run

# Expected output on success:
# Congratulations, all simulated renewals succeeded
```

If the dry run fails, fix it now rather than waiting for a production expiry.

## Checking Certificate Expiry Dates

```bash
# List all certificates and their expiry dates
sudo certbot certificates

# Output shows:
# Certificate Name: yourdomain.com
#   Domains: yourdomain.com www.yourdomain.com
#   Expiry Date: 2026-05-31 10:15:23+00:00 (VALID: 89 days)
#   Certificate Path: /etc/letsencrypt/live/yourdomain.com/fullchain.pem
#   Private Key Path: /etc/letsencrypt/live/yourdomain.com/privkey.pem

# Check expiry of a specific certificate file
sudo openssl x509 -in /etc/letsencrypt/live/yourdomain.com/cert.pem -noout -enddate
```

## Configuring Renewal Hooks

Renewal hooks are scripts that run before or after certificate renewal. The most important use is reloading your web server after a certificate is renewed.

Hook directories:

```text
/etc/letsencrypt/renewal-hooks/
├── deploy/       # Runs after successful renewal
├── post/         # Runs after renewal attempt (success or failure)
└── pre/          # Runs before renewal attempt
```

### Deploy Hook for Nginx

```bash
# Create a deploy hook to reload Nginx after renewal
sudo nano /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

```bash
#!/bin/bash
# Reload Nginx after certificate renewal
# Only reload if Nginx is running
if systemctl is-active --quiet nginx; then
    echo "Reloading Nginx to pick up renewed certificate..."
    systemctl reload nginx
else
    echo "Nginx is not running, skipping reload"
fi
```

```bash
# Make the hook executable
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

### Deploy Hook for Apache

```bash
sudo nano /etc/letsencrypt/renewal-hooks/deploy/reload-apache.sh
```

```bash
#!/bin/bash
# Reload Apache after certificate renewal
if systemctl is-active --quiet apache2; then
    systemctl reload apache2
fi
```

```bash
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-apache.sh
```

### Post-Renewal Hook for Notifications

Get notified when certificates renew (or fail to renew):

```bash
sudo nano /etc/letsencrypt/renewal-hooks/deploy/notify-renewal.sh
```

```bash
#!/bin/bash
# Send notification after successful certificate renewal

# Get the domain from the environment variable Certbot sets
DOMAIN="${RENEWED_DOMAINS}"
EXPIRY_DATE=$(openssl x509 -in "${RENEWED_LINEAGE}/cert.pem" -noout -enddate | cut -d= -f2)

# Log the renewal
echo "$(date): Certificate renewed for ${DOMAIN}. New expiry: ${EXPIRY_DATE}" >> /var/log/certbot-renewals.log

# Optionally send an email (requires mail command)
# echo "Certificate renewed for ${DOMAIN}. New expiry: ${EXPIRY_DATE}" | \
#     mail -s "Certificate Renewed: ${DOMAIN}" admin@example.com
```

```bash
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/notify-renewal.sh
```

## Forcing a Manual Renewal

Sometimes you want to renew before the 30-day window, such as after server changes:

```bash
# Force renewal even if not near expiry
sudo certbot renew --force-renewal

# Force renewal for a specific domain
sudo certbot renew --cert-name yourdomain.com --force-renewal

# After manual renewal, verify the new certificate
sudo certbot certificates
sudo openssl x509 -in /etc/letsencrypt/live/yourdomain.com/cert.pem -noout -enddate
```

## Monitoring Renewal Logs

```bash
# View Certbot's renewal logs
sudo tail -100 /var/log/letsencrypt/letsencrypt.log

# Follow the log in real time during a renewal attempt
sudo tail -f /var/log/letsencrypt/letsencrypt.log

# Check systemd journal for certbot service logs
sudo journalctl -u certbot.service --since "7 days ago"
```

## Handling Renewal Failures

### Port 80 Not Available

HTTP-01 challenges require port 80 to be accessible. If your server blocks port 80:

```bash
# Temporarily allow port 80 for renewal
sudo ufw allow 80/tcp
sudo certbot renew
sudo ufw delete allow 80/tcp
```

### Standalone Challenge (When Web Server Is Down)

If you need to renew without a web server running:

```bash
# Use standalone mode - Certbot runs its own temporary web server
sudo certbot renew --standalone

# Or for initial certificate with standalone
sudo certbot certonly --standalone -d yourdomain.com
```

### Rate Limits

Let's Encrypt rate limits certificate issuance. If you hit a rate limit:

```bash
# Check if you're near rate limits using the staging environment
sudo certbot renew --dry-run --staging

# The staging environment has higher limits and is safe for testing
# Staging certificates are not trusted by browsers but are valid for testing
```

## Setting Up Monitoring for Certificate Expiry

Add an external check to alert you if renewal fails:

```bash
# Create a script to check certificate expiry and alert
sudo nano /usr/local/bin/check-cert-expiry.sh
```

```bash
#!/bin/bash
# check-cert-expiry.sh - Alert when certificates are near expiry

DOMAINS=("yourdomain.com" "anotherdomain.com")
ALERT_DAYS=14  # Alert when fewer than 14 days remaining
LOG_FILE="/var/log/cert-expiry-check.log"

for domain in "${DOMAINS[@]}"; do
    # Get expiry date using openssl
    EXPIRY=$(echo | openssl s_client -servername "$domain" -connect "${domain}:443" 2>/dev/null | \
              openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)

    if [[ -z "$EXPIRY" ]]; then
        echo "$(date): ERROR - Could not check certificate for $domain" | tee -a "$LOG_FILE"
        continue
    fi

    # Calculate days until expiry
    EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$EXPIRY" +%s)
    NOW_EPOCH=$(date +%s)
    DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

    if [[ $DAYS_LEFT -lt $ALERT_DAYS ]]; then
        echo "$(date): WARNING - Certificate for $domain expires in $DAYS_LEFT days ($EXPIRY)" | tee -a "$LOG_FILE"
        # Send alert (add your notification method here)
    else
        echo "$(date): OK - Certificate for $domain expires in $DAYS_LEFT days" >> "$LOG_FILE"
    fi
done
```

```bash
sudo chmod +x /usr/local/bin/check-cert-expiry.sh

# Run daily via cron
sudo crontab -e
# Add: 0 6 * * * /usr/local/bin/check-cert-expiry.sh
```

## Renewal with DNS Challenge

For wildcard certificates or servers behind firewalls, use DNS-01 challenge:

```bash
# Example with Cloudflare DNS plugin
sudo apt install python3-certbot-dns-cloudflare

# Create Cloudflare API credentials file
sudo nano /etc/letsencrypt/cloudflare.ini
# dns_cloudflare_api_token = YOUR_API_TOKEN
sudo chmod 600 /etc/letsencrypt/cloudflare.ini

# Obtain wildcard certificate using DNS challenge
sudo certbot certonly \
    --dns-cloudflare \
    --dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini \
    -d yourdomain.com \
    -d "*.yourdomain.com"
```

Renewal works the same way - Certbot will use the DNS plugin automatically based on the renewal configuration.

## Summary

Certbot's automatic renewal via systemd timer requires little maintenance once configured. Run `certbot renew --dry-run` to verify the renewal process works end to end. Create deploy hooks in `/etc/letsencrypt/renewal-hooks/deploy/` to reload your web server after renewal. Monitor the renewal logs at `/var/log/letsencrypt/letsencrypt.log` periodically, and add external certificate expiry monitoring as a safety net. With these pieces in place, certificate expiry becomes a non-issue.
