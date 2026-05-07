# How to Import a Container Checkpoint from a File with Podman

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Podman, CRIU, Container, Checkpoint Import, DevOps

Description: A guide to importing and restoring a Podman container from an exported checkpoint file, covering import options, name overrides, and handling imported containers on new hosts.

---

> Importing a container checkpoint from a file lets you restore a frozen container on any compatible host, enabling migration, disaster recovery, and reproducible debugging from a single portable archive.

Importing a checkpoint is the counterpart to exporting one. You take a checkpoint tar archive, either from the same host or a different one, and Podman recreates the container and restores its runtime state. The application inside resumes from the exact point where it was checkpointed.

---

## Prerequisites

Before importing a checkpoint, ensure:

- Podman and CRIU 3.11+ are installed on the target host
- The checkpoint archive (`.tar.zst` by default, or `.tar.gz` if exported with gzip compression) is accessible on the local filesystem
- The container's base image is available locally or from a registry
- You have root access

## Basic Import and Restore

The import is done through the restore command with the `--import` flag:

```bash
sudo podman container restore --import=/tmp/web-app-checkpoint.tar.gz
```

This command:

1. Reads the archive and extracts the container configuration
2. Creates a new container with the original settings
3. Applies the filesystem diff from the archive
4. Invokes CRIU to restore the process state
5. Resumes the container

Verify the container is running:

```bash
sudo podman ps
```

The container will appear with the same name it had when it was exported.

## Importing with a New Name

If a container with the same name already exists, or you want to use a different name on the target host:

```bash
sudo podman container restore --import=/tmp/web-app-checkpoint.tar.gz --name=web-app-restored
```

This is required when importing on the same host where the original container still exists:

```bash
# Original container was checkpointed with --leave-running, so it still exists

# Import with a different name to avoid conflicts
sudo podman container restore --import=/tmp/web-app-checkpoint.tar.gz --name=web-app-copy
```

## Importing Multiple Times

One of the key advantages of exported checkpoints is that you can import the same file multiple times. Each import creates a new, independent container:

```bash
# Create three instances from the same checkpoint
sudo podman container restore --import=/tmp/web-app-checkpoint.tar.gz --name=instance-1
sudo podman container restore --import=/tmp/web-app-checkpoint.tar.gz --name=instance-2
sudo podman container restore --import=/tmp/web-app-checkpoint.tar.gz --name=instance-3
```

All three containers will start from the exact same state but run independently from that point forward. This is useful for:

- Reproducing bugs consistently across multiple investigation attempts
- Scaling out pre-warmed application instances
- Testing different scenarios from a known starting state

Verify all instances are running:

```bash
sudo podman ps --filter "name=instance"
```

## Ensuring the Base Image Is Available

The checkpoint archive contains filesystem diffs but not the base image. You must have the original image on the target host:

```bash
# Check if the image is available
sudo podman images | grep nginx

# Pull it if not present
sudo podman pull docker.io/library/nginx:alpine
```

If the image is missing, the import will fail with an error about missing layers. You can check which image the checkpoint needs by examining the archive:

```bash
# Extract the config to see the image reference
tar xzf /tmp/web-app-checkpoint.tar.gz config.dump -O | python3 -m json.tool | grep -i image
```

This shows the image name and tag that the container was using when it was checkpointed.

## Import with Port Mapping Changes

When importing on a different host, you may need different port mappings if the original ports are already in use. Podman supports the `--publish` (or `-p`) flag with `--import` to override port mappings during restore:

```bash
# Import with the original port mapping (from the checkpoint)
sudo podman container restore --import=/tmp/web-app-checkpoint.tar.gz --name=web-app

# Import with different port mappings
sudo podman container restore --import=/tmp/web-app-checkpoint.tar.gz \
  --name=web-app-alt \
  --publish 8080:80

# Map to a different host port if the original is in use
sudo podman container restore --import=/tmp/web-app-checkpoint.tar.gz \
  --name=web-app-copy \
  -p 9090:80
```

The `--publish` flag replaces the ports that the container originally published with a new set of port forwarding rules. This flag is available when restoring from a checkpoint image or when used with `--import`.

## Import from Remote Storage

For checkpoint files stored on remote systems, download them first:

```bash
# From another host via scp
scp source-host:/tmp/web-app-checkpoint.tar.gz /tmp/

# From S3-compatible storage
aws s3 cp s3://my-bucket/checkpoints/web-app-checkpoint.tar.gz /tmp/

# From NFS or shared storage
cp /nfs/checkpoints/web-app-checkpoint.tar.gz /tmp/

# Then import
sudo podman container restore --import=/tmp/web-app-checkpoint.tar.gz
```

