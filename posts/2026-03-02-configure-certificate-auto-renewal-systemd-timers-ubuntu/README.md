# How to Configure Certificate Auto-Renewal with systemd Timers on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SSL, systemd, Certificate Renewal, TLS

Description: Set up automated SSL certificate renewal using systemd timers on Ubuntu for reliable, loggable certificate management without depending on cron.

---

Expired certificates cause outages. A certificate that renews automatically means one fewer thing to track manually. While Certbot installs its own renewal timer, there are situations where you need custom renewal logic - for certificates managed by acme.sh, custom ACME clients, or internal PKI systems. systemd timers are the right tool for this: they're reliable, integrated with the journal for logging, and support more scheduling options than cron.

## systemd Timers vs Cron

systemd timers have several advantages for certificate renewal:

- Output goes to the journal (`journalctl`) - no lost emails or /dev/null
- Supports `OnCalendar` (like cron) plus `OnBootSec`, `OnActiveSec` - useful if the system was off when renewal should have run
- Service unit handles dependencies (wait for network, etc.)
- `AccuracySec` adds randomization to spread load across a time window
- Systemd tracks when timers last ran, so missed runs are retried at next boot

## Basic Architecture

A systemd timer consists of two units:
- A `.service` unit: what to run
- A `.timer` unit: when to run the service

Both must have the same base name.

## Setting Up Renewal for acme.sh

### Create the Service Unit

```bash
sudo nano /etc/systemd/system/acme-renew.service
```

```ini
[Unit]
Description=Renew ACME certificates
After=network-online.target
Wants=network-online.target
# Don't fail if acme.sh isn't installed yet
ConditionFileIsExecutable=/root/.acme.sh/acme.sh

[Service]
Type=oneshot
User=root
# Renew all certificates managed by acme.sh
ExecStart=/root/.acme.sh/acme.sh --cron --home /root/.acme.sh
# Log output to journal under this identifier
StandardOutput=journal
StandardError=journal
SyslogIdentifier=acme-renew
```

### Create the Timer Unit

```bash
sudo nano /etc/systemd/system/acme-renew.timer
```

```ini
[Unit]
Description=Daily ACME certificate renewal
Wants=acme-renew.service

[Timer]
# Run daily at a random time between 02:00 and 03:00
OnCalendar=*-*-* 02:00:00
# Spread the start time by up to 1 hour (reduces CA server load)
AccuracySec=1h
RandomizedDelaySec=1h
# Run at boot if the scheduled time was missed (e.g., system was off)
Persistent=true

[Install]
WantedBy=timers.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now acme-renew.timer

# Verify timer is active
sudo systemctl status acme-renew.timer
```

## Setting Up Renewal for Custom Certificate Scripts

For a custom renewal script that handles any ACME client:

### Create the Renewal Script

```bash
sudo nano /usr/local/bin/renew-certificates.sh
```

```bash
#!/bin/bash
# Certificate renewal script
# Runs under systemd, output goes to journal

set -euo pipefail

LOG_TAG="cert-renew"
NGINX_RELOADED=false

logger -t "$LOG_TAG" "Starting certificate renewal check"

# Renew certificates using your chosen tool
# Example: Certbot
if command -v certbot &>/dev/null; then
    if certbot renew --quiet --no-random-sleep-on-renew; then
        logger -t "$LOG_TAG" "Certbot renewal completed successfully"
    else
        logger -t "$LOG_TAG" "Certbot renewal failed"
        exit 1
    fi
fi

# Example: acme.sh
if [ -x /root/.acme.sh/acme.sh ]; then
    if /root/.acme.sh/acme.sh --cron --home /root/.acme.sh; then
        logger -t "$LOG_TAG" "acme.sh renewal completed successfully"
    else
        logger -t "$LOG_TAG" "acme.sh renewal failed"
        exit 1
    fi
fi

# Reload nginx only if not already reloaded
if ! $NGINX_RELOADED && systemctl is-active --quiet nginx; then
    systemctl reload nginx
    logger -t "$LOG_TAG" "Nginx reloaded"
fi

logger -t "$LOG_TAG" "Certificate renewal check complete"
```

```bash
sudo chmod +x /usr/local/bin/renew-certificates.sh
```

### Service Unit for the Custom Script

```bash
sudo nano /etc/systemd/system/cert-renew.service
```

```ini
[Unit]
Description=SSL/TLS Certificate Renewal
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/renew-certificates.sh
User=root
Group=root

# Security hardening
NoNewPrivileges=yes
PrivateTmp=yes

# Timeout - certificate operations shouldn't take more than 5 minutes
TimeoutStartSec=300

# Resource limits
LimitNOFILE=1024

[Install]
WantedBy=multi-user.target
```

### Timer Unit

```bash
sudo nano /etc/systemd/system/cert-renew.timer
```

```ini
[Unit]
Description=SSL/TLS Certificate Renewal Timer

[Timer]
# Run twice daily (Let's Encrypt recommends twice-daily checks)
OnCalendar=*-*-* 00,12:00:00
# Randomize within 1 hour to avoid thundering herd
RandomizedDelaySec=3600
# Persist so missed runs are caught on next boot
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now cert-renew.timer
```

