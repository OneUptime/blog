# How to Renew SSL/TLS Certificates Automatically with Certbot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Let's Encrypt, Certbot, SSL, Auto-Renewal, HTTPS, Certificate

Description: Learn how to configure automatic SSL certificate renewal with Certbot, including renewal hooks to reload web servers and monitoring for renewal failures.

## Why Automatic Renewal Is Critical

Let's Encrypt certificates currently expire after 90 days. Manual renewal is error-prone-it's easy to forget, and an expired certificate causes HTTPS errors for all visitors. Most Certbot installations provide automatic renewal via a scheduled task that runs `certbot renew` periodically. For 90-day certificates, Certbot typically attempts renewal when about 30 days remain.

## Step 1: Verify Renewal Is Already Set Up

Most Certbot installations already include automatic renewal via cron or a systemd timer:

```bash
# Check for a Certbot systemd timer
sudo systemctl list-timers --all | grep certbot

# Check common cron locations used by older installations
sudo grep -R "certbot renew" /etc/crontab /etc/cron.*/* /etc/cron.d 2>/dev/null
```

## Step 2: Test Renewal Without Actually Renewing

Always dry-run first to catch configuration issues:

```bash
# Dry run - simulates renewal without making changes
sudo certbot renew --dry-run

# Expected output:
# Congratulations, all simulated renewals succeeded:
#   /etc/letsencrypt/live/example.com/fullchain.pem (success)
```

If the dry run fails, fix the issue before the actual expiry deadline.

## Step 3: Manual Renewal

Run a renewal check manually:

```bash
# Renew all certificates due for renewal
sudo certbot renew

# Force renewal even if not due (e.g., to switch from RSA to ECDSA)
sudo certbot renew --force-renewal

# Renew a specific domain only
sudo certbot renew --cert-name example.com
```

## Step 4: Configure Renewal Hooks

Renewal hooks run before or after renewal to reload services. Certbot automatically handles Apache/Nginx reloads when it manages those installations, but for custom setups use hooks:

```bash
# Create a deploy hook to reload Nginx after renewal
sudo mkdir -p /etc/letsencrypt/renewal-hooks/deploy

sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh > /dev/null << 'EOF'
#!/bin/bash
# Reload Nginx after certificate renewal
systemctl reload nginx
echo "Nginx reloaded after certificate renewal at $(date)" >> /var/log/certbot-deploy.log
EOF

sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

Hook directory types:
- `pre/` - run before renewal attempt
- `deploy/` - run if renewal succeeded
- `post/` - run after renewal attempt (success or failure)

## Step 5: Send Alerts on Renewal Failure

Create a post-hook that sends an alert if renewal fails by checking Certbot's `FAILED_DOMAINS` environment variable:

```bash
sudo mkdir -p /etc/letsencrypt/renewal-hooks/post

sudo tee /etc/letsencrypt/renewal-hooks/post/alert-on-failure.sh > /dev/null << 'EOF'
#!/bin/bash
# Send alert if Certbot renewal failed
if [ -n "$FAILED_DOMAINS" ]; then
    echo "CRITICAL: Certbot renewal failed for: $FAILED_DOMAINS at $(date)" | \
        mail -s "SSL Renewal Failure: $(hostname)" admin@example.com

    # Or send to Slack webhook
    curl -s -X POST "https://hooks.slack.com/services/xxx/yyy/zzz" \
         -H "Content-Type: application/json" \
         -d "{\"text\": \"SSL renewal FAILED for: $FAILED_DOMAINS on $(hostname)! Check /var/log/letsencrypt/letsencrypt.log\"}"
fi
EOF

sudo chmod +x /etc/letsencrypt/renewal-hooks/post/alert-on-failure.sh
```

## Step 6: Configure Renewal for Multiple Domains

Each certificate has its own renewal configuration in `/etc/letsencrypt/renewal/`:

```bash
# List all certificates and their renewal configurations
sudo certbot certificates

# View a specific renewal config
sudo cat /etc/letsencrypt/renewal/example.com.conf

# The [renewalparams] section shows how the cert was originally obtained
# For changes, prefer certbot reconfigure over editing the file manually
```

## Step 7: Monitor Certificate Expiry

Set up monitoring to alert before certificates expire:

```bash
#!/bin/bash
# /usr/local/bin/check-cert-expiry.sh
# Run daily with cron

DOMAINS=("example.com" "api.example.com" "shop.example.com")
WARN_DAYS=30
CRITICAL_DAYS=7

for DOMAIN in "${DOMAINS[@]}"; do
    EXPIRY=$(openssl s_client -connect "${DOMAIN}:443" -servername "${DOMAIN}" \
              </dev/null 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | \
              sed 's/notAfter=//')
    EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s)
    NOW_EPOCH=$(date +%s)
    DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

    if [ "$DAYS_LEFT" -lt "$CRITICAL_DAYS" ]; then
        echo "CRITICAL: ${DOMAIN} expires in ${DAYS_LEFT} days!"
    elif [ "$DAYS_LEFT" -lt "$WARN_DAYS" ]; then
        echo "WARNING: ${DOMAIN} expires in ${DAYS_LEFT} days"
    fi
done
```

Add to crontab:
```bash
0 8 * * * /usr/local/bin/check-cert-expiry.sh | mail -s "SSL Expiry Check" admin@example.com
```

## Step 8: View Renewal Logs

```bash
# View Certbot renewal logs
sudo tail -100 /var/log/letsencrypt/letsencrypt.log

# Check the last renewal attempt
sudo grep -A5 "Renewal" /var/log/letsencrypt/letsencrypt.log | tail -20
```

## Conclusion

Certbot's automatic renewal via systemd timer or cron handles most renewal scenarios without manual intervention. Verify the renewal mechanism is active with `systemctl list-timers --all | grep certbot`, test with `certbot renew --dry-run`, and add deploy hooks to reload your web server after renewal. Implement expiry monitoring as a safety net to catch any renewal failures before they impact production.
