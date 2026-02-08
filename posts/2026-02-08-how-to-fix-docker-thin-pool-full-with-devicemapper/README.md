# How to Fix Docker "Thin Pool Full" with devicemapper

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, devicemapper, thin pool, storage, disk space, troubleshooting, linux

Description: Fix Docker thin pool full errors when using the devicemapper storage driver by expanding pools, cleaning images, and migrating to overlay2.

---

If you are running Docker with the devicemapper storage driver, you have probably seen this error at some point: "devmapper: Thin Pool has X free data blocks which is less than minimum required." When the thin pool fills up, containers refuse to start, images refuse to pull, and even `docker ps` can become unresponsive. The devicemapper driver uses a fixed-size storage pool, and once that pool is exhausted, Docker grinds to a halt.

Here is how to recover from a full thin pool and prevent it from happening again.

## Understanding the Devicemapper Thin Pool

The devicemapper storage driver creates two block devices: a data pool and a metadata pool. All container layers, images, and writable container layers live inside the data pool. The metadata pool tracks which blocks belong to which layers.

Check your current thin pool status:

```bash
# View Docker's storage driver and data usage
docker info | grep -A 20 "Storage Driver"
```

You will see output like this when the pool is full or nearly full:

```
Storage Driver: devicemapper
 Pool Name: docker-thinpool
 Pool Blocksize: 524.3 kB
 Data Space Used: 95.8 GB
 Data Space Total: 100 GB
 Data Space Available: 4.2 GB
 Metadata Space Used: 45.2 MB
 Metadata Space Total: 1.07 GB
```

When "Data Space Available" drops to near zero, you are in trouble.

You can also check using `lvs`:

```bash
# Check logical volume status for the thin pool
sudo lvs -o+seg_monitor

# More detailed thin pool status
sudo lvs --noheadings -o data_percent,metadata_percent docker/thinpool
```

## Emergency Recovery: Free Up Space Immediately

When the thin pool is full, you need to free space before you can do anything else. Start by removing what you can.

```bash
# Remove all stopped containers
docker container prune -f

# Remove dangling images (untagged)
docker image prune -f

# Remove all unused images (not just dangling ones)
docker image prune -a -f

# Remove unused volumes
docker volume prune -f
```

If Docker commands are unresponsive because the pool is completely full, you may need to work at the LVM level:

```bash
# Check thin pool usage directly via LVM
sudo lvs docker/thinpool

# If Docker is completely stuck, try restarting the daemon first
sudo systemctl stop docker
sudo systemctl start docker
```

After restarting, try the prune commands again.

## Fix 1: Expand the Thin Pool

If you have free disk space on the volume group, extend the thin pool:

```bash
# Check available space in the volume group
sudo vgs

# Extend the data logical volume by 50GB
sudo lvextend -L +50G docker/thinpool

# Or extend to use all available space
sudo lvextend -l +100%FREE docker/thinpool
```

If you need to add a new physical disk to the volume group:

```bash
# Create a physical volume on the new disk
sudo pvcreate /dev/sdb

# Add it to the existing volume group
sudo vgextend docker /dev/sdb

# Now extend the thin pool
sudo lvextend -L +100G docker/thinpool
```

Verify the new size:

```bash
# Confirm the thin pool has been expanded
sudo lvs docker/thinpool
docker info | grep "Data Space"
```

## Fix 2: Configure Automatic Pool Extension

LVM supports automatic thin pool extension when usage reaches a threshold. This prevents the "pool full" scenario entirely.

Edit the LVM configuration:

```bash
# Edit LVM configuration for auto-extension
sudo nano /etc/lvm/lvm.conf
```

Find and modify the thin pool autoextend settings:

```
# In /etc/lvm/lvm.conf, under the activation section
activation {
    thin_pool_autoextend_threshold = 80
    thin_pool_autoextend_percent = 20
}
```

This tells LVM to automatically extend the thin pool by 20% whenever usage reaches 80%.

Enable the monitoring daemon:

```bash
# Ensure the LVM monitoring service is running
sudo systemctl enable lvm2-monitor
sudo systemctl start lvm2-monitor

# Verify monitoring is active
sudo lvs -o+seg_monitor
```

The `seg_monitor` column should show "monitored" for your thin pool.

