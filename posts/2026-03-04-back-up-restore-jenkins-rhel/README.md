# How to Back Up and Restore Jenkins on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Jenkins, Backups, Restore, CI/CD, Administration

Description: Protect your Jenkins CI/CD server by implementing reliable backup and restore procedures on RHEL, covering configuration, jobs, and plugins.

---

Losing a Jenkins server without backups can halt your entire development pipeline. This guide shows how to back up and restore Jenkins on RHEL, including all configurations, jobs, and plugin data.

## What to Back Up

The Jenkins home directory (default: `/var/lib/jenkins`) contains everything:
- Job configurations and build history
- Plugin configurations
- Credentials and secrets
- System configuration

## Create a Backup Script

```bash
#!/bin/bash
# backup-jenkins.sh - Back up Jenkins home directory

JENKINS_HOME="/var/lib/jenkins"
BACKUP_DIR="/opt/jenkins-backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/jenkins-backup-$DATE.tar.gz"

# Create backup directory if it does not exist
mkdir -p "$BACKUP_DIR"

# Stop Jenkins to ensure consistent backup
sudo systemctl stop jenkins

# Create compressed archive, excluding workspace and build artifacts
tar czf "$BACKUP_FILE" \
  --exclude="$JENKINS_HOME/workspace" \
  --exclude="$JENKINS_HOME/.cache" \
  --exclude="$JENKINS_HOME/caches" \
  -C "$(dirname $JENKINS_HOME)" \
  "$(basename $JENKINS_HOME)"

# Start Jenkins again
sudo systemctl start jenkins

# Remove backups older than 30 days
find "$BACKUP_DIR" -name "jenkins-backup-*.tar.gz" -mtime +30 -delete

echo "Backup created: $BACKUP_FILE"
echo "Size: $(du -h $BACKUP_FILE | cut -f1)"
```

Make it executable and schedule it:

```bash
# Make the script executable
chmod +x /opt/backup-jenkins.sh

# Schedule a daily backup at 2 AM via cron
sudo crontab -e
# Add this line:
# 0 2 * * * /opt/backup-jenkins.sh >> /var/log/jenkins-backup.log 2>&1
```

## Back Up Without Stopping Jenkins

If downtime is not acceptable, use the ThinBackup plugin:

1. Install ThinBackup from Manage Jenkins > Plugins
2. Configure at Manage Jenkins > ThinBackup > Settings
3. Set the backup directory and schedule
4. ThinBackup handles incremental and full backups while Jenkins runs

## Restore Jenkins from Backup

```bash
# Stop Jenkins
sudo systemctl stop jenkins

# Remove (or rename) the current Jenkins home
sudo mv /var/lib/jenkins /var/lib/jenkins.old

# Extract the backup
sudo tar xzf /opt/jenkins-backups/jenkins-backup-20260301_020000.tar.gz -C /var/lib/

# Ensure ownership is correct
sudo chown -R jenkins:jenkins /var/lib/jenkins

# Start Jenkins
sudo systemctl start jenkins

# Verify Jenkins is running
sudo systemctl status jenkins
```

## Verify the Restoration

After Jenkins starts, check:
- All jobs are present and configured correctly
- Credentials are intact (test a build that uses them)
- Plugins are loaded (check Manage Jenkins > Plugins > Installed)

For production environments, test your restore procedure regularly. A backup you have never tested is not a backup you can trust.
