# How to Deploy Duplicati for Backup Management via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Duplicati, Backup, Docker, Storage, DevOps

Description: Deploy Duplicati as a Docker container via Portainer to schedule and manage encrypted, incremental backups of your data to cloud storage or remote destinations.

---

Duplicati is an open-source backup client that runs scheduled, encrypted, incremental backups to a wide range of destinations including S3, Backblaze B2, Google Drive, SFTP, and WebDAV. Running it as a Docker container via Portainer makes it easy to manage, monitor, and reconfigure without touching the host system.

## Step 1: Deploy Duplicati via Portainer Stack

In Portainer, go to **Stacks > Add Stack** and paste the following:

```yaml
# duplicati-stack.yml

version: "3.8"

services:
  duplicati:
    image: linuxserver/duplicati:latest
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=UTC
    ports:
      - "8200:8200"   # Duplicati Web UI
    volumes:
      # Persistent config storage
      - duplicati-config:/config
      # Source data to back up - adjust to your actual data paths
      - /opt/appdata:/source:ro
      # Local backup destination (optional - only needed if backing up to a local directory)
      - /opt/duplicati-backups:/backups
    restart: unless-stopped

volumes:
  duplicati-config:
```

## Step 2: Access the Duplicati Web UI

Once deployed, open `http://<host>:8200` in your browser. The first run prompts you to set a password for the web interface.

## Step 3: Create a Backup Job

From the Duplicati UI, click **Add backup**:

1. Choose a destination (example: S3-compatible storage):

```text
Storage Type: S3 Compatible
Server: s3.amazonaws.com
Bucket: my-backups-bucket
Folder: portainer-data
Access Key ID: <your-key>
Secret Access Key: <your-secret>
```

2. Set the source folder to `/source` (mapped to your host data).

3. Configure an encryption passphrase. Duplicati uses AES-256 by default.

4. Set a schedule - daily at 02:00 is a common starting point.

## Step 4: Use Environment Variables for Secrets

Avoid hardcoding credentials in the UI by using Portainer's environment variable editor:

```yaml
# Add to the duplicati service environment
environment:
  - PUID=1000
  - PGID=1000
  - TZ=UTC
  - DUPLICATI__WEBSERVICE_PASSWORD=your-ui-password
```

Pass S3 credentials as Duplicati advanced options or use an IAM instance role instead of static keys.

## Step 5: Verify and Test Restores

After the first backup completes, always test a restore:

1. Go to **Restore** in the Duplicati UI
2. Select the backup job
3. Choose a file or directory to restore
4. Verify the restored content matches the source

Testing restores is the most important step - a backup you have never restored is not a backup.

## Monitoring with Portainer

Use Portainer's **Container Logs** view to watch Duplicati's activity log. For automated alerting, configure Duplicati's **Send HTTP report** option to POST results to a webhook (Slack, PagerDuty, OneUptime, etc.):

```text
Report URL: https://your-alert-endpoint/webhook
Report level: Warning, Error
```

## Summary

Duplicati via Portainer gives you a fully managed, encrypted backup solution without additional infrastructure. Schedule jobs through the web UI, store encrypted data in any cloud provider, and monitor results through Portainer's logs interface.
