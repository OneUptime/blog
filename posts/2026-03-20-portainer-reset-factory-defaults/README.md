# How to Reset Portainer to Factory Defaults

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Troubleshooting, Reset, Self-Hosted

Description: Completely reset Portainer to factory defaults by removing and recreating the data volume, returning it to a fresh installation state.

## Introduction

Sometimes the best solution is to start fresh - whether you've lost the admin password, the database is corrupt, you've inherited a misconfigured instance, or you simply want a clean slate. Resetting Portainer to factory defaults means removing its database and starting over. Your actual Docker containers and volumes are completely unaffected.

## Important: What Reset Does and Doesn't Affect

**RESET AFFECTS (will be lost):**
- Admin and all user accounts
- All environment/endpoint configurations
- Stack metadata (compose file content stored in Portainer)
- Registry credentials
- Teams and access control settings
- Custom templates
- Webhook configurations
- Notification history

**RESET DOES NOT AFFECT:**
- Running Docker containers
- Docker images
- Docker volumes (data)
- Docker networks
- Compose files stored on disk (if you have them backed up)
- The actual workloads - everything keeps running

## Step 1: Export Important Data First (Optional)

Before resetting, export what you want to preserve:

```bash
# Export stack compose files via API

TOKEN=$(curl -s -X POST http://localhost:9000/api/auth \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"yourpassword"}' | jq -r .jwt)

mkdir -p /opt/portainer-export

# Export each stack
for STACK_ID in $(curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:9000/api/stacks | jq -r '.[].Id'); do

  NAME=$(curl -s -H "Authorization: Bearer $TOKEN" \
    "http://localhost:9000/api/stacks/$STACK_ID" | jq -r '.Name')

  curl -s -H "Authorization: Bearer $TOKEN" \
    "http://localhost:9000/api/stacks/$STACK_ID/file" | \
    jq -r '.StackFileContent' > "/opt/portainer-export/$NAME.yml"

  echo "Exported: $NAME"
done
```

## Step 2: Create a Backup (Safety Net)

```bash
# Create a backup of the current database before resetting
docker stop portainer

docker run --rm \
  -v portainer_data:/data \
  -v /opt/portainer-backup:/backup \
  alpine tar czf "/backup/portainer-before-reset-$(date +%Y%m%d%H%M%S).tar.gz" \
    -C /data .

ls -la /opt/portainer-backup/
```

## Step 3: Stop and Remove Portainer Container

```bash
# Stop the running container
docker stop portainer

# Remove the container (data volume is NOT removed yet)
docker rm portainer

# Confirm it's removed
docker ps -a | grep portainer
```

## Step 4: Remove the Data Volume

```bash
# This is the reset step - removes all Portainer configuration
docker volume rm portainer_data

# Verify it's removed
docker volume ls | grep portainer
```

## Step 5: Recreate Portainer

```bash
# Fresh installation - Portainer will create a new empty database
docker run -d \
  -p 9000:9000 \
  -p 9443:9443 \
  --name portainer \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest

# Navigate to http://your-host:9000 WITHIN 5 MINUTES
# Create your admin account
```

## Step 6: Alternative - Reset Without Losing Volume

If you want to reset Portainer settings but keep the volume for a potential restore:

```bash
# Stop Portainer
docker stop portainer

# Remove only the database file
docker run --rm \
  -v portainer_data:/data \
  alpine rm /data/portainer.db

# Inspect the remaining data files
docker run --rm \
  -v portainer_data:/data \
  alpine ls -la /data/

# Start Portainer - it initializes a fresh database
docker start portainer
```

## Step 7: Reset with Pre-set Admin Password

Avoid the 5-minute initialization race:

```bash
# Stop and remove the existing container if present
docker stop portainer 2>/dev/null || true
docker rm portainer 2>/dev/null || true

# Generate a bcrypt hash for your password (use at least 12 characters)
HASH=$(docker run --rm httpd:2.4-alpine \
  htpasswd -nbB admin new-password-1234 | cut -d ':' -f 2)

# Remove old volume
docker volume rm portainer_data 2>/dev/null || true

# Start fresh with pre-configured admin password
docker run -d \
  -p 9000:9000 \
  -p 9443:9443 \
  --name portainer \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --admin-password="$HASH"

echo "Portainer reset complete. Admin password: new-password-1234"
```

## Step 8: Reset via Docker Compose

If using Docker Compose:

```yaml
# docker-compose.yml
services:
  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: unless-stopped
    ports:
      - "9000:9000"
      - "9443:9443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data

volumes:
  portainer_data:
```

```bash
# Reset via Compose
docker compose down -v    # -v removes volumes
docker compose up -d      # Recreates with fresh volume
```

## Step 9: Re-add Environments After Reset

After the reset, re-add your Docker environments:

1. Open Portainer at `http://your-host:9000`
2. Create admin account
3. The local Docker environment is added automatically
4. For remote environments: **Environments** → **Add Environment**
5. Deploy agents on remote hosts if needed

## Step 10: Re-import Stacks

If you exported stack files in Step 1:

```bash
# Re-import via Portainer UI:
# Stacks → Add Stack → Upload → select the .yml file

# Or via API
TOKEN=$(curl -s -X POST http://localhost:9000/api/auth \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"new-password-1234"}' | jq -r .jwt)

ENDPOINT_ID=$(curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:9000/api/endpoints | jq -r '.[0].Id')

for FILE in /opt/portainer-export/*.yml; do
  STACK_NAME=$(basename "$FILE" .yml)
  CONTENT=$(jq -Rs . < "$FILE")

  curl -s -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    "http://localhost:9000/api/stacks/create/standalone/string?endpointId=$ENDPOINT_ID" \
    -d "{\"Name\":\"$STACK_NAME\",\"StackFileContent\":$CONTENT}"

  echo "Re-imported: $STACK_NAME"
done
```

## Conclusion

Resetting Portainer to factory defaults is safe for your actual workloads - containers, volumes, and images are completely unaffected. The reset only removes Portainer's management database. The process is: stop the container, remove the data volume, and restart. To avoid the 5-minute initialization window in automated environments, use the `--admin-password` flag at startup.
