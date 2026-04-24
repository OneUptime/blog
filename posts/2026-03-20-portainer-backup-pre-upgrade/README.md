# How to Back Up Portainer Database Before Major Changes - Pre Upgrade

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Backup, Upgrade, Safety, Best Practice

Description: Create a safe backup of Portainer's database before performing major upgrades, configuration changes, or experiments to ensure a quick rollback path.

## Introduction

Before making significant changes to Portainer - upgrading to a major version, modifying authentication settings, changing RBAC configurations, or testing new features - always create a backup. This guide covers pre-change backup best practices.

## When to Back Up Before Changes

Back up before:
- **Version upgrades** (especially major version bumps)
- **Authentication changes** (switching from local to LDAP/OAuth)
- **RBAC restructuring** (major team/permission changes)
- **Environment additions/removals**
- **Database operations** (compact-db, migrations)
- **License changes**

## Step 1: Quick Pre-Change Backup

```bash
# One-command backup before any change

docker stop portainer && \
docker run --rm \
  -v portainer_data:/data \
  -v /opt/backups:/backup \
  alpine tar czf "/backup/portainer-pre-change-$(date +%Y%m%d-%H%M%S).tar.gz" \
    -C /data . && \
docker start portainer

echo "Backup created in /opt/backups/"
ls -lh /opt/backups/portainer-pre-change*.tar.gz | tail -3
```

## Step 2: Pre-Upgrade Backup Checklist

```bash
#!/bin/bash
# pre-upgrade-checklist.sh

CURRENT_VERSION=$(docker exec portainer /portainer --version 2>/dev/null | head -1)
BACKUP_DIR="/opt/backups/portainer"
DATE=$(date +%Y%m%d-%H%M%S)
PORTAINER_URL="https://localhost:9443"

mkdir -p "$BACKUP_DIR"

echo "=== Portainer Pre-Upgrade Checklist ==="
echo "Current version: $CURRENT_VERSION"
echo "Backup location: $BACKUP_DIR"

# 1. Document current state
echo ""
echo "=== Step 1: Documenting current state ==="
TOKEN=$(jq -n --arg password "$PORTAINER_PASS" \
  '{Username:"admin",Password:$password}' | \
  curl -ks -X POST "$PORTAINER_URL/api/auth" \
    -H "Content-Type: application/json" \
    -d @- | jq -r .jwt)

ENDPOINT_COUNT=$(curl -ks -H "Authorization: Bearer $TOKEN" \
  "$PORTAINER_URL/api/endpoints" | jq 'length')
STACK_COUNT=$(curl -ks -H "Authorization: Bearer $TOKEN" \
  "$PORTAINER_URL/api/stacks" | jq 'length')
USER_COUNT=$(curl -ks -H "Authorization: Bearer $TOKEN" \
  "$PORTAINER_URL/api/users" | jq 'length')

echo "  Environments: $ENDPOINT_COUNT"
echo "  Stacks: $STACK_COUNT"
echo "  Users: $USER_COUNT"

# Save state to file
cat > "$BACKUP_DIR/state-$DATE.json" << EOF
{
  "version": "$CURRENT_VERSION",
  "endpoints": $ENDPOINT_COUNT,
  "stacks": $STACK_COUNT,
  "users": $USER_COUNT,
  "timestamp": "$DATE"
}
EOF

# 2. Export stack definitions
echo ""
echo "=== Step 2: Exporting stack definitions ==="
mkdir -p "$BACKUP_DIR/stacks-$DATE"
curl -ks -H "Authorization: Bearer $TOKEN" \
  "$PORTAINER_URL/api/stacks" | jq -c '.[]' | while read -r stack; do
  ID=$(echo "$stack" | jq -r '.Id')
  NAME=$(echo "$stack" | jq -r '.Name')
  curl -ks -H "Authorization: Bearer $TOKEN" \
    "$PORTAINER_URL/api/stacks/$ID/file" | \
    jq -r '.StackFileContent' > "$BACKUP_DIR/stacks-$DATE/$NAME.yml"
  echo "  Exported: $NAME"
done

# 3. Create database backup
echo ""
echo "=== Step 3: Creating database backup ==="
docker stop portainer
sleep 2

docker run --rm \
  -v portainer_data:/data \
  -v "$BACKUP_DIR:/backup" \
  alpine tar czf "/backup/portainer-pre-upgrade-$DATE.tar.gz" -C /data .

BACKUP_SIZE=$(du -sh "$BACKUP_DIR/portainer-pre-upgrade-$DATE.tar.gz" | cut -f1)
echo "  Backup created: portainer-pre-upgrade-$DATE.tar.gz ($BACKUP_SIZE)"

docker start portainer
sleep 5

echo ""
echo "=== Checklist Complete ==="
echo "Safe to proceed with upgrade. Rollback files:"
echo "  Database: $BACKUP_DIR/portainer-pre-upgrade-$DATE.tar.gz"
echo "  Stacks: $BACKUP_DIR/stacks-$DATE/"
echo "  State: $BACKUP_DIR/state-$DATE.json"
```

