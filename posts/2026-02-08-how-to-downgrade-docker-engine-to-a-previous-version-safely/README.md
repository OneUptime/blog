# How to Downgrade Docker Engine to a Previous Version Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Downgrade, Version Management, Linux, DevOps, Containers, Troubleshooting, Rollback

Description: How to safely downgrade Docker Engine to a previous version on Linux when an update introduces breaking changes, bugs, or compatibility issues.

---

Sometimes a Docker update breaks things. A new version might introduce a bug that affects your workloads, change behavior that your automation depends on, or conflict with other tools in your stack. When that happens, you need to roll back to a previous version. Downgrading Docker is not difficult, but doing it without losing your data requires careful steps. This guide covers the safe downgrade process for Ubuntu/Debian and CentOS/RHEL-based distributions.

## When to Downgrade

Common reasons for downgrading Docker:

- A new release introduces a regression that affects your containers
- Kubernetes or another orchestrator requires a specific Docker version
- A breaking change in the Docker API affects your CI/CD pipeline
- Storage driver changes cause data incompatibility
- A new version has a known security vulnerability (rare, but it happens)

## Before You Downgrade

### Document Your Current Version

```bash
# Record your current Docker version
docker version
docker info | grep "Server Version"
```

Write down the exact version string. You will need it if you want to upgrade back later.

### Check Data Compatibility

Docker occasionally changes internal data formats between major versions. Downgrading across major version boundaries (for example, from 27.x to 25.x) can cause data loss.

```bash
# Check the storage driver and data directory
docker info | grep -E "Storage Driver|Docker Root Dir"
```

### Back Up Docker Data

Always back up before a downgrade.

```bash
# Back up the entire Docker data directory
sudo systemctl stop docker
sudo cp -a /var/lib/docker /var/lib/docker.backup
sudo systemctl start docker
```

For individual volumes:

```bash
# Export specific volumes
docker run --rm -v my-volume:/data -v /tmp/backups:/backup alpine \
  tar czf /backup/my-volume.tar.gz -C /data .
```

### Export Running Container Configurations

Save your container configurations so you can recreate them after the downgrade.

```bash
# Save the inspect output for all running containers
for c in $(docker ps -q); do
  name=$(docker inspect --format '{{.Name}}' $c | sed 's/\///')
  docker inspect $c > "/tmp/${name}-inspect.json"
done
```

If you use Docker Compose, your `docker-compose.yml` files already serve as the configuration record.

## Downgrading on Ubuntu / Debian

### Step 1: List Available Versions

```bash
# List all available Docker CE versions in the repository
apt-cache madison docker-ce
```

This shows output like:

```
 docker-ce | 5:27.5.1-1~ubuntu.24.04~noble | https://download.docker.com/linux/ubuntu noble/stable amd64 Packages
 docker-ce | 5:27.4.1-1~ubuntu.24.04~noble | https://download.docker.com/linux/ubuntu noble/stable amd64 Packages
 docker-ce | 5:27.3.1-1~ubuntu.24.04~noble | https://download.docker.com/linux/ubuntu noble/stable amd64 Packages
 docker-ce | 5:26.1.4-1~ubuntu.24.04~noble | https://download.docker.com/linux/ubuntu noble/stable amd64 Packages
```

Pick the version you want to downgrade to.

### Step 2: Stop Docker

```bash
# Stop all running containers gracefully
docker stop $(docker ps -q)

# Stop the Docker daemon
sudo systemctl stop docker
sudo systemctl stop docker.socket
sudo systemctl stop containerd
```

### Step 3: Install the Target Version

```bash
# Set the target version (adjust to match the version string from apt-cache madison)
TARGET_VERSION="5:27.3.1-1~ubuntu.24.04~noble"

# Install the specific version of Docker CE and CLI
sudo apt-get install -y --allow-downgrades \
  docker-ce=$TARGET_VERSION \
  docker-ce-cli=$TARGET_VERSION \
  containerd.io
```

The `--allow-downgrades` flag tells apt it is okay to install an older version than what is currently installed.

### Step 4: Start Docker

```bash
# Start Docker with the downgraded version
sudo systemctl start docker
```

### Step 5: Verify the Downgrade

```bash
# Confirm the version
docker version

# Check that containers and images are intact
docker images
docker ps -a
```

### Step 6: Pin the Version

Prevent apt from automatically upgrading Docker back to the problematic version.

```bash
# Hold Docker packages at the current version
sudo apt-mark hold docker-ce docker-ce-cli containerd.io
```

To check which packages are held:

```bash
# List held packages
apt-mark showhold
```

When you are ready to upgrade again, unhold the packages.

```bash
# Remove the hold
sudo apt-mark unhold docker-ce docker-ce-cli containerd.io
```

## Downgrading on CentOS / RHEL / Rocky Linux / Fedora

### Step 1: List Available Versions

```bash
# List available Docker CE versions
dnf list docker-ce --showduplicates | sort -r
```

