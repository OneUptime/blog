# How to Upgrade Portainer Business Edition with In-App Updates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Portainer-business, In-app-updates, Upgrade

Description: A guide to using Portainer Business Edition's in-app update feature for streamlined upgrades directly from the Portainer web interface.

## Overview

Portainer Business Edition includes an in-app update mechanism that simplifies upgrades by allowing administrators to trigger updates directly from the Portainer web interface. From Portainer 2.19 onward, Business Edition users can update from within Portainer, and only LTS releases are offered through the in-app update flow. This guide covers using the in-app update feature and when to use it vs manual upgrade methods.

## Accessing In-App Updates

The in-app update feature is available in Portainer Business Edition from version 2.19 onward:

```text
Portainer UI → bottom-left update notification → Update now
```

If a new version is available, Portainer displays an update notification and a button to trigger the upgrade.

## Step 1: Check for Updates

If an update is available, Portainer shows an update notification in the bottom-left of the Portainer UI. If the update option is missing, confirm Portainer can reach the update service and that ad blocking, DNS filtering, or network proxies are not interfering.

## Step 2: Review Release Notes

Before upgrading, always review the release notes:

```text
1. Open Portainer's release notes for the target LTS release
2. Review breaking changes, new features, and bug fixes
3. Check if any agent or deployment changes are required
```

## Step 3: Backup Before Updating

Even with in-app updates, backup first:

```text
Settings → Back up Portainer → Download backup
```

Or back up the /data volume via CLI:

```bash
docker run --rm \
  -v portainer_data:/data \
  -v "$(pwd)":/backup \
  alpine tar czf /backup/portainer-before-update-$(date +%Y%m%d).tar.gz -C /data .
```

## Step 4: Trigger the In-App Update

```text
Portainer UI → bottom-left update notification → Update now
→ Click "Start update" in the confirmation dialog
→ Portainer restarts into the updated version
```

You will lose the browser connection while Portainer restarts - this is normal.

## Step 5: Verify the Update

After Portainer restarts, navigate back to `https://your-server-address:9443`:

```text
The update notification should be gone
→ The version number should show the new version
```

## When to Use In-App Updates vs Manual Upgrade

| Scenario | Recommended Method |
|---|---|
| Portainer BE, non-critical | In-App Update |
| Portainer BE, production | In-App or manual upgrade, with backup and prior testing |
| Portainer CE | Manual upgrade for your deployment type |
| Kubernetes deployment | Helm upgrade or apply updated manifests |
| Swarm deployment | Docker service update |
| Major version upgrade | Manual with careful review |

## Rollback After In-App Update

If the in-app update causes issues, restore the backup you created before the update. If you did not create a manual backup first, Portainer also stores an automatic `portainer.db.bak` during the update process:

```bash
# Stop and remove the current container
docker stop portainer
docker rm portainer

# Restore the automatically created database backup
docker run --rm \
  -v portainer_data:/data \
  alpine sh -c "mv /data/portainer.db /data/portainer.db.oldversion && cp /data/backups/portainer.db.bak /data/portainer.db"

# Start with the previous version
: "${PREVIOUS_VERSION:?Set PREVIOUS_VERSION to the exact version you were running before the update}"
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ee:${PREVIOUS_VERSION}
```

## Update Notifications

Portainer surfaces update availability through UI notifications rather than a dedicated email setting for new-version alerts:

```text
Portainer UI → bottom-left update notification
→ Bell icon in the top-right shows recent popup notifications
→ Notifications page lists the 50 most recent notifications
```

## Conclusion

Portainer Business Edition's in-app update feature simplifies the upgrade process for most deployments. For non-production environments, the in-app update provides a convenient one-click upgrade experience. For production environments, back up first and validate the upgrade path on a non-critical system before updating. Expect a brief interruption while Portainer restarts during the upgrade.