## Verifying Imported Container State

After importing, verify the container's state matches what you expect:

```bash
# Check the container is running
sudo podman ps --filter name=web-app

# Inspect the container configuration
sudo podman inspect web-app --format '{{.Config.Image}}'
sudo podman inspect web-app --format '{{range .Config.Env}}{{.}}{{"\n"}}{{end}}'

# Check process state inside the container
sudo podman exec web-app ps aux

# Check logs generated after restore
sudo podman logs web-app

# For web applications, test the endpoint
curl -s http://localhost:80/ | head -5
```

## Import with Ignore Options

Sometimes the target host has a different network configuration or static IP assignments. Podman provides flags to ignore certain state during import:

```bash
# Ignore the checkpointed network state and assign a new IP
sudo podman container restore --import=/tmp/web-app-checkpoint.tar.gz \
  --ignore-static-ip \
  --ignore-static-mac
```

These flags tell Podman to let the network stack assign new addresses instead of trying to restore the original ones.

## Handling Import Failures

Common import errors and solutions:

**"image not known"**: The container's base image is not on this host.

```bash
# Find the needed image
tar xzf /tmp/web-app-checkpoint.tar.gz config.dump -O 2>/dev/null | python3 -c "
import sys, json
config = json.load(sys.stdin)
print(config.get('rootfsImageName', 'unknown'))
"
# Pull the image
sudo podman pull <image-name>
```

**"name already in use"**: A container with this name already exists.

```bash
# Use a different name
sudo podman container restore --import=/tmp/checkpoint.tar.gz --name=new-name

# Or remove the existing container
sudo podman rm -f existing-container
```

**"CRIU restore failed"**: Usually caused by kernel or architecture mismatches.

```bash
# Check for detailed errors
sudo podman --log-level=debug container restore --import=/tmp/checkpoint.tar.gz 2>&1 | grep -i error
```

**"archive/tar: invalid tar header"**: The file is corrupted or not a valid checkpoint archive.

```bash
# Verify archive integrity
tar tzf /tmp/checkpoint.tar.gz > /dev/null
echo $?  # 0 means valid, non-zero means corrupted
```

## Automating Import in CI/CD

Checkpoint import can be part of a deployment pipeline for fast container startup:

```bash
#!/bin/bash
set -euo pipefail

CHECKPOINT_URL="$1"
CONTAINER_NAME="$2"
LOCAL_FILE="/tmp/${CONTAINER_NAME}-checkpoint.tar.gz"

# Download the checkpoint
echo "Downloading checkpoint..."
curl -sSL -o "${LOCAL_FILE}" "${CHECKPOINT_URL}"

# Verify integrity
if ! tar tzf "${LOCAL_FILE}" > /dev/null 2>&1; then
  echo "Error: Checkpoint file is corrupted"
  exit 1
fi

# Remove existing container if present
sudo podman rm -f "${CONTAINER_NAME}" 2>/dev/null || true

# Import and restore
echo "Restoring container..."
sudo podman container restore --import="${LOCAL_FILE}" --name="${CONTAINER_NAME}"

# Verify
if sudo podman ps --filter "name=${CONTAINER_NAME}" --format '{{.Status}}' | grep -q "Up"; then
  echo "Container ${CONTAINER_NAME} restored successfully"
else
  echo "Error: Container failed to start after restore"
  exit 1
fi

# Cleanup
rm -f "${LOCAL_FILE}"
```

## Comparing Import Performance vs Fresh Start

Importing a pre-warmed checkpoint can be significantly faster than starting a container from scratch, especially for applications with heavy initialization:

```bash
# Measure cold start
time sudo podman run -d --name cold docker.io/library/python:3.11-slim \
  python3 -c "
import importlib
# Simulate heavy initialization
for mod in ['json', 'http', 'email', 'unittest', 'logging', 'xml']:
    importlib.import_module(mod)
import time; time.sleep(3600)
"
sudo podman rm -f cold

# Measure checkpoint import
time sudo podman container restore --import=/tmp/python-warmed-checkpoint.tar.gz --name=warm
sudo podman rm -f warm
```

The import skips all initialization because the processes are restored in their post-initialization state.

## Conclusion

Importing a container checkpoint from a file restores a complete container from a portable archive. The process requires the base image to be available on the target host and a compatible kernel and CPU architecture. You can import the same file multiple times with different names to create identical starting states for debugging or scaling. The import command supports flags for ignoring network state when the target host has a different network configuration. Combined with export, this workflow enables container migration, backup/restore, and fast startup from pre-warmed application state.
