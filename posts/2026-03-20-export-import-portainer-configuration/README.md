# How to Export and Import Portainer Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Configuration, Export, Import, Migration

Description: Learn how to export Portainer configuration for migration or backup purposes and import it into a new Portainer instance.

---

Exporting and importing Portainer configuration is useful when migrating to new hardware, cloning Portainer setups, or setting up disaster recovery. Portainer provides UI and API options for this purpose, and you can also archive the `/data` volume directly when you want a raw filesystem-level backup.

## Export Configuration

### Via the UI

1. Log in as an administrator
2. Navigate to **Settings**
3. Scroll to the **Back up Portainer** section
4. Optionally set an encryption password
5. Click **Download backup**
6. Save the downloaded `.tar.gz` file

### Via the API

```bash
# Authenticate and get JWT token

TOKEN=$(curl -s -X POST \
  https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Export the full Portainer configuration
curl -X POST \
  https://localhost:9443/api/backup \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"Password":"export-encryption-key"}' \
  --output portainer_export_$(date +%Y%m%d).tar.gz \
  --insecure

echo "Export saved to: portainer_export_$(date +%Y%m%d).tar.gz"
```

## Export Configuration (Manual Volume Backup Alternative)

If you want a raw backup of the Portainer data volume, archive the volume directly:

```bash
# Stop Portainer for a consistent export
docker stop portainer

# Export the entire data volume
docker run --rm \
  -v portainer_data:/data \
  -v "$(pwd)":/export \
  alpine \
  tar czf /export/portainer_ce_export_$(date +%Y%m%d).tar.gz -C /data .

# Restart
docker start portainer

echo "Portainer volume export complete"
```

## Import Configuration

### Via the UI

1. Deploy a fresh Portainer instance with an empty data volume
2. Open the initial setup page
3. Expand **Restore Portainer from backup**
4. Click **Select file** and choose the backup `.tar.gz` file
5. Enter the decryption password if the export was encrypted
6. Click **Restore Portainer**

### Via the API

```bash
# On a fresh Portainer instance with an empty data volume, build the restore payload
python3 - <<'PY' > restore_payload.json
import json
from pathlib import Path
import sys

backup_path = Path("portainer_export_20260320.tar.gz")
json.dump(
    {
        "FileContent": list(backup_path.read_bytes()),
        "FileName": backup_path.name,
        "Password": "export-encryption-key",
    },
    sys.stdout,
)
PY

# Import configuration on the target Portainer instance
curl -X POST \
  https://localhost:9443/api/restore \
  -H "Content-Type: application/json" \
  --data @restore_payload.json \
  --insecure
```

## Import Configuration (Manual Volume Restore Alternative)

```bash
# On the new server, create the volume and restore the archived data
docker volume create portainer_data

docker run --rm \
  -v portainer_data:/data \
  -v "$(pwd)":/import \
  alpine \
  tar xzf /import/portainer_ce_export_20260320.tar.gz -C /data

# Start Portainer with the restored data
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts
```

## What Is and Isn't Exported

| Exported | Not Exported |
|----------|-------------|
| Users, roles, teams, and API keys | Containers, images, or volumes |
| Environments, environment groups, and access controls | Application data stored in volumes or bind mounts |
| Stack definitions, schedules, and webhooks | Docker or Kubernetes configuration outside Portainer's database |
| Registry definitions, Git credentials, and custom templates | |
| Settings, SSL certificates, and snapshot metadata | |

---

*Protect your Portainer deployment with proactive monitoring from [OneUptime](https://oneuptime.com).*
