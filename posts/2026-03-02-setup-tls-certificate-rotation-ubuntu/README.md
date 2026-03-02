# How to Set Up TLS Certificate Rotation on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, TLS, Certificates, Security, Automation

Description: Configure automated TLS certificate rotation on Ubuntu to prevent service outages from expired certificates using systemd timers, scripting, and proper service reload strategies.

---

Expired TLS certificates cause outages. They are one of the most avoidable production incidents, yet they happen repeatedly because organizations don't automate rotation. Setting up certificate rotation properly means your certificates renew before they expire, your services reload to pick up the new certificates, and you get notified if anything goes wrong.

## Why Rotation Fails

Certificate rotation fails for two common reasons:

1. The renewal happens but the service doesn't reload (still serving the old cert)
2. The reload happens but breaks the service (bad syntax in config, wrong permissions)

A complete rotation solution handles both: renew, verify, reload. If any step fails, alert and don't proceed.

## Certificate Rotation With Let's Encrypt and Certbot

Certbot is the most common way to get and rotate Let's Encrypt certificates on Ubuntu. It handles renewal automatically but needs post-renewal hooks to reload services.

```bash
# Install certbot
sudo apt-get install -y certbot

# Get a certificate for a domain
sudo certbot certonly --standalone -d example.com --non-interactive \
    --agree-tos --email admin@example.com

# Verify the certificate
sudo certbot certificates
```

### Configure Post-Renewal Hooks

Certbot runs scripts in `/etc/letsencrypt/renewal-hooks/deploy/` after successful renewal:

```bash
# Create an Nginx reload hook
sudo nano /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

```bash
#!/bin/bash
# Post-renewal hook: reload Nginx to pick up new certificates

# Test Nginx configuration before reloading
if /usr/sbin/nginx -t 2>/dev/null; then
    systemctl reload nginx
    echo "$(date): Nginx reloaded after certificate renewal" >> /var/log/certbot-reload.log
else
    echo "$(date): Nginx config test failed, skipping reload" >> /var/log/certbot-reload.log
    exit 1
fi
```

```bash
# Create an Apache reload hook
sudo nano /etc/letsencrypt/renewal-hooks/deploy/reload-apache.sh
```

```bash
#!/bin/bash
# Post-renewal hook: reload Apache

if /usr/sbin/apache2ctl configtest 2>/dev/null; then
    systemctl reload apache2
    echo "$(date): Apache reloaded after certificate renewal" >> /var/log/certbot-reload.log
else
    echo "$(date): Apache config test failed, skipping reload" >> /var/log/certbot-reload.log
    exit 1
fi
```

```bash
# Make hooks executable
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-apache.sh
```

### Enable Automatic Renewal

Certbot installs a systemd timer automatically. Verify it is running:

```bash
# Check the certbot timer
sudo systemctl status certbot.timer

# List the timer details
systemctl list-timers certbot.timer

# Manually trigger a renewal dry-run to test
sudo certbot renew --dry-run
```

If the timer is not installed, create it manually:

```bash
sudo nano /etc/systemd/system/certbot.service
```

```ini
[Unit]
Description=Certbot Renewal

[Service]
Type=oneshot
ExecStart=/usr/bin/certbot renew --quiet --post-hook "systemctl reload nginx"
```

```bash
sudo nano /etc/systemd/system/certbot.timer
```

```ini
[Unit]
Description=Run Certbot twice daily

[Timer]
OnCalendar=*-*-* 00,12:00:00
RandomizedDelaySec=43200
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now certbot.timer
```

## Certificate Rotation for Internal/Custom CAs

For internal services using certificates from an internal CA, you need a different rotation strategy.

### Build a Rotation Script

```bash
sudo nano /usr/local/bin/rotate-cert.sh
```

```bash
#!/bin/bash
# TLS certificate rotation script for custom CA certificates
# Usage: rotate-cert.sh <service> <domain>

set -uo pipefail

SERVICE="${1:-}"
DOMAIN="${2:-}"
CERT_DIR="/etc/ssl/custom-certs"
CA_CERT="/etc/ssl/ca/ca.crt"
CA_KEY="/etc/ssl/ca/ca.key"
LOG="/var/log/cert-rotation.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"
}

if [[ -z "$SERVICE" || -z "$DOMAIN" ]]; then
    echo "Usage: $0 <service-name> <domain>"
    exit 1
fi

CERT_PATH="$CERT_DIR/$DOMAIN.crt"
KEY_PATH="$CERT_DIR/$DOMAIN.key"
CSR_PATH="/tmp/$DOMAIN.csr"

log "Starting certificate rotation for $DOMAIN (service: $SERVICE)"

# Generate a new private key
openssl genrsa -out "$KEY_PATH.new" 4096
chmod 640 "$KEY_PATH.new"

# Generate a CSR
openssl req -new \
    -key "$KEY_PATH.new" \
    -out "$CSR_PATH" \
    -subj "/CN=$DOMAIN/O=Internal/C=US"

# Sign with the CA
openssl x509 -req \
    -in "$CSR_PATH" \
    -CA "$CA_CERT" \
    -CAkey "$CA_KEY" \
    -CAcreateserial \
    -out "$CERT_PATH.new" \
    -days 90 \
    -sha256 \
    -extfile <(printf "subjectAltName=DNS:$DOMAIN")

