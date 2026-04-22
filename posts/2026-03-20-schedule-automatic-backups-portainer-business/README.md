# How to Schedule Automatic Backups in Portainer Business Edition - Business

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Business Edition, Backup, Automation, DevOps

Description: Learn how to configure scheduled automatic backups in Portainer Business Edition using both the built-in UI scheduler and cron-based automation.

---

Portainer Business Edition includes built-in S3 backup scheduling that can automatically upload password-protected backup archives to an S3 bucket on a regular interval. This eliminates the need for external cron scripts to protect your Portainer configuration.

## Configure Scheduled Backups in the UI

### Step 1: Navigate to Backup Settings

1. Log in to Portainer BE as an administrator
2. Go to **Settings** in the left sidebar
3. Scroll down to **Back up Portainer**

### Step 2: Enable Scheduled Backups

In the **Back up Portainer** section:
- Select **Store in S3**
- Toggle **Schedule automatic backups** to ON
- Set the **Cron rule** (e.g., `0 2 * * *` for 2 AM daily)
- Enter the S3 settings: **Access Key ID**, **Secret Access Key**, **Region**, **Bucket name**, and **S3 compatible host** if you are using MinIO or another S3-compatible provider
- Optionally toggle **Password protect** on and set a **Password** to encrypt the backup archive
- Click **Save settings**

Portainer will now automatically upload backup archives to the configured S3 bucket on the defined schedule.

## Configure via API (Automation)

For GitOps or infrastructure-as-code workflows, configure backups via the API:

```bash
# First, log in to get a JWT token

TOKEN=$(curl -fsS -X POST \
  https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Configure scheduled S3 backup: daily at 2 AM with encryption
curl -X POST \
  https://localhost:9443/api/backup/s3/settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accessKeyID": "AKIAIOSFODNN7EXAMPLE",
    "secretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    "region": "us-east-1",
    "bucketName": "my-portainer-backups",
    "s3CompatibleHost": "",
    "cronRule": "0 2 * * *",
    "password": "your-backup-encryption-password"
  }' \
  --insecure
```

## External Cron Backup (Alternative)

If you prefer an external cron job to control backup storage:

```bash
#!/bin/bash
# /usr/local/bin/portainer-auto-backup.sh
# Schedule: 0 2 * * * /usr/local/bin/portainer-auto-backup.sh

set -e

BACKUP_DIR="/opt/portainer-backups"
PORTAINER_URL="https://localhost:9443"
ADMIN_USER="admin"
ADMIN_PASS="yourpassword"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Get auth token
TOKEN=$(curl -fsS -X POST \
  "${PORTAINER_URL}/api/auth" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${ADMIN_USER}\",\"password\":\"${ADMIN_PASS}\"}" \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Download backup
curl -fsS -X POST \
  "${PORTAINER_URL}/api/backup" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"Password":"backup-encryption-key"}' \
  --output "${BACKUP_DIR}/portainer_${DATE}.tar.gz" \
  --insecure

# Remove old backups
find "$BACKUP_DIR" -name "portainer_*.tar.gz" -mtime +"$RETENTION_DAYS" -delete

echo "[$(date)] Backup saved: ${BACKUP_DIR}/portainer_${DATE}.tar.gz"
```

```bash
# Install the cron job
chmod +x /usr/local/bin/portainer-auto-backup.sh
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/portainer-auto-backup.sh >> /var/log/portainer-backup.log 2>&1") | crontab -
```

## Verify Backups Are Running

```bash
# Check built-in S3 backup status
curl -s https://localhost:9443/api/backup/s3/status --insecure

# For external cron backups, check cron log
tail -20 /var/log/portainer-backup.log

# List backup files
ls -lh /opt/portainer-backups/
```

---

*Monitor your backup job execution and get alerted on failures with [OneUptime](https://oneuptime.com).*
