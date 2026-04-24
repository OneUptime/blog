# How to Renew SSL Certificates for Portainer Without Downtime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, SSL, TLS, Certificate-renewal, Zero-Downtime, Maintenance

Description: A guide to renewing SSL/TLS certificates for Portainer with minimal or zero downtime using proper renewal procedures.

## Overview

Certificate expiry causes immediate service disruption - browsers refuse connections and automation breaks. When Portainer is configured with custom certificates via `--sslcert` and `--sslkey`, restart the container after renewal so it starts using the updated certificate. However, with proper preparation and scripting, renewal can be completed in seconds with minimal user impact. This guide covers common Docker Standalone and reverse-proxy renewal strategies.

## Prerequisites

- Running Portainer on Docker Standalone, either with custom SSL or behind an Nginx reverse proxy
- Access to current certificate files
- Docker CLI access

## Understanding Portainer's Certificate Loading

Portainer reads the certificate paths configured with `--sslcert` and `--sslkey` when the container starts. To apply a renewed certificate, update those files and restart the Portainer container. The UI is briefly unavailable during the restart.

## Strategy 1: Certificate Pre-Staging (Minimal Downtime)

If Portainer was started with a bind-mounted certificate directory such as `-v /opt/portainer-certs:/certs --sslcert /certs/portainer.crt --sslkey /certs/portainer.key`, use a Certbot deploy hook so Portainer restarts only after a successful renewal:

```bash
#!/bin/bash
# renew-portainer-cert.sh

set -eu

DOMAIN="portainer.example.com"
PORTAINER_CERT_DIR="/opt/portainer-certs"
BACKUP_DIR="/opt/portainer-cert-backups/$(date +%Y%m%d-%H%M%S)"
CERT_PATH="${RENEWED_LINEAGE:-/etc/letsencrypt/live/${DOMAIN}}"

echo "=== Portainer Certificate Renewal ==="
echo "1. Backing up current Portainer certificates..."
mkdir -p "${BACKUP_DIR}"
cp "${PORTAINER_CERT_DIR}/portainer.crt" "${BACKUP_DIR}/portainer.crt"
cp "${PORTAINER_CERT_DIR}/portainer.key" "${BACKUP_DIR}/portainer.key"

echo "2. Copying renewed certificate into the bind-mounted certificate directory..."
install -d -m 755 "${PORTAINER_CERT_DIR}"
install -m 644 "${CERT_PATH}/fullchain.pem" "${PORTAINER_CERT_DIR}/portainer.crt"
install -m 600 "${CERT_PATH}/privkey.pem" "${PORTAINER_CERT_DIR}/portainer.key"

echo "3. Restarting Portainer..."
docker restart portainer >/dev/null

echo "4. Waiting for Portainer to be ready..."
for i in $(seq 1 30); do
  if curl -skf https://localhost:9443/ >/dev/null; then
    echo "Portainer is ready!"
    break
  fi
  sleep 1
  echo "  Waiting... (${i}/30)"
  if [ "${i}" -eq 30 ]; then
    echo "Portainer did not become ready in time" >&2
    exit 1
  fi
done

echo "5. Verifying new certificate..."
NEW_EXPIRY=$(echo | openssl s_client -connect localhost:9443 -servername "${DOMAIN}" 2>/dev/null \
  | openssl x509 -noout -enddate | cut -d= -f2)
echo "New certificate expiry: ${NEW_EXPIRY}"
echo "=== Renewal complete ==="
```

## Strategy 2: TLS Termination at Nginx (Zero Downtime)

If Nginx terminates TLS in front of Portainer, renew the Nginx certificate and reload Nginx. Portainer can continue running behind the proxy on port `9000` during the reload:

```bash
#!/bin/bash
# zero-downtime-renew.sh

set -eu

DOMAIN="portainer.example.com"

# Assumes Nginx is serving the public certificate and proxying to Portainer on port 9000.
certbot renew --cert-name "${DOMAIN}" --quiet

nginx -t
nginx -s reload

NEW_EXPIRY=$(echo | openssl s_client -connect localhost:443 -servername "${DOMAIN}" 2>/dev/null \
  | openssl x509 -noout -enddate | cut -d= -f2)
echo "New certificate expiry: ${NEW_EXPIRY}"
```

## Strategy 3: Scheduled Maintenance Window

For simplest operations, schedule during low-traffic hours:

```bash
# Add to crontab: check daily at 3 AM and restart Portainer only after a successful renewal
0 3 * * * certbot renew --cert-name "portainer.example.com" --quiet --deploy-hook /usr/local/bin/renew-portainer-cert.sh >> /var/log/portainer-cert-renewal.log 2>&1
```

## Monitoring Certificate Expiry

```bash
#!/bin/bash
# check-cert-expiry.sh
DOMAIN="portainer.example.com"
EXPIRY=$(echo | openssl s_client -connect localhost:9443 -servername "${DOMAIN}" 2>/dev/null \
  | openssl x509 -noout -enddate | cut -d= -f2)
EXPIRY_TS=$(date -d "${EXPIRY}" +%s)
NOW_TS=$(date +%s)
DAYS_LEFT=$(( (EXPIRY_TS - NOW_TS) / 86400 ))

if [ "${DAYS_LEFT}" -lt 14 ]; then
  echo "WARNING: Portainer certificate expires in ${DAYS_LEFT} days!"
  # Send alert
fi
echo "Certificate expires in ${DAYS_LEFT} days (${EXPIRY})"
```

```bash
# Add to crontab: daily check
0 9 * * * /usr/local/bin/check-cert-expiry.sh
```

## Rollback Procedure

```bash
# If renewal fails, restore from backup
PORTAINER_CERT_DIR="/opt/portainer-certs"

docker stop portainer

install -m 644 "${BACKUP_DIR}/portainer.crt" "${PORTAINER_CERT_DIR}/portainer.crt"
install -m 600 "${BACKUP_DIR}/portainer.key" "${PORTAINER_CERT_DIR}/portainer.key"

docker start portainer
echo "Rolled back to previous certificate"
```

## Conclusion

Portainer certificate renewal requires updating the configured certificate files and restarting the container, but with proper scripting this can be kept brief. The pre-staging approach (copy the renewed certificate into the bind-mounted certificate directory, then restart) minimizes downtime. For truly zero-downtime renewals, terminate TLS at Nginx and reload Nginx after renewal. Always maintain certificate backups before renewal and test the renewal process before certificates actually expire.
