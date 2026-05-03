# How to Deploy BorgBackup with Borgmatic via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, BorgBackup, Borgmatic, Backup, Docker, Storage

Description: Deploy Borgmatic to run scheduled BorgBackup jobs inside a Docker container managed by Portainer, protecting application data with deduplication and encryption.

---

BorgBackup (Borg) provides fast, deduplicated, encrypted backups. Borgmatic is a configuration-driven wrapper that automates Borg operations including before/after hooks, monitoring notifications, and retention policies. Running Borgmatic in a Docker container via Portainer makes it easy to schedule and manage backups as a first-class service.

## Step 1: Prepare the Borgmatic Configuration

Create the config file on the host before deploying the container:

```bash
mkdir -p /opt/borgmatic
```

```yaml
# /opt/borgmatic/config.yaml

source_directories:
  - /mnt/source        # Bind-mounted source data

repositories:
  - path: /mnt/borg-repo    # Local repository (or SSH remote)
    label: local

encryption_passphrase: "your-strong-passphrase"
compression: lz4
archive_name_format: "{hostname}-{now}"

keep_daily: 7
keep_weekly: 4
keep_monthly: 6

checks:
  - name: repository
    frequency: 2 weeks
  - name: archives
    frequency: 2 weeks

# Send result to monitoring endpoint
commands:
  - after: error
    run:
      - echo "Borgmatic backup FAILED" | curl -X POST https://your-alert-webhook -d @-
```

## Step 2: Deploy Borgmatic via Portainer Stack

Go to **Stacks > Add Stack**:

```yaml
# borgmatic-stack.yml
version: "3.8"

services:
  borgmatic:
    image: ghcr.io/borgmatic-collective/borgmatic:latest
    environment:
      - TZ=UTC
      # Run backups at 02:00 daily
      - BACKUP_CRON=0 2 * * *
    volumes:
      # Borgmatic config
      - /opt/borgmatic/config.yaml:/etc/borgmatic.d/config.yaml:ro
      # Source data (read-only for safety)
      - /opt/appdata:/mnt/source:ro
      # Local Borg repository storage
      - borg-repo:/mnt/borg-repo
      # Borg cache for faster incremental backups
      - borg-cache:/root/.cache/borg
    restart: unless-stopped

volumes:
  borg-repo:
  borg-cache:
```

## Step 3: Initialize the Repository

After deploying, use Portainer's **Console** to run the one-time init command:

```bash
# Initialize a new Borg repository
# (use 'borgmatic init' for borgmatic versions older than 1.9.0)
borgmatic repo-create --encryption repokey-blake2
```

Borg will prompt for a passphrase. Store this passphrase securely - without it, you cannot restore.

## Step 4: Trigger a Manual Backup

Test the setup with a manual run before relying on the cron schedule:

```bash
# Inside the borgmatic container
borgmatic create --verbosity 1
```

## Step 5: Verify and Restore

```bash
# List available archives
borgmatic list

# Mount an archive for inspection
borgmatic mount --mount-point /mnt/borg-restore --archive latest

# Extract specific files
borgmatic extract --archive latest --path /mnt/source/important-data
```

## Monitoring

Borgmatic supports monitoring integrations. Add to the hooks section:

```yaml
healthchecks:
  ping_url: https://hc-ping.com/your-check-uuid
# Or use ntfy for push notifications
ntfy:
  topic: backup-alerts
  server: https://ntfy.sh
```

## Summary

BorgBackup with Borgmatic on Portainer gives you production-grade encrypted backups with deduplication, retention policies, and monitoring hooks - all managed through a single YAML configuration and a Docker container. The cron-based scheduling keeps backups running automatically without external schedulers.