## Fix 3: Set Up Thin Pool with Proper Initial Sizing

If you are setting up devicemapper from scratch, allocate the pool correctly from the start.

Create a properly sized thin pool:

```bash
# Create a volume group (assuming /dev/sdb is your Docker disk)
sudo pvcreate /dev/sdb
sudo vgcreate docker /dev/sdb

# Create the thin pool, using 95% for data and 1% for metadata
sudo lvcreate --wipesignatures y -n thinpool docker -l 95%VG
sudo lvcreate --wipesignatures y -n thinpoolmeta docker -l 1%VG

# Convert to a thin pool
sudo lvconvert -y --zero n \
  -c 512K \
  --thinpool docker/thinpool \
  --poolmetadata docker/thinpoolmeta
```

Create the LVM profile for auto-extension:

```bash
# Create a profile for the Docker thin pool
sudo nano /etc/lvm/profile/docker-thinpool.profile
```

```
# /etc/lvm/profile/docker-thinpool.profile
activation {
    thin_pool_autoextend_threshold=80
    thin_pool_autoextend_percent=20
}
```

Apply the profile:

```bash
# Apply the profile to the thin pool
sudo lvchange --metadataprofile docker-thinpool docker/thinpool

# Verify the profile is applied
sudo lvs -o+seg_monitor docker/thinpool
```

Configure Docker to use this thin pool:

```json
{
    "storage-driver": "devicemapper",
    "storage-opts": [
        "dm.thinpooldev=/dev/mapper/docker-thinpool",
        "dm.use_deferred_removal=true",
        "dm.use_deferred_deletion=true"
    ]
}
```

## Fix 4: Migrate to overlay2 (Recommended)

The devicemapper storage driver is deprecated and has been removed from newer Docker versions. The best long-term fix is migrating to overlay2, which does not use thin pools at all.

Check if your kernel supports overlay2:

```bash
# Check kernel version (overlay2 requires 4.0+)
uname -r

# Check if the overlay module is available
lsmod | grep overlay
```

Back up your data and migrate:

```bash
# Stop all containers
docker stop $(docker ps -aq)

# Export any important containers or save important images
docker save myimage:latest > myimage.tar

# Stop Docker
sudo systemctl stop docker

# Back up the Docker directory
sudo cp -a /var/lib/docker /var/lib/docker.bak

# Remove the old Docker data (this will delete all images and containers)
sudo rm -rf /var/lib/docker

# Update daemon.json to use overlay2
sudo nano /etc/docker/daemon.json
```

```json
{
    "storage-driver": "overlay2"
}
```

```bash
# Start Docker with the new storage driver
sudo systemctl start docker

# Verify the storage driver changed
docker info | grep "Storage Driver"

# Reload your saved images
docker load < myimage.tar
```

## Monitoring Thin Pool Usage

Set up monitoring to catch thin pool issues before they cause outages:

```bash
#!/bin/bash
# monitor-thinpool.sh - Alert when thin pool usage exceeds threshold

THRESHOLD=80
POOL_NAME="docker/thinpool"

# Get current data usage percentage
DATA_USAGE=$(sudo lvs --noheadings -o data_percent "$POOL_NAME" | tr -d ' ')

# Compare against threshold
if (( $(echo "$DATA_USAGE > $THRESHOLD" | bc -l) )); then
    echo "ALERT: Docker thin pool data usage is ${DATA_USAGE}% (threshold: ${THRESHOLD}%)"
    # Add your alerting mechanism here (email, webhook, etc.)
    exit 1
fi

echo "OK: Docker thin pool data usage is ${DATA_USAGE}%"
exit 0
```

Add this to crontab:

```bash
# Run thin pool check every 10 minutes
*/10 * * * * /usr/local/bin/monitor-thinpool.sh 2>&1 | logger -t docker-thinpool
```

## Summary

Docker's devicemapper thin pool fills up because it is a fixed-size block device that does not grow automatically by default. When it fills up, everything stops. The immediate fix is to prune unused images and containers, then expand the pool with `lvextend`. For prevention, enable auto-extension in LVM so the pool grows before it hits capacity. The best long-term solution is to migrate away from devicemapper entirely and switch to overlay2, which uses the regular filesystem and does not have thin pool limitations. If you must stay on devicemapper, always configure auto-extension and monitor usage proactively.
