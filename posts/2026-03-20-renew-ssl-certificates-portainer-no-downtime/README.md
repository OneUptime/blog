# How to Renew SSL Certificates in Portainer Without Downtime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, SSL, Certificate Renewal, Zero Downtime, DevOps

Description: Learn how to renew SSL certificates for Portainer with zero or minimal downtime using certificate hot-swapping and automation.

---

SSL certificates expire, and renewing them without interrupting access to Portainer requires a careful approach. If Portainer terminates TLS itself, restarting the container introduces a brief interruption while Docker stops and starts it.

## Strategy Overview

```mermaid
flowchart LR
    A[Certificate Expires Soon] --> B[Obtain New Certificate]
    B --> C[Replace Certificate Files]
    C --> D[Restart Portainer Container]
    D --> E[Verify New Certificate]
    E --> F[Update Monitoring Alerts]
```

## Method 1: Replace Files and Restart (Minimal Downtime)

If Portainer uses mounted certificate files, a restart is required to load the renewed certificate:

```bash
#!/bin/bash
# renew-portainer-ssl.sh

CERT_DIR="/opt/portainer/certs"
CERT_NAME="portainer.example.com"

echo "[$(date)] Starting certificate renewal for $CERT_NAME"

# Step 1: Renew the certificate if it is due (using Certbot)
CURRENT_EXPIRY=$(openssl x509 -in /etc/letsencrypt/live/"$CERT_NAME"/fullchain.pem \
  -noout -enddate 2>/dev/null)

sudo certbot renew --cert-name "$CERT_NAME" --quiet

UPDATED_EXPIRY=$(openssl x509 -in /etc/letsencrypt/live/"$CERT_NAME"/fullchain.pem \
  -noout -enddate 2>/dev/null)

if [ "$CURRENT_EXPIRY" != "$UPDATED_EXPIRY" ]; then
  # Step 2: Copy renewed certs to Portainer's cert directory
  sudo cp /etc/letsencrypt/live/"$CERT_NAME"/fullchain.pem "$CERT_DIR/portainer.crt"
  sudo cp /etc/letsencrypt/live/"$CERT_NAME"/privkey.pem "$CERT_DIR/portainer.key"

  # Set permissions
  sudo chmod 644 "$CERT_DIR/portainer.crt"
  sudo chmod 600 "$CERT_DIR/portainer.key"

  # Step 3: Restart Portainer to pick up new certificate
  sudo docker restart portainer

  sleep 5
else
  echo "[$(date)] Certificate was not renewed. Portainer restart skipped."
fi

# Step 4: Verify the new certificate is in use
NEW_EXPIRY=$(openssl s_client -connect localhost:9443 </dev/null 2>/dev/null | \
  openssl x509 -noout -enddate 2>/dev/null)
echo "[$(date)] Renewal check complete. Certificate expiry: $NEW_EXPIRY"
```

## Method 2: Zero-Downtime via Reverse Proxy

Use Nginx as a reverse proxy that terminates TLS to achieve true zero-downtime renewal:

```bash
# Renew the certificate managed by Certbot
sudo certbot renew --quiet

# Reload Nginx (zero downtime - workers gracefully hand off)
sudo nginx -s reload

# Portainer itself doesn't need to restart when Nginx handles TLS termination
echo "Certificate renewed and Nginx reloaded with zero downtime"
```

## Method 3: Certbot Renewal Hooks

Configure Certbot to automatically copy the renewed certificate into Portainer's cert directory and restart Portainer only on successful renewal:

```bash
# Create a deploy hook that restarts Portainer after renewal
sudo tee /etc/letsencrypt/renewal-hooks/deploy/restart-portainer.sh << 'EOF'
#!/bin/bash
# Only runs after successful renewal
CERT_NAME="portainer.example.com"
CERT_DIR="/opt/portainer/certs"

cp /etc/letsencrypt/live/"$CERT_NAME"/fullchain.pem "$CERT_DIR/portainer.crt"
cp /etc/letsencrypt/live/"$CERT_NAME"/privkey.pem "$CERT_DIR/portainer.key"
chmod 644 "$CERT_DIR/portainer.crt"
chmod 600 "$CERT_DIR/portainer.key"

docker restart portainer
echo "[$(date)] Portainer certificate updated and container restarted after renewal" >> /var/log/certbot-portainer.log
EOF

sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/restart-portainer.sh

# Test the renewal process (dry run)
sudo certbot renew --dry-run
```

## Monitor Certificate Expiry

Set up proactive alerts before certificates expire:

```bash
#!/bin/bash
# check-cert-expiry.sh - run via cron daily

DOMAIN="portainer.example.com"
PORT="9443"
WARNING_DAYS=30
ALERT_EMAIL="admin@example.com"

EXPIRY=$(openssl s_client -connect "$DOMAIN:$PORT" -servername "$DOMAIN" </dev/null 2>/dev/null | \
  openssl x509 -noout -enddate | cut -d= -f2)

EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s)
NOW_EPOCH=$(date +%s)
DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

echo "Certificate for $DOMAIN expires in $DAYS_LEFT days ($EXPIRY)"

if [ "$DAYS_LEFT" -lt "$WARNING_DAYS" ]; then
  echo "WARNING: Certificate expires in $DAYS_LEFT days!" | \
    mail -s "SSL Certificate Expiry Warning: $DOMAIN" "$ALERT_EMAIL"
fi
```

---

*Automate certificate expiry alerts with [OneUptime](https://oneuptime.com) SSL monitoring.*