### Step 2: Stop Docker

```bash
# Stop containers and the daemon
docker stop $(docker ps -q)
sudo systemctl stop docker
sudo systemctl stop docker.socket
sudo systemctl stop containerd
```

### Step 3: Downgrade the Packages

```bash
# Set the target version
TARGET_VERSION="27.3.1"

# Downgrade Docker
sudo dnf downgrade -y docker-ce-3:${TARGET_VERSION}-1.el9 docker-ce-cli-1:${TARGET_VERSION}-1.el9
```

If `dnf downgrade` does not work (some versions skip the downgrade path), remove and reinstall.

```bash
# Alternative: remove and reinstall a specific version
sudo dnf remove -y docker-ce docker-ce-cli
sudo dnf install -y docker-ce-3:${TARGET_VERSION}-1.el9 docker-ce-cli-1:${TARGET_VERSION}-1.el9 containerd.io
```

### Step 4: Start and Verify

```bash
# Start Docker
sudo systemctl start docker

# Verify the version
docker version
```

### Step 5: Lock the Version

```bash
# Install the versionlock plugin if not present
sudo dnf install -y python3-dnf-plugin-versionlock

# Lock Docker packages
sudo dnf versionlock add docker-ce docker-ce-cli containerd.io
```

To unlock later:

```bash
# Remove version locks
sudo dnf versionlock delete docker-ce docker-ce-cli containerd.io
```

## Handling Data Compatibility Issues

### Storage Driver Mismatch

If the older Docker version does not support the storage driver used by the newer version, Docker will fail to start. Check the logs.

```bash
# Check Docker logs for storage driver errors
sudo journalctl -u docker --no-pager -n 30
```

If you see storage driver errors, you have two options:

1. **Change the storage driver** in `/etc/docker/daemon.json` to one supported by the older version. This means losing existing images and containers (they stay on disk but become inaccessible).

2. **Restore from backup** if you backed up `/var/lib/docker` before the original upgrade.

```bash
# Restore Docker data from backup
sudo systemctl stop docker
sudo rm -rf /var/lib/docker
sudo mv /var/lib/docker.backup /var/lib/docker
sudo systemctl start docker
```

### Database Migration Issues

Docker uses an internal database for tracking containers, images, and layers. Some version transitions modify this database schema. If a newer version migrated the database forward, the older version may not be able to read it.

```bash
# If Docker fails to start due to database issues, start fresh
sudo systemctl stop docker
sudo rm -rf /var/lib/docker
sudo systemctl start docker

# Then reimport your images
docker load -i my-images-backup.tar
```

This is why backing up before any upgrade is critical.

## Testing After Downgrade

After downgrading, verify that your workloads function correctly.

```bash
# Start your containers
docker compose up -d

# Check container health
docker ps
docker compose ps

# Run your integration tests if applicable
docker exec my-app npm test

# Check Docker networking
docker network ls
docker exec my-app ping -c 3 my-database

# Verify volume mounts
docker exec my-app ls -la /data
```

## Setting Up Version Alerts

To avoid surprise upgrades in the future, set up notifications for Docker version changes.

```bash
# Create a simple version check script
cat <<'SCRIPT' > /usr/local/bin/docker-version-check.sh
#!/bin/bash
EXPECTED="27.3.1"
CURRENT=$(docker version --format '{{.Server.Version}}')
if [ "$CURRENT" != "$EXPECTED" ]; then
  echo "WARNING: Docker version changed from $EXPECTED to $CURRENT" | \
    mail -s "Docker Version Change Alert" admin@example.com
fi
SCRIPT

chmod +x /usr/local/bin/docker-version-check.sh

# Run it daily via cron
(crontab -l 2>/dev/null; echo "0 8 * * * /usr/local/bin/docker-version-check.sh") | crontab -
```

## Automating Rollback with Snapshots

If you use LVM or ZFS, take a filesystem snapshot before upgrading Docker. This gives you an instant rollback path.

```bash
# LVM snapshot before upgrade
sudo lvcreate --size 10G --snapshot --name docker-snap /dev/vg0/docker

# If the upgrade goes wrong, restore the snapshot
sudo lvconvert --merge /dev/vg0/docker-snap
sudo reboot
```

For ZFS:

```bash
# ZFS snapshot before upgrade
sudo zfs snapshot rpool/var/lib/docker@pre-upgrade

# Rollback if needed
sudo systemctl stop docker
sudo zfs rollback rpool/var/lib/docker@pre-upgrade
sudo systemctl start docker
```

## Summary

Downgrading Docker is a straightforward process: stop the daemon, install the older version with `--allow-downgrades` (apt) or `dnf downgrade`, and restart. The critical step that most guides skip is data backup. Docker's internal data format can change between versions, and a downgrade without backup risks making your images and volumes inaccessible. Always back up `/var/lib/docker` before upgrading, and pin your Docker version to prevent automatic upgrades from surprising you.
