# How to Fix Large DockerSnapshotRaw Payloads Slowing Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Troubleshooting, Performance, Snapshot, BoltDB, Optimization

Description: Learn how to reduce oversized DockerSnapshotRaw payloads in the Portainer database that cause slow UI rendering and high memory usage during snapshot processing.

---

Portainer stores a full snapshot of each Docker environment in its BoltDB database, including all container and image metadata. When this snapshot grows very large (hundreds of containers or images with verbose labels), it causes high memory usage and slow UI rendering.

## What is DockerSnapshotRaw?

`DockerSnapshotRaw` is the raw snapshot data stored in the Portainer database for each Docker environment. It includes data fetched from Docker APIs such as:
- `GET /containers/json?all=1`
- `GET /images/json`
- `GET /networks`
- `GET /volumes`
- `GET /info`
- `GET /version`

## Step 1: Measure Snapshot Size

```bash
# Check the Portainer database size

docker run --rm -v portainer_data:/data alpine ls -lh /data/portainer.db

# For more detail, use the bbolt CLI to inspect database stats
docker run --rm -v portainer_data:/data golang:1.24-alpine \
  sh -lc 'go run go.etcd.io/bbolt/cmd/bbolt@latest stats /data/portainer.db'
```

## Step 2: Remove Unused Docker Resources

The fastest way to shrink snapshots is to remove unused resources from Docker:

```bash
# Remove unused resources in one command
# WARNING: review what this will delete first
docker system df            # See what can be freed
docker system prune -af     # Remove unused containers, networks, images, and build cache
# Add --volumes if you also want to prune anonymous volumes
```

## Step 3: Limit Container Labels

Verbose container labels inflate snapshot size. Review labels in your Compose files:

```yaml
services:
  app:
    image: myapp
    labels:
      # Only include labels that serve a purpose
      # Remove verbose metadata labels that are not needed by Portainer
      com.example.version: "1.0"
      # Avoid large multi-line labels (e.g., embedded JSON configuration)
```

## Step 4: Increase Snapshot Interval

More frequent snapshots mean more frequent large writes to BoltDB. Portainer's default is `5m`, so use a higher value if you want fewer writes:

```bash
# Increase to 10-minute intervals to reduce write frequency
IMAGE=$(docker inspect -f '{{.Config.Image}}' portainer)
docker stop portainer
docker rm portainer
docker run -d -p 9443:9443 -p 8000:8000 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  "$IMAGE" \
  --snapshot-interval 10m
```

## Step 5: Compact the Database

Database compaction happens on startup. After cleaning up resources, restart Portainer with `--compact-db` to reclaim space:

```bash
IMAGE=$(docker inspect -f '{{.Config.Image}}' portainer)
docker stop portainer
docker rm portainer
docker run -d -p 9443:9443 -p 8000:8000 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  "$IMAGE" \
  --compact-db
```

## Step 6: Use the --hide-label Flag for UI Filtering

Hide containers with specific labels from Portainer's UI. This does not reduce `DockerSnapshotRaw`, but it can make large environments easier to browse:

```bash
# Start Portainer hiding containers with the "hide=true" label
IMAGE=$(docker inspect -f '{{.Config.Image}}' portainer)
docker stop portainer
docker rm portainer
docker run -d -p 9443:9443 -p 8000:8000 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  "$IMAGE" \
  --hide-label hide=true
```

Then add `hide=true` as a label to non-essential containers that do not need Portainer management.