## Step 3: Verify the Backup Before Proceeding

```bash
# Verify the backup is extractable
BACKUP_FILE="/opt/backups/portainer/portainer-pre-upgrade-20260320-020000.tar.gz"

# Test extraction
tar -tzf "$BACKUP_FILE" | head -10

# Verify portainer.db exists and has size > 0
DB_PATH=$(tar -tzf "$BACKUP_FILE" | grep -E '(^|/)(portainer\.db)$' | head -1)
SIZE=0
if [ -n "$DB_PATH" ]; then
  SIZE=$(tar -xzOf "$BACKUP_FILE" "$DB_PATH" 2>/dev/null | wc -c)
fi

echo "portainer.db size in backup: $SIZE bytes"
if [ "$SIZE" -gt 1000 ]; then
  echo "Backup appears valid"
else
  echo "WARNING: Backup may be empty or corrupt"
fi
```

## Step 4: Perform the Change

```bash
# Example: Upgrading Portainer
# AFTER backup is verified

docker stop portainer && docker rm portainer

docker pull portainer/portainer-ce:sts

# Add -p 9000:9000 if you still need legacy HTTP access
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:sts
```

## Step 5: Rollback Procedure

```bash
# If the change went wrong, restore from backup:

# 1. Stop the new/modified Portainer
docker stop portainer && docker rm portainer

# 2. Remove the modified data volume
docker volume rm portainer_data

# 3. Create new volume and restore backup
docker volume create portainer_data
docker run --rm \
  -v portainer_data:/data \
  -v /opt/backups:/backup \
  alpine tar xzf /backup/portainer/portainer-pre-upgrade-20260320-020000.tar.gz -C /data

# 4. Start the previous Portainer version
PREVIOUS_VERSION="2.39.1"  # Replace with the exact version you were running before the upgrade
# Add -p 9000:9000 if you still need legacy HTTP access
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  "portainer/portainer-ce:$PREVIOUS_VERSION"

echo "Rollback complete. Portainer is back to version $PREVIOUS_VERSION"
```

## Step 6: Backup Retention Policy

```bash
# Keep only last 10 pre-upgrade backups
ls -t /opt/backups/portainer/portainer-pre-upgrade*.tar.gz | \
  tail -n +11 | \
  xargs rm -f

echo "Old backups removed. Current backups:"
ls -lt /opt/backups/portainer/portainer-pre-upgrade*.tar.gz
```

## Conclusion

Creating a backup before major Portainer changes is a 2-minute investment that can save hours of reconfiguration. The pre-upgrade backup script provides a complete safety net: database backup, stack definition exports, and a state record. If anything goes wrong, rollback takes less than 5 minutes. Make this a mandatory step in your change management process for any Portainer modifications.
