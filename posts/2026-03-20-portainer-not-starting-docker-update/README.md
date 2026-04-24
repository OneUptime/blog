# How to Fix Portainer Not Starting After Docker Update

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Troubleshooting, Docker Update, Self-Hosted

Description: Diagnose and resolve Portainer startup failures that occur after updating Docker Engine, including socket permission changes and API version mismatches.

## Introduction

Updating Docker Engine is routine maintenance, but it can sometimes cause Portainer to stop working. The most common causes are Docker socket permission changes, API version incompatibilities, and changes to the Docker daemon configuration that affect Portainer's ability to connect.

## Step 1: Check Container and Logs

```bash
# Check if Portainer is running or has crashed

docker ps -a | grep portainer

# View the last 50 lines of Portainer logs
docker logs --tail=50 portainer

# Follow logs in real time to see startup errors
docker logs -f portainer
```

## Common Error Messages and Fixes

### Error: "permission denied while trying to connect to the Docker daemon socket"

```bash
# Check socket permissions
ls -la /var/run/docker.sock
# Should show: srw-rw---- 1 root docker ...

# Make sure Portainer is mounting the same socket Docker is actually using
docker stop portainer && docker rm portainer
docker run -d \
  -p 9000:9000 \
  -p 9443:9443 \
  --name portainer \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts
```

### Error: "Error response from daemon: client version X is too new"

This usually indicates a Portainer/Docker compatibility mismatch after upgrading or downgrading Docker:

```bash
# Check Docker daemon version and API range
docker version

# Portainer logs will show something like:
# Error response from daemon: client version 1.45 is too new.
# Maximum supported API version is 1.44

# Update Portainer to a release that supports your Docker version
docker pull portainer/portainer-ce:lts

docker stop portainer
docker rm portainer

docker run -d \
  -p 9000:9000 \
  -p 9443:9443 \
  --name portainer \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts
```

### Error: "no such file or directory: /var/run/docker.sock"

The Docker socket path may be different from `/var/run/docker.sock`, or Docker is not running:

```bash
# Check if Docker is running
systemctl status docker

# If using rootless Docker, check the user service instead
systemctl --user status docker

# Check the socket path
ls -la /var/run/docker.sock

# Check Docker context
docker context ls

# If using rootless Docker, the socket is usually at:
ls -la /run/user/$(id -u)/docker.sock

# Docker Desktop for Linux uses a per-user socket
ls -la ~/.docker/desktop/docker.sock
```

## Step 2: Update Portainer to Match Docker Version

```bash
# Check your Docker version
docker version --format '{{.Server.Version}}'

# Pull the current Portainer LTS image
docker pull portainer/portainer-ce:lts

# Stop and remove old container
docker stop portainer
docker rm portainer

# Start with the updated LTS image (data volume preserved)
docker run -d \
  -p 9000:9000 \
  -p 9443:9443 \
  --name portainer \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts
```

## Step 3: Check for Docker Daemon Configuration Changes

```bash
# View current Docker daemon config
cat /etc/docker/daemon.json

# Review daemon settings that can affect how Docker restarts or exposes the socket/API
# Check if Docker restarted cleanly after the update
journalctl -u docker --since "1 hour ago" | tail -30

# Restart Docker cleanly
sudo systemctl restart docker

# Then restart Portainer
docker restart portainer
```

## Step 4: Check SELinux / AppArmor Policies

```bash
# Check if SELinux is enforcing
getenforce  # Should output: Enforcing, Permissive, or Disabled

# If Enforcing, check for recent denials
sudo ausearch -m AVC,USER_AVC -ts recent

# Portainer's install docs require --privileged when deploying with SELinux enabled
docker run -d \
  -p 9000:9000 \
  -p 9443:9443 \
  --name portainer \
  --restart=unless-stopped \
  --privileged \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts
```

## Step 5: Verify the Data Volume Is Intact

```bash
# Check the volume exists and has data
docker volume inspect portainer_data
docker run --rm -v portainer_data:/data alpine ls -la /data/

# If portainer.db is corrupt (can happen after an unclean shutdown)
# Back it up first
docker run --rm \
  -v portainer_data:/data \
  -v /tmp:/backup \
  alpine cp /data/portainer.db /backup/portainer.db.bak
```

## Step 6: Rollback Docker Update

If Portainer was working before the update and the above steps don't resolve the issue:

```bash
# List available Docker Engine versions
apt list --all-versions docker-ce

# Install a specific earlier version (Ubuntu/Debian)
# Replace VERSION_STRING with a version from the list above
VERSION_STRING='<version from the list above>'
sudo apt install docker-ce=$VERSION_STRING docker-ce-cli=$VERSION_STRING containerd.io docker-buildx-plugin docker-compose-plugin

# Prevent auto-update
sudo apt-mark hold docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

## Step 7: Check Docker Compose Version Compatibility

If Portainer was deployed via Docker Compose:

```bash
# Check whether the obsolete top-level version field is present
grep "^version:" /path/to/docker-compose.yml

# Validate the Compose file against the current Compose specification
docker compose config
```

## Conclusion

After a Docker Engine update, Portainer failures are almost always caused by either socket permission changes, API version mismatches, or the need to update Portainer itself. Start with checking the logs, then confirm Docker is running cleanly, and update Portainer to a current supported release to take advantage of compatibility improvements.
