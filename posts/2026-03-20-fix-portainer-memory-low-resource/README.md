# How to Fix Portainer Memory Issues on Low-Resource Hosts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Troubleshooting, Memory, Docker, Performance, Low-Resource

Description: Learn how to diagnose and resolve Portainer memory issues on low-RAM hosts by adjusting snapshot intervals, container limits, and Go garbage collection settings.

---

Portainer's memory footprint can grow with the number of containers it monitors and how often it collects environment snapshots. On hosts with 512MB or 1GB RAM, that can trigger the OOM killer and crash the Portainer container.

## Diagnosing Memory Issues

```bash
# Check if Portainer was killed by OOM killer

sudo dmesg | grep -E "oom|killed" | grep -i portainer

# Check current Portainer memory usage
docker stats portainer --no-stream --format "{{.MemUsage}}"

# Check host free memory
free -m
```

## Reduce Snapshot Interval

Portainer's environment snapshots can be a significant source of background work. The default interval is 5 minutes. For low-resource hosts, increase it further if needed:

```bash
# Recreate Portainer with a longer snapshot interval (5 minutes)
docker stop portainer
docker rm portainer
docker run -d \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  -p 9000:9000 \
  portainer/portainer-ce:latest \
  --snapshot-interval 5m
```

## Set a Memory Limit

Prevent Portainer from consuming all available RAM by setting a container memory limit:

```yaml
# In your Portainer service definition (docker-compose or stack)
services:
  portainer:
    image: portainer/portainer-ce:latest
    deploy:
      resources:
        limits:
          memory: 256m    # Cap Portainer so it cannot consume all host RAM
        reservations:
          memory: 128m
```

## Tune Go Garbage Collection

Portainer is written in Go. The Go runtime can be configured to run GC more aggressively:

```bash
# Recreate Portainer with GOGC=50 to trigger GC more frequently (default is 100)
# Lower values = more CPU usage but lower peak memory
docker stop portainer
docker rm portainer
docker run -d \
  -e GOGC=50 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  -p 9000:9000 \
  portainer/portainer-ce:latest
```

## Disable Unused Features

If you do not use Edge agents, do not enable Edge Compute features:

```bash
# Do not pass --edge-compute when starting Portainer
# For existing deployments, remove the flag and restart
```

## Add Swap Space

As a last resort on very low-RAM hosts, add swap to prevent OOM kills:

```bash
# Create a 1GB swap file
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Swap is slow but prevents crashes on memory spikes during snapshot collection.
