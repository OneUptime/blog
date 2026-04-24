# How to Export and Import Portainer Configuration - Config

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Backup, Export, Import, Configuration, Migration

Description: A comprehensive guide to exporting and importing Portainer configuration for backups, migrations, and environment cloning.

## Overview

Portainer stores its configuration in the `/data` volume, centered around a BoltDB database (`portainer.db`, or `portainer.edb` when database encryption is enabled) along with stack files, certificates, and related assets. Exporting this configuration allows you to back up your setup, migrate to a new server, or clone environments. This guide covers all methods for exporting and importing Portainer configuration.

## Prerequisites

- Portainer CE or Business Edition
- Docker access to the Portainer container
- Admin credentials
- `curl` and `jq` installed for API-based exports and imports

## Understanding Portainer's Data Storage

```text
portainer_data volume commonly contains:
├── portainer.db or portainer.edb  # BoltDB database
├── compose/                       # Stack files managed by Portainer
├── certs/                         # Portainer SSL certificates
│   ├── cert.pem
│   └── key.pem
├── chisel/                        # Edge tunnel private key
│   └── private-key.pem
└── tls/                           # Environment TLS material
```

If database encryption is enabled, you must also preserve the same secret mounted at `/run/secrets/portainer` when restoring the instance.

## Method 1: Export via Docker Volume (CE and BE)

```bash
# Stop Portainer for consistent backup

docker stop portainer

# Export the entire data volume
docker run --rm \
  -v portainer_data:/data \
  -v $(pwd):/backup \
  alpine \
  tar czf /backup/portainer-config-$(date +%Y%m%d).tar.gz -C /data .

# Restart Portainer
docker start portainer

# Verify the export
ls -lh portainer-config-*.tar.gz
tar tzf portainer-config-$(date +%Y%m%d).tar.gz
```

## Method 2: Export via Portainer API (CE and BE)

```bash
PORTAINER_URL="https://portainer.example.com:9443"
API_KEY="your-api-key"

# Export configuration
curl -X POST \
  "${PORTAINER_URL}/api/backup" \
  -H "X-API-KEY: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"Password": "ExportPassword123"}' \
  --output portainer-export-$(date +%Y%m%d).tar.gz

echo "Export complete: $(ls -lh portainer-export-*.tar.gz)"
```

## Method 3: Export Specific Configuration Components

### Export Stacks

```bash
# List all stacks via API
curl -s -H "X-API-KEY: ${API_KEY}" \
  "${PORTAINER_URL}/api/stacks" | jq -r '.[].Name'

# Export a specific stack's compose file
STACK_ID=1
curl -s -H "X-API-KEY: ${API_KEY}" \
  "${PORTAINER_URL}/api/stacks/${STACK_ID}/file" \
  | jq -r '.StackFileContent' > stack-${STACK_ID}-compose.yml
```

### Export Endpoints/Environments

```bash
# Export environment list
curl -s -H "X-API-KEY: ${API_KEY}" \
  "${PORTAINER_URL}/api/endpoints" \
  | jq '[.[] | {Id, Name, URL, Type, PublicURL}]' \
  > portainer-endpoints.json
```

## Method 4: Import Configuration on New Instance

```bash
# Stop and remove Portainer on the new server if it is already running
docker rm -f portainer 2>/dev/null || true

# Restore the volume from backup
docker run --rm \
  -v portainer_data_new:/data \
  -v $(pwd):/backup \
  alpine \
  sh -c "cd /data && tar xzf /backup/portainer-config-20260320.tar.gz"

# Start Portainer with the restored volume
# Use the matching CE or BE image for the instance you are restoring.
PORTAINER_IMAGE="portainer/portainer-ce:sts"  # Use portainer/portainer-ee:sts for BE

# If database encryption is enabled, also mount the same secret file at /run/secrets/portainer.
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data_new:/data \
  ${PORTAINER_IMAGE}
```

## Method 5: Import Backup via Portainer API

```bash
# Restore must be run against a fresh Portainer instance before initial setup
BACKUP_FILE="portainer-export-20260320.tar.gz"

od -An -v -t u1 "${BACKUP_FILE}" \
  | tr -s '[:space:]' '\n' \
  | sed '/^$/d' \
  | jq -Rsc 'split("\n") | map(select(length > 0) | tonumber)' \
  > file-content.json

jq -n \
  --arg fileName "$(basename "${BACKUP_FILE}")" \
  --arg password "ExportPassword123" \
  --slurpfile fileContent file-content.json \
  '{FileName: $fileName, FileContent: $fileContent[0], Password: $password}' \
  > restore-payload.json

curl -X POST \
  "${PORTAINER_URL}/api/restore" \
  -H "Content-Type: application/json" \
  --data @restore-payload.json
```

## Configuration Export Checklist

| Component | Included in Volume Backup | Included in API Backup |
|---|---|---|
| Users and teams | Yes | Yes |
| Environments/endpoints | Yes | Yes |
| Stacks | Yes | Yes |
| Registries | Yes | Yes |
| Access controls | Yes | Yes |
| TLS certificates | Yes | Yes |
| Settings | Yes | Yes |
| Container data | No | No |

## Automating Exports

```bash
#!/bin/bash
# /usr/local/bin/portainer-export.sh
BACKUP_DIR="/opt/portainer-backups"
RETENTION_DAYS=30

mkdir -p "${BACKUP_DIR}"

docker stop portainer

docker run --rm \
  -v portainer_data:/data \
  -v "${BACKUP_DIR}":/backup \
  alpine \
  tar czf /backup/portainer-$(date +%Y%m%d-%H%M%S).tar.gz -C /data .

docker start portainer

# Remove old backups
find "${BACKUP_DIR}" -name "portainer-*.tar.gz" \
  -mtime +${RETENTION_DAYS} -delete

echo "Export complete: $(ls -lh ${BACKUP_DIR}/portainer-*.tar.gz | tail -1)"
```

## Conclusion

Portainer configuration can be exported using volume-level backups or the native API backup, both of which are available in current CE and BE releases. Volume backups capture the full `/data` volume, including the Portainer database, stack files, and certificates. If database encryption is enabled, you must also preserve the external secret mounted at `/run/secrets/portainer`. Always test your import process in a staging environment before relying on it for production recovery. Storing exports off-site (S3, NFS) ensures availability even if the host fails.