## Verifying Timer Configuration

```bash
# List all timers with next scheduled run
systemctl list-timers

# Show specific timer
systemctl list-timers cert-renew.timer

# Check timer status
systemctl status cert-renew.timer
```

Expected output for `list-timers`:

```text
NEXT                        LEFT      LAST                        PASSED UNIT
Mon 2026-03-02 12:34:00 UTC 6h left   Mon 2026-03-02 00:12:00 UTC 6h ago cert-renew.timer
```

## Running the Renewal Manually

Test the service unit outside of the timer:

```bash
# Run the renewal service immediately
sudo systemctl start cert-renew.service

# Check exit status and output
systemctl status cert-renew.service
journalctl -u cert-renew.service -n 50
```

## Certificate Expiry Monitoring

Add a separate service that checks certificate expiry and alerts if renewal failed:

```bash
sudo nano /usr/local/bin/check-cert-expiry.sh
```

```bash
#!/bin/bash
# Check SSL certificate expiry and alert if expiring soon
# Designed to run as a systemd service

DOMAINS=(
    "example.com:443"
    "api.example.com:443"
    "mail.example.com:993"
)

WARN_DAYS=14   # Alert if certificate expires within this many days
CRIT_DAYS=7    # Critical if expires within this many days

EXIT_CODE=0

for DOMAIN_PORT in "${DOMAINS[@]}"; do
    DOMAIN="${DOMAIN_PORT%%:*}"
    PORT="${DOMAIN_PORT##*:}"

    # Get certificate expiry date
    EXPIRY=$(echo | openssl s_client -connect "$DOMAIN:$PORT" \
        -servername "$DOMAIN" 2>/dev/null | \
        openssl x509 -noout -enddate 2>/dev/null | \
        cut -d= -f2)

    if [ -z "$EXPIRY" ]; then
        echo "ERROR: Could not connect to $DOMAIN:$PORT"
        EXIT_CODE=2
        continue
    fi

    # Calculate days until expiry
    EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s)
    NOW_EPOCH=$(date +%s)
    DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

    if [ "$DAYS_LEFT" -lt "$CRIT_DAYS" ]; then
        echo "CRITICAL: $DOMAIN certificate expires in $DAYS_LEFT days ($EXPIRY)"
        EXIT_CODE=2
    elif [ "$DAYS_LEFT" -lt "$WARN_DAYS" ]; then
        echo "WARNING: $DOMAIN certificate expires in $DAYS_LEFT days ($EXPIRY)"
        [ "$EXIT_CODE" -eq 0 ] && EXIT_CODE=1
    else
        echo "OK: $DOMAIN expires in $DAYS_LEFT days ($EXPIRY)"
    fi
done

exit $EXIT_CODE
```

```bash
sudo chmod +x /usr/local/bin/check-cert-expiry.sh
```

Create the monitoring timer:

```bash
sudo nano /etc/systemd/system/cert-check.service
```

```ini
[Unit]
Description=Check SSL Certificate Expiry
After=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/check-cert-expiry.sh
# On failure, the journal captures the output
StandardOutput=journal
StandardError=journal
```

```bash
sudo nano /etc/systemd/system/cert-check.timer
```

```ini
[Unit]
Description=Daily SSL Certificate Expiry Check

[Timer]
OnCalendar=*-*-* 08:00:00
RandomizedDelaySec=600
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl enable --now cert-check.timer
```

## Viewing Renewal Logs

```bash
# View all output from the renewal service
journalctl -u cert-renew.service

# Last 24 hours
journalctl -u cert-renew.service --since "24 hours ago"

# Follow logs in real time during manual run
journalctl -u cert-renew.service -f &
sudo systemctl start cert-renew.service

# View timer history
journalctl -u cert-renew.timer
```

## OnCalendar Syntax Reference

Common scheduling patterns:

```ini
# Every day at 2 AM
OnCalendar=*-*-* 02:00:00

# Every day at 2 AM and 2 PM
OnCalendar=*-*-* 02,14:00:00

# Every Monday at 3 AM
OnCalendar=Mon *-*-* 03:00:00

# First day of each month at midnight
OnCalendar=*-*-01 00:00:00

# Every 12 hours
OnCalendar=0/12:00:00

# Verify an OnCalendar expression before using it
systemd-analyze calendar '*-*-* 02:00:00'
```

## Disabling the Default Certbot Timer

If you set up your own renewal timer for Certbot, disable the default one to avoid conflicts:

```bash
# Check which timer certbot installs
sudo systemctl list-timers | grep certbot
sudo systemctl list-timers | grep snap.certbot

# Disable the default timer
sudo systemctl disable --now snap.certbot.renew.timer
# Or for apt-installed certbot:
sudo systemctl disable --now certbot.timer
```

## Summary

systemd timers provide a robust, well-integrated mechanism for automated certificate renewal on Ubuntu. Compared to cron, they offer better logging through the journal, reliable execution after missed runs with `Persistent=true`, and fine-grained dependency control for ensuring network availability before renewal attempts. Combined with a certificate expiry monitoring service, this gives you automated renewal with visibility into its success or failure.