log "New certificate generated, expires in 90 days"

# Verify the new certificate
openssl verify -CAfile "$CA_CERT" "$CERT_PATH.new"
if [[ $? -ne 0 ]]; then
    log "Certificate verification failed, aborting rotation"
    rm -f "$CERT_PATH.new" "$KEY_PATH.new"
    exit 1
fi

# Back up old certificate
if [[ -f "$CERT_PATH" ]]; then
    cp "$CERT_PATH" "$CERT_PATH.bak-$(date +%Y%m%d)"
fi

# Atomic replacement
mv "$CERT_PATH.new" "$CERT_PATH"
mv "$KEY_PATH.new" "$KEY_PATH"

log "Certificate files replaced"

# Reload the service
if systemctl is-active "$SERVICE" > /dev/null 2>&1; then
    # Test config first if applicable
    case "$SERVICE" in
        nginx)
            nginx -t 2>/dev/null || { log "Nginx config test failed"; exit 1; }
            ;;
        apache2)
            apache2ctl configtest 2>/dev/null || { log "Apache config test failed"; exit 1; }
            ;;
    esac

    systemctl reload "$SERVICE"
    log "Service $SERVICE reloaded successfully"
else
    log "Service $SERVICE is not running"
fi

# Clean up
rm -f "$CSR_PATH"

# Verify the running service is using the new certificate
EXPIRY=$(echo | openssl s_client -connect "$DOMAIN:443" 2>/dev/null | \
    openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
log "New certificate in service expires: $EXPIRY"

log "Rotation complete for $DOMAIN"
```

```bash
sudo chmod 700 /usr/local/bin/rotate-cert.sh
```

## Monitor Certificate Expiry

Catch expiring certificates before they cause outages:

```bash
sudo nano /usr/local/bin/check-cert-expiry.sh
```

```bash
#!/bin/bash
# Check TLS certificate expiry for a list of domains
# Alert when certificates expire within 30 days

DOMAINS=(
    "example.com:443"
    "api.example.com:443"
    "internal.example.com:8443"
)
WARNING_DAYS=30
CRITICAL_DAYS=7
ALERT_EMAIL="admin@example.com"

check_cert() {
    local host_port="$1"
    local host="${host_port%%:*}"
    local port="${host_port##*:}"

    # Get the certificate expiry date
    EXPIRY=$(echo | timeout 5 openssl s_client \
        -connect "$host:$port" \
        -servername "$host" 2>/dev/null | \
        openssl x509 -noout -enddate 2>/dev/null | \
        cut -d= -f2)

    if [[ -z "$EXPIRY" ]]; then
        echo "UNKNOWN: Could not check $host:$port"
        return 2
    fi

    # Convert to Unix timestamp
    EXPIRY_TS=$(date -d "$EXPIRY" +%s 2>/dev/null)
    NOW_TS=$(date +%s)
    DAYS_LEFT=$(( (EXPIRY_TS - NOW_TS) / 86400 ))

    if [[ $DAYS_LEFT -le $CRITICAL_DAYS ]]; then
        echo "CRITICAL: $host expires in $DAYS_LEFT days ($EXPIRY)"
        return 2
    elif [[ $DAYS_LEFT -le $WARNING_DAYS ]]; then
        echo "WARNING: $host expires in $DAYS_LEFT days ($EXPIRY)"
        return 1
    else
        echo "OK: $host expires in $DAYS_LEFT days"
        return 0
    fi
}

ALERTS=""
for domain in "${DOMAINS[@]}"; do
    RESULT=$(check_cert "$domain")
    STATUS=$?
    echo "$RESULT"

    if [[ $STATUS -gt 0 ]]; then
        ALERTS="$ALERTS\n$RESULT"
    fi
done

# Send email if there are any alerts
if [[ -n "$ALERTS" ]]; then
    echo -e "Certificate expiry alerts from $(hostname):\n$ALERTS" | \
        mail -s "Certificate expiry warning" "$ALERT_EMAIL"
fi
```

```bash
sudo chmod +x /usr/local/bin/check-cert-expiry.sh

# Run daily
echo "0 8 * * * root /usr/local/bin/check-cert-expiry.sh" | \
    sudo tee /etc/cron.d/check-cert-expiry
```

## Automate Rotation on Schedule

Schedule certificate rotation for before expiry:

```bash
sudo nano /etc/systemd/system/cert-rotation.service
```

```ini
[Unit]
Description=TLS Certificate Rotation
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/rotate-cert.sh nginx example.com
ExecStart=/usr/local/bin/rotate-cert.sh nginx api.example.com
```

```bash
sudo nano /etc/systemd/system/cert-rotation.timer
```

```ini
[Unit]
Description=Run certificate rotation monthly

[Timer]
# Run on the 1st of each month at 2am
OnCalendar=*-*-01 02:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now cert-rotation.timer

# Test manually
sudo systemctl start cert-rotation.service
sudo journalctl -u cert-rotation.service -n 50
```

Setting up certificate rotation takes a few hours of initial work but eliminates an entire class of production incident. Expired certificates are 100% preventable with automation, and the monitoring component ensures you know about any failures in the rotation pipeline before users are affected.
