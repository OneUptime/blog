# How to Fix Slow Page Loading with Many Resources in Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Performance, Troubleshooting, Optimization

Description: Optimize Portainer's performance when managing large numbers of containers, stacks, volumes, and networks that cause slow page loading and UI timeouts.

## Introduction

Portainer's UI can become noticeably slow when managing environments with hundreds of containers, dozens of stacks, many volumes, and multiple environments. This often happens because Portainer has to process and render more resource and snapshot data as the number of managed objects grows. This guide explains how to reduce this overhead.

## Step 1: Measure Current Performance

```bash
# Check how long API calls take

curl -w "\nTime: %{time_total}s\n" -s \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:9000/api/endpoints/1/docker/containers/json -o /dev/null

# Check for slow snapshot collection
docker logs portainer 2>&1 | grep -i "snapshot\|slow\|timeout" | tail -20
```

## Step 2: Increase Snapshot Interval

Portainer takes environment snapshots periodically. The default interval is 5 minutes, so for large environments you can increase it further:

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
  --snapshot-interval=15m   # 15 minutes instead of the default 5 minutes
```

## Step 3: Clean Up Unused Resources

```bash
# Remove stopped containers (if you don't need them)
docker container prune

# Remove unused images (free up disk and reduce listing overhead)
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove unused networks
docker network prune

# Full cleanup
docker system prune -a --volumes

# After cleanup, Portainer pages load faster with fewer items to display
```

## Step 4: Remove Old Stacks

Stacks you no longer need still appear in Portainer's stack list:

1. Go to **Stacks** in Portainer
2. Identify stacks with **0 running containers**
3. Remove the stack if you no longer need it

## Step 5: Remove Inactive Environments

Remove environments that are permanently offline or no longer used:

1. Go to **Environments**
2. Identify environments that are:
   - Permanently offline
   - No longer in use
3. Remove them if they are no longer needed

## Step 6: Adjust Portainer's Resource Limits

Give Portainer more CPU to process requests faster:

```bash
docker stop portainer && docker rm portainer
# Give Portainer 2 CPU cores and 512 MB of memory
docker run -d \
  -p 9000:9000 \
  -p 9443:9443 \
  --name portainer \
  --restart=unless-stopped \
  --cpus="2.0" \
  --memory="512m" \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --snapshot-interval=15m
```

## Step 7: Use Portainer on SSD Storage

Portainer stores its configuration in BoltDB on the `/data` volume, so slower storage can increase database access time:

```bash
# Check storage type
lsblk -d -o NAME,ROTA  # ROTA=0 means non-rotational storage (typically SSD/NVMe), ROTA=1 means HDD

# Move portainer data to SSD if on HDD
docker stop portainer

# Move data to SSD path
docker run --rm \
  -v portainer_data:/source \
  -v /ssd/portainer:/dest \
  alpine cp -a /source/. /dest/

# Recreate with SSD path
docker run -d \
  -p 9000:9000 \
  -p 9443:9443 \
  --name portainer \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /ssd/portainer:/data \
  portainer/portainer-ce:latest
```

## Step 8: Compact the Portainer Database

Portainer can compact its BoltDB database on startup:

```bash
# Stop Portainer
docker stop portainer && docker rm portainer

# Start Portainer with database compaction enabled
docker run -d \
  -p 9000:9000 \
  -p 9443:9443 \
  --name portainer \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --compact-db
```

## Step 9: Filter Resources in the UI

Once the list is loaded, use Portainer's filtering features to work with smaller subsets of resources:

1. In the **Containers** list, use the search bar to filter
2. Use available filters to focus on running containers or a specific stack
3. In **Images**, search by image name

## Step 10: Use the Portainer API for Bulk Operations

For large environments, the API is more efficient than the UI:

```bash
# List containers efficiently via API
TOKEN=$(curl -s -X POST http://localhost:9000/api/auth \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"yourpassword"}' | jq -r .jwt)

# Filtered container list (only running)
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:9000/api/endpoints/1/docker/containers/json?filters=%7B%22status%22%3A%5B%22running%22%5D%7D" | \
  jq '.[].Names'
```

## Conclusion

Portainer slowness with many resources is primarily a data volume issue - the more containers, stacks, and environments Portainer manages, the more data it needs to process and render. The most impactful fixes are: increasing the snapshot interval beyond the default 5 minutes for large environments, cleaning up unused resources (containers, images, volumes), compacting the BoltDB database, and ensuring Portainer runs on fast storage. For very large deployments, re-measure API response times after each change to confirm which adjustment had the biggest effect.
