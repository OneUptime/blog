# How to Handle Terraform Enterprise License Management

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terraform Enterprise, License, Management, Administration, HashiCorp

Description: A practical guide to managing Terraform Enterprise licenses, including installation, renewal, monitoring expiration, and handling license-related issues in production.

---

Terraform Enterprise requires a valid license from HashiCorp to operate. Unlike HCP Terraform, which is a SaaS product formerly known as Terraform Cloud, TFE is self-hosted software that you license annually (or on another term depending on your agreement). For production licenses, HashiCorp does not terminate normal application operation on the expiry date, but an expired license can block authentication to the HashiCorp image registry, which can prevent reinstalling, scaling, or upgrading TFE. Managing the license proactively prevents this entirely avoidable operational risk.

This guide covers everything about TFE license management - from initial installation to renewal monitoring and troubleshooting.

## Understanding TFE Licensing

TFE licenses are tied to several parameters:

- **Expiration date**: When the license stops being valid
- **User count**: Maximum number of users allowed (may be unlimited)
- **Features**: Which TFE features are enabled (Sentinel, cost estimation, SSO, etc.)
- **Module count**: In some license tiers, the number of private registry modules

The license is delivered as the raw HashiCorp license body, which you provide during installation as a string or in a mounted file.

## Installing the License

### During Initial Setup

```bash
# For Docker-based deployments, set the license as an environment variable

TFE_LICENSE=02MV4UU43BK5HGYYTOJZ...your-license-string

# Or point to a license file
TFE_LICENSE_PATH=/etc/tfe/license.rli
```

### Docker Compose Configuration

```yaml
# docker-compose.yml with license configuration
version: "3.9"
services:
  tfe:
    image: images.releases.hashicorp.com/hashicorp/terraform-enterprise:<vYYYYMM-#>
    environment:
      TFE_HOSTNAME: tfe.example.com
      # Option 1: License as a string (recommended for secrets management)
      TFE_LICENSE: "${TFE_LICENSE}"
      # Option 2: License file path
      # TFE_LICENSE_PATH: /etc/tfe/license.rli
    volumes:
      # Only needed if using TFE_LICENSE_PATH
      - ./license.rli:/etc/tfe/license.rli:ro
```

### Kubernetes Deployment

```yaml
# Store the license in a Kubernetes secret
apiVersion: v1
kind: Secret
metadata:
  name: tfe-license
  namespace: tfe
type: Opaque
stringData:
  license: |
    02MV4UU43BK5HGYYTOJZ...your-license-string
---
# Reference in the TFE deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tfe
spec:
  template:
    spec:
      containers:
        - name: tfe
          env:
            - name: TFE_LICENSE
              valueFrom:
                secretKeyRef:
                  name: tfe-license
                  key: license
```

## Checking License Status

### Via the TFE CLI

```bash
# Check current license status
tfectl app license
```

### Via the API

The Admin API does not expose the license expiration date through `/api/v2/admin/general-settings`. You can use it to monitor the current user count:

```bash
# Check current TFE user count
curl -s \
  --header "Authorization: Bearer ${TFE_ADMIN_TOKEN}" \
  --header "Content-Type: application/vnd.api+json" \
  "${TFE_URL}/api/v2/admin/users?page%5Bsize%5D=1" | \
  jq '.meta.pagination["total-count"]'
```

### For Legacy Replicated Deployments

Use the Replicated console at `https://tfe.example.com:8800` and select **View License**, or inspect the license from the command line:

```bash
replicatedctl license inspect
```

### Via TFE Logs

```bash
# Check license-related log messages
docker logs tfe 2>&1 | grep -i license
```

## Monitoring License Expiration

Do not let your license expire unexpectedly. Set up automated monitoring:

```bash
#!/bin/bash
# check-tfe-license.sh
# Monitor TFE license expiration and alert before it expires

WARNING_DAYS=30
CRITICAL_DAYS=7

# Get the license expiration date.
# For current non-Replicated runtimes, run this command inside the TFE container or pod.
EXPIRY_DATE=$(tfectl app license | awk -F': ' '/Expiration|Expires/ {print $2; exit}')

if [ "${EXPIRY_DATE}" = "null" ] || [ -z "${EXPIRY_DATE}" ]; then
  echo "CRITICAL: Could not retrieve license expiration date"
  exit 2
fi

# Calculate days until expiration
EXPIRY_EPOCH=$(date -d "${EXPIRY_DATE}" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%SZ" "${EXPIRY_DATE}" +%s 2>/dev/null)
NOW_EPOCH=$(date +%s)
DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

echo "TFE License expires: ${EXPIRY_DATE} (${DAYS_LEFT} days remaining)"

if [ ${DAYS_LEFT} -lt 0 ]; then
  echo "CRITICAL: TFE license has EXPIRED!"
  exit 2
elif [ ${DAYS_LEFT} -lt ${CRITICAL_DAYS} ]; then
  echo "CRITICAL: TFE license expires in ${DAYS_LEFT} days!"
  exit 2
elif [ ${DAYS_LEFT} -lt ${WARNING_DAYS} ]; then
  echo "WARNING: TFE license expires in ${DAYS_LEFT} days"
  exit 1
else
  echo "OK: TFE license is valid for ${DAYS_LEFT} more days"
  exit 0
fi
```

