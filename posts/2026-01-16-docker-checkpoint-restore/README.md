# How to Use Docker Checkpoint and Restore (CRIU)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, CRIU, Checkpoint, Restore, Migration

Description: Learn how to use Docker checkpoint and restore with CRIU for live container migration, state preservation, and fast container recovery.

---

Docker checkpoint and restore allows saving a running container's state and restoring it later. This guide covers using CRIU (Checkpoint/Restore In Userspace) for container migration and state preservation.

## Prerequisites

```bash
# Install CRIU (Ubuntu/Debian)
sudo apt-get install criu

# Verify CRIU installation
criu check

# Enable experimental features in Docker daemon
# /etc/docker/daemon.json
{
  "experimental": true
}

# Restart Docker
sudo systemctl restart docker
```

## Basic Checkpoint

```bash
# Create checkpoint
docker checkpoint create mycontainer checkpoint1

# List checkpoints
docker checkpoint ls mycontainer

# Restore from checkpoint
docker start --checkpoint checkpoint1 mycontainer
```

## Checkpoint with Options

```bash
# Checkpoint and leave container running
docker checkpoint create --leave-running mycontainer checkpoint1

# Checkpoint to custom directory
docker checkpoint create --checkpoint-dir /backups mycontainer checkpoint1

# Restore from custom directory
docker start --checkpoint checkpoint1 --checkpoint-dir /backups mycontainer
```

## Container Migration

```bash
# On source host: checkpoint
docker checkpoint create mycontainer migration-checkpoint

# Copy checkpoint data
scp -r /var/lib/docker/containers/<container-id>/checkpoints/migration-checkpoint user@target:/checkpoints/

# On target host: create container with same config
docker create --name mycontainer myimage

# Restore
docker start --checkpoint migration-checkpoint --checkpoint-dir /checkpoints mycontainer
```

## Migration Script

```bash
#!/bin/bash
# migrate-container.sh

CONTAINER=$1
TARGET_HOST=$2
CHECKPOINT_NAME="migration-$(date +%s)"

# Checkpoint
docker checkpoint create $CONTAINER $CHECKPOINT_NAME

# Get container config
docker inspect $CONTAINER > /tmp/container-config.json

# Copy checkpoint
CHECKPOINT_DIR="/var/lib/docker/containers/$(docker inspect -f '{{.Id}}' $CONTAINER)/checkpoints/$CHECKPOINT_NAME"
rsync -avz $CHECKPOINT_DIR ${TARGET_HOST}:/tmp/checkpoints/

# Copy config
scp /tmp/container-config.json ${TARGET_HOST}:/tmp/

# Restore on target (run on target host)
ssh $TARGET_HOST << EOF
docker create --name $CONTAINER <original-image>
docker start --checkpoint $CHECKPOINT_NAME --checkpoint-dir /tmp/checkpoints $CONTAINER
EOF
```

## Docker Compose Integration

```yaml
version: '3.8'

services:
  app:
    image: myapp:latest
    container_name: myapp
    # Note: Checkpoints work with container_name

# Checkpoint: docker checkpoint create myapp backup1
# Restore: docker start --checkpoint backup1 myapp
```

## Limitations

| Feature | Support |
|---------|---------|
| Stateless containers | Full |
| Network connections | Partial (TCP may fail) |
| Open files | Supported |
| Volumes | Supported |
| Privileged containers | Limited |

## Best Practices

1. **Test checkpoints** in development first
2. **Close network connections** before checkpoint when possible
3. **Use same Docker version** on source and target
4. **Verify image availability** on target host
5. **Monitor memory usage** - checkpoint size depends on container memory

## Troubleshooting

```bash
# Check CRIU compatibility
criu check --all

# Debug checkpoint
docker checkpoint create --debug mycontainer checkpoint1

# View CRIU logs
journalctl -u docker | grep criu
```

Docker checkpoint/restore provides powerful state preservation for specific use cases. It's most reliable for stateless containers with minimal network state. For general migration, consider volume backup and container recreation as described in our post on [Docker Volume Backups](https://oneuptime.com/blog/post/2026-01-16-docker-volume-backups/view).

