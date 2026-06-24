# How to Fix Large DockerSnapshotRaw Payloads Slowing Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Performance, Troubleshooting, Database Optimization

Description: Reduce oversized DockerSnapshotRaw payloads stored in Portainer's database that cause slow API responses, large database files, and UI performance degradation.

## Introduction

Portainer stores Docker environment snapshots in its BoltDB database, including a `DockerSnapshotRaw` payload. In environments with many containers, networks, volumes, and images, these snapshots can become very large - sometimes hundreds of megabytes - causing large database files and UI sluggishness. This guide explains how to manage and reduce these payloads.

## What Is DockerSnapshotRaw?

Every time Portainer takes a snapshot of a Docker environment, it serializes Docker snapshot data including containers, images, volumes, networks, engine info, and version data, then stores it in BoltDB. The more resources you have, the larger this payload becomes.

## Step 1: Identify the Database Size

```bash
# Check the size of Portainer's database

docker run --rm \
  -v portainer_data:/data \
  alpine ls -lh /data/portainer.db

# Check total volume size
docker volume inspect portainer_data
MOUNTPOINT=$(docker volume inspect portainer_data --format '{{.Mountpoint}}')
du -sh $MOUNTPOINT
```

## Step 2: Check Snapshot Metadata via API

```bash
PORTAINER_URL=https://localhost:9443
TOKEN=$(curl -sk -X POST "$PORTAINER_URL/api/auth" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' | jq -r .jwt)

# Portainer's public API does not return DockerSnapshotRaw directly,
# but these counts usually track the biggest drivers of snapshot growth.
curl -sk -H "Authorization: Bearer $TOKEN" \
  "$PORTAINER_URL/api/docker/1/dashboard" | \
  jq '{containers: .containers.total, images: .images.total, volumes: .volumes, networks: .networks, services: .services, stacks: .stacks}'

# Higher counts here usually mean larger snapshot payloads
```

## Step 3: Increase Snapshot Interval

Reducing snapshot frequency means Portainer refreshes large payloads less often:

```bash
docker stop portainer && docker rm portainer
docker run -d \
  -p 9000:9000 \
  -p 9443:9443 \
  --name portainer \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --snapshot-interval=10m   # 10 minutes - reduces snapshot workload and writes
```

## Step 4: Compact the Database

BoltDB doesn't reclaim free pages automatically. Compact it regularly:

```bash
# Stop Portainer
docker stop portainer && docker rm portainer

# Restart Portainer with compaction enabled on startup
docker run -d \
  -p 9000:9000 \
  -p 9443:9443 \
  --name portainer \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --snapshot-interval=10m \
  --compact-db

# Check size before/after
docker run --rm \
  -v portainer_data:/data \
  alpine ls -lh /data/portainer.db
```

## Step 5: Clean Up Docker Resources

The snapshot size is largely driven by the number of resources Docker has. Cleaning up reduces payload size:

```bash
# Remove all stopped containers
docker container prune -f

# Remove unused images (saves snapshot size significantly)
docker image prune -a -f

# Remove unused volumes
docker volume prune -f

# Remove unused networks
docker network prune -f

# Check how much space was freed
docker system df
```

## Step 6: Remove Old Image Versions

Old, untagged images are included in snapshots:

```bash
# List dangling images (untagged)
docker images -f "dangling=true"

# Remove dangling images safely
docker image prune -f

# Check total image count
docker images | wc -l
```

## Step 7: Remove Unnecessary Environments

Each additional environment has its own stored snapshot payload:

```bash
# Check how many environments Portainer is managing
PORTAINER_URL=https://localhost:9443
TOKEN=$(curl -sk -X POST "$PORTAINER_URL/api/auth" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' | jq -r .jwt)

curl -sk -H "Authorization: Bearer $TOKEN" \
  "$PORTAINER_URL/api/endpoints" | jq 'length'

# List all environments with their current status
curl -sk -H "Authorization: Bearer $TOKEN" \
  "$PORTAINER_URL/api/endpoints" | \
  jq '.[] | {id: .Id, name: .Name, status: .Status}'

# Remove stale/unused environments via UI or API
curl -sk -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  "$PORTAINER_URL/api/endpoints/ENDPOINT_ID"
```

## Step 8: Schedule Regular Cleanup

```bash
#!/bin/bash
# portainer-maintenance.sh
# Schedule with: 0 2 * * 0  (every Sunday at 2 AM)

echo "$(date): Starting Portainer maintenance"

# Clean Docker resources to reduce snapshot size
docker container prune -f
docker image prune -f
docker volume prune -f
docker network prune -f

echo "$(date): Docker cleanup complete"
echo "$(date): Current Docker disk usage:"
docker system df

# Compact Portainer database on restart
echo "$(date): Restarting Portainer with database compaction..."
docker stop portainer && docker rm portainer
sleep 5

docker run -d \
  -p 9000:9000 \
  -p 9443:9443 \
  --name portainer \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --snapshot-interval=10m \
  --compact-db

echo "$(date): Maintenance complete"
```

## Step 9: Use the Portainer Agent Instead of the Direct Docker API

If you are using the legacy Docker API connection method on a local network, you can use the Portainer Agent instead:

For internet-facing remote deployments, Portainer recommends the Edge Agent over the classic Agent.

This changes how Portainer connects to the environment, but snapshots are still stored in Portainer's database:

```bash
# Deploy the Agent on the Docker host
docker run -d \
  -p 9001:9001 \
  --name portainer-agent \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  portainer/agent:latest

# In Portainer, change the environment to use the Agent
# instead of the direct Docker API connection
# Go to: Environments → Edit → Environment URL: host:9001  (no protocol)
```

## Step 10: Monitor Snapshot Metadata Over Time

```bash
#!/bin/bash
# monitor-snapshot-metadata.sh
PORTAINER_URL=https://localhost:9443
TOKEN=$(curl -sk -X POST "$PORTAINER_URL/api/auth" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' | jq -r .jwt)

ENDPOINTS=$(curl -sk -H "Authorization: Bearer $TOKEN" \
  "$PORTAINER_URL/api/endpoints" | jq -r '.[].Id')

for EP in $ENDPOINTS; do
  EP_NAME=$(curl -sk -H "Authorization: Bearer $TOKEN" \
    "$PORTAINER_URL/api/endpoints/$EP" | jq -r '.Name')

  curl -sk -H "Authorization: Bearer $TOKEN" \
    "$PORTAINER_URL/api/docker/$EP/dashboard" | \
    jq -r --arg name "$EP_NAME" \
    '"Environment: \($name) | Containers: \(.containers.total) | Images: \(.images.total) | Volumes: \(.volumes) | Networks: \(.networks) | Services: \(.services) | Stacks: \(.stacks)"'
done
```

## Conclusion

Large `DockerSnapshotRaw` payloads are a natural consequence of managing large Docker environments in Portainer. The most impactful fixes are: increasing the snapshot interval to reduce snapshot churn, regularly cleaning unused Docker resources to reduce snapshot size, and running `--compact-db` on restart to reclaim BoltDB free pages. If you are using the legacy direct Docker API connection method, switching to the Portainer Agent or Edge Agent can help with connectivity, but it does not eliminate snapshot data stored in the database.