### Prometheus Metric Exporter

```bash
#!/bin/bash
# tfe-license-exporter.sh
# Export license metrics for Prometheus scraping

EXPIRY_DATE=$(tfectl app license | awk -F': ' '/Expiration|Expires/ {print $2; exit}')

EXPIRY_EPOCH=$(date -d "${EXPIRY_DATE}" +%s 2>/dev/null)
NOW_EPOCH=$(date +%s)
DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

USER_COUNT=$(curl -s \
  --header "Authorization: Bearer ${TFE_ADMIN_TOKEN}" \
  --header "Content-Type: application/vnd.api+json" \
  "${TFE_URL}/api/v2/admin/users?page%5Bsize%5D=1" | \
  jq -r '.meta.pagination["total-count"]')

# Output in Prometheus exposition format
cat << EOF
# HELP tfe_license_expiry_days Days until TFE license expires
# TYPE tfe_license_expiry_days gauge
tfe_license_expiry_days ${DAYS_LEFT}
# HELP tfe_license_user_count Current number of TFE users
# TYPE tfe_license_user_count gauge
tfe_license_user_count ${USER_COUNT}
EOF
```

Set up a Prometheus alert:

```yaml
# prometheus alert for TFE license
groups:
  - name: tfe-license
    rules:
      - alert: TFELicenseExpiringSoon
        expr: tfe_license_expiry_days < 30
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "TFE license expires in {{ $value }} days"

      - alert: TFELicenseExpiryCritical
        expr: tfe_license_expiry_days < 7
        for: 1h
        labels:
          severity: critical
        annotations:
          summary: "TFE license expires in {{ $value }} days - immediate action required"
```

## Renewing the License

### Getting a New License

1. Contact your HashiCorp account team or reseller
2. Provide your organization name and TFE instance details
3. You will receive an updated license file or string
4. Apply the new license before the current one expires

### Applying the Updated License

```bash
# Option 1: Update the environment variable
# Edit your .env file or Docker Compose configuration
# Replace the TFE_LICENSE value with the new license string
# Then restart TFE

# Option 2: Update the license file
# Copy the new license file to the TFE host
cp new-license.rli /opt/tfe/license.rli

# Restart TFE to pick up the new license
cd /opt/tfe
docker compose restart tfe

# Verify the new license is active
tfectl app license
```

### For Kubernetes Deployments

```bash
# Update the license secret
kubectl -n tfe create secret generic tfe-license \
  --from-literal=license="02MV4UU43BK5HGYYTOJZ...new-license-string" \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart the TFE pods to pick up the new secret
kubectl -n tfe rollout restart deployment/tfe
```

## What Happens When the License Expires

When a TFE license expires:

1. **Existing application operation**: Production licenses provisioned by HashiCorp do not terminate on the expiry date.
2. **Image registry authentication**: An expired license cannot be used to authenticate with the HashiCorp image registry.
3. **Operational changes**: If your deployment pulls directly from the HashiCorp registry, reinstalling, scaling, or upgrading TFE can fail until the license is renewed.
4. **License reporting**: Automated license utilization reporting continues to help HashiCorp validate entitlements.
5. **State access**: Existing state files remain accessible as long as the TFE application and its storage remain healthy.

The impact is significant but not catastrophic - no data is lost because the license date passed. Once you apply a valid license, image registry authentication and operational changes can resume normally.

## License Best Practices

1. **Store the license securely**: Use a secrets manager (Vault, AWS Secrets Manager, etc.) rather than plain text files.
2. **Track expiration**: Set calendar reminders and automated alerts at 90, 60, 30, and 7 days before expiration.
3. **Start renewal early**: Begin the renewal process at least 60 days before expiration to account for procurement delays.
4. **Keep a backup**: Store a copy of the license file in your secure backup location.
5. **Test in staging first**: If you have a staging TFE instance, apply the renewed license there first to verify it works.

## Troubleshooting License Issues

**"License is invalid"**: The license string might be corrupted. Ensure no whitespace or line breaks were added when copying. Compare the SHA256 hash of your file against what HashiCorp provided.

**"License has expired"**: Apply a renewed license. Contact HashiCorp support if you need an emergency extension.

**"User limit exceeded"**: Your license has a user cap. Either upgrade your license or review users for suspension or removal:

```bash
# Count all users
curl -s \
  --header "Authorization: Bearer ${TFE_ADMIN_TOKEN}" \
  --header "Content-Type: application/vnd.api+json" \
  "${TFE_URL}/api/v2/admin/users?page%5Bsize%5D=1" | \
  jq '.meta.pagination["total-count"]'
```

## Summary

TFE license management is a simple but critical admin task. Install the license during setup, monitor its expiration with automated alerts, and start the renewal process well before it expires. The consequences of an expired license - blocked registry authentication for reinstall, scale, or upgrade operations - are easily avoidable with basic monitoring. Use tools like [OneUptime](https://oneuptime.com) to track the license expiration metric alongside your other TFE health checks, and you will never be caught off guard by an expiring license.
