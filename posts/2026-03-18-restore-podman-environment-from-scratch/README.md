# How to Restore a Podman Environment from Scratch

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Podman, Disaster Recovery, Restore, Infrastructure, DevOps

Description: A complete guide to rebuilding an entire Podman environment from backups, covering image restoration, volume recovery, container recreation, and network configuration.

---

> Your server died. Your disk failed. Your cloud instance vanished. Here is how to rebuild your entire Podman container environment from scratch using your backups.

Disaster recovery is not about preventing failures. It is about recovering from them quickly. When a host goes down permanently, whether from hardware failure, a botched OS upgrade, or an infrastructure migration, you need to rebuild the entire container environment on a fresh system. This guide walks through the complete process, from installing Podman to verifying that every service is running correctly.

---

## The Recovery Plan

Rebuilding a Podman environment from scratch involves these steps in order:

1. Install Podman and dependencies on the new host.
2. Restore images (or pull them from registries).
3. Recreate networks.
4. Restore volumes with their data.
5. Recreate containers with their original configuration.
6. Verify everything is working.

Order matters. Containers depend on images, volumes, and networks. Restore those dependencies first.

## Step 1: Install Podman

On a fresh system, install Podman and any required tools:

```bash
# Fedora/RHEL/CentOS

sudo dnf install -y podman podman-plugins containernetworking-plugins

# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y podman

# Verify installation
podman --version
podman info
```

If you use rootless Podman, configure the user namespace:

```bash
# Check user namespace setup
cat /etc/subuid
cat /etc/subgid

# If your user is missing, add entries
sudo usermod --add-subuids 100000-165535 --add-subgids 100000-165535 $USER

# Initialize rootless storage
podman system migrate
```

## Step 2: Restore Images

If you have image backups (from `podman save`), load them:

```bash
#!/bin/bash

IMAGE_BACKUP_DIR="/backups/podman/latest/images"

echo "Restoring images..."
for archive in "$IMAGE_BACKUP_DIR"/*.tar.gz; do
    echo "  Loading: $(basename $archive)"
    gunzip -c "$archive" | podman load
done

echo ""
echo "Restored images:"
podman images
```

If you do not have image backups, pull images from registries using the manifest:

```bash
#!/bin/bash

MANIFEST="/backups/podman/latest/manifest.json"

# Extract image names from manifest
python3 -c "
import json
with open('$MANIFEST') as f:
    data = json.load(f)
for img in data.get('images', []):
    repo = img.get('repository', img.get('Repository', ''))
    tag = img.get('tag', img.get('Tag', ''))
    if repo and tag and repo != '<none>':
        print(f'{repo}:{tag}')
" | sort -u | while read image; do
    echo "Pulling: $image"
    podman pull "$image" || echo "  WARNING: Failed to pull $image"
done
```

## Step 3: Recreate Networks

If your containers used custom networks, recreate them:

```bash
# Check if backup includes network configuration
cat /backups/podman/latest/manifest.json | python3 -c "
import json, sys
data = json.load(sys.stdin)
# Networks may be in the manifest if you included them
" 2>/dev/null

# Recreate networks manually based on your known configuration
podman network create app-network
podman network create --subnet 10.89.0.0/24 internal-network

# Or recreate from saved network configurations
for netconf in /backups/podman/latest/networks/*.json; do
    NETWORK_NAME=$(basename "$netconf" .json)
    echo "Recreating network: $NETWORK_NAME"

    # Extract subnet and gateway from podman network inspect output
    mapfile -t NET_ARGS < <(python3 -c "
import json
with open('$netconf') as f:
    data = json.load(f)
data = data[0] if isinstance(data, list) else data
for subnet in data.get('subnets', []):
    if subnet.get('subnet'):
        print('--subnet')
        print(subnet['subnet'])
    if subnet.get('gateway'):
        print('--gateway')
        print(subnet['gateway'])
plugins = data.get('plugins', [])
for plugin in plugins:
    ranges = plugin.get('ipam', {}).get('ranges', [])
    for group in ranges:
        for item in group:
            if item.get('subnet'):
                print('--subnet')
                print(item['subnet'])
            if item.get('gateway'):
                print('--gateway')
                print(item['gateway'])
" 2>/dev/null)

    podman network create "${NET_ARGS[@]}" "$NETWORK_NAME"
done

podman network ls
```

## Step 4: Restore Volumes

Recreate volumes and restore their data:

```bash
#!/bin/bash

VOLUME_BACKUP_DIR="/backups/podman/latest/volumes"

echo "Restoring volumes..."
for archive in "$VOLUME_BACKUP_DIR"/*.tar.gz; do
    # Skip metadata files
    [[ "$archive" == *-inspect.json ]] && continue

    VOLUME_NAME=$(basename "$archive" .tar.gz)
    METADATA="$VOLUME_BACKUP_DIR/$VOLUME_NAME-inspect.json"
    echo "  Restoring volume: $VOLUME_NAME"

    # Create the volume, preserving labels if metadata is available
    LABEL_ARGS=()
    if [ -f "$METADATA" ]; then
        while IFS= read -r label; do
            LABEL_ARGS+=(--label "$label")
        done < <(python3 -c "
import json
with open('$METADATA') as f:
    data = json.load(f)
data = data[0] if isinstance(data, list) else data
for k, v in (data.get('Labels') or {}).items():
    print(f'{k}={v}')
")
    fi

    podman volume create "${LABEL_ARGS[@]}" "$VOLUME_NAME"

    # Restore data using podman volume import
    gunzip -c "$archive" | podman volume import "$VOLUME_NAME" -

    echo "    Done"
done

echo ""
echo "Restored volumes:"
podman volume ls
```

If you have volume metadata, you can inspect labels before recreating a volume:

```bash
for metadata in "$VOLUME_BACKUP_DIR"/*-inspect.json; do
    VOLUME_NAME=$(basename "$metadata" -inspect.json)
    echo "Volume $VOLUME_NAME labels:"
    python3 -c "
import json
with open('$metadata') as f:
    data = json.load(f)
labels = (data[0].get('Labels', {}) if isinstance(data, list) else data.get('Labels', {})) or {}
for k, v in labels.items():
    print(f'  {k}={v}')
"
done
```

## Step 5: Recreate Containers

This is the most involved step. You need to reconstruct the `podman run` command for each container from the saved metadata:

```bash
#!/bin/bash

CONTAINER_BACKUP_DIR="/backups/podman/latest/containers"

echo "Recreating containers..."

for metadata in "$CONTAINER_BACKUP_DIR"/*-inspect.json; do
    CONTAINER_NAME=$(basename "$metadata" -inspect.json)
    echo "  Recreating: $CONTAINER_NAME"

    # Build the podman run command
    RUN_CMD=$(python3 - "$metadata" << 'PYEOF'
import json
import shlex
import sys

with open(sys.argv[1]) as f:
    data = json.load(f)

d = data[0] if isinstance(data, list) else data
config = d.get('Config', {})
host_config = d.get('HostConfig', {})

args = []

# Name
name = d.get('Name', '').lstrip('/')
if name:
    args.extend(['--name', name])

# Environment variables (skip default PATH)
for env in config.get('Env', []):
    if not env.startswith('PATH='):
        args.extend(['-e', env])

# Port mappings
port_bindings = host_config.get('PortBindings', {})
for container_port, bindings in port_bindings.items():
    if bindings:
        for binding in bindings:
            host_port = binding.get('HostPort', '')
            host_ip = binding.get('HostIp', '')
            if host_port:
                published = f'{host_port}:{container_port}'
                if host_ip:
                    published = f'{host_ip}:{published}'
                args.extend(['-p', published])

# Volume mounts
for mount in d.get('Mounts', []):
    src = mount.get('Source', mount.get('Name', ''))
    dst = mount.get('Destination', '')
    if src and dst:
        args.extend(['-v', f'{src}:{dst}'])

# Restart policy
restart = host_config.get('RestartPolicy', {}).get('Name', '')
if restart and restart != 'no':
    args.extend(['--restart', restart])

# Network
networks = d.get('NetworkSettings', {}).get('Networks', {})
for net_name in networks:
    if net_name not in ('podman', 'bridge'):
        args.extend(['--network', net_name])

# Image
image = d.get('ImageName', config.get('Image', ''))

# Command
cmd = config.get('Cmd', [])
command = cmd if isinstance(cmd, list) else ([cmd] if cmd else [])

print(' '.join(shlex.quote(arg) for arg in args + [image] + command))
PYEOF
)

    echo "    podman run -d $RUN_CMD"
    # Uncomment the next line to actually run:
    # eval "podman run -d $RUN_CMD"
done
```

For a safer approach, generate a restore script first, review it, then execute:

```bash
# Generate restore script
python3 /usr/local/bin/generate-restore-script.py \
    /backups/podman/latest/containers/ \
    > /tmp/restore-containers.sh

# Review the script
cat /tmp/restore-containers.sh

# Execute after review
chmod +x /tmp/restore-containers.sh
/tmp/restore-containers.sh
```

## Step 6: Restore from Container Exports

If you used `podman export` instead of saving images, import each container filesystem:

```bash
for archive in "$CONTAINER_BACKUP_DIR"/*.tar.gz; do
    [[ "$archive" == *-inspect* ]] && continue
    [[ "$archive" == *-metadata* ]] && continue

    CONTAINER_NAME=$(basename "$archive" .tar.gz)
    echo "Importing: $CONTAINER_NAME"

    gunzip -c "$archive" | podman import - "${CONTAINER_NAME}:restored"
done
```

Then recreate the containers using the imported images with the appropriate run commands from the metadata.

## Step 7: Verify the Restored Environment

Run a comprehensive verification:

```bash
#!/bin/bash

echo "=== Podman Environment Verification ==="
echo ""

echo "--- Images ---"
podman images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
echo ""

echo "--- Containers ---"
podman ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Image}}\t{{.Ports}}"
echo ""

echo "--- Volumes ---"
podman volume ls
echo ""

echo "--- Networks ---"
podman network ls
echo ""

# Health checks
echo "--- Health Checks ---"
for container in $(podman ps --format "{{.Names}}"); do
    STATUS=$(podman inspect "$container" --format '{{.State.Status}}')
    HEALTH=$(podman inspect "$container" --format '{{.State.Health.Status}}' 2>/dev/null || echo "none")

    if [ "$STATUS" = "running" ]; then
        echo "  $container: RUNNING (health: $HEALTH)"
    else
        echo "  $container: $STATUS (NEEDS ATTENTION)"
    fi
done

# Port checks
echo ""
echo "--- Port Bindings ---"
podman ps --format "{{.Names}}: {{.Ports}}"

echo ""
echo "Verification complete."
```

## Creating a Recovery Playbook

Document your recovery process as a runnable script:

```bash
#!/bin/bash
# /usr/local/bin/podman-full-restore.sh
# Complete environment restoration from backup

set -e

BACKUP_DIR="${1:-/backups/podman/latest}"

if [ ! -d "$BACKUP_DIR" ]; then
    echo "ERROR: Backup directory not found: $BACKUP_DIR"
    echo "Usage: $0 <backup-directory>"
    exit 1
fi

echo "Restoring Podman environment from: $BACKUP_DIR"
echo "Press Enter to continue or Ctrl+C to abort..."
read

echo "[1/5] Loading images..."
for img in "$BACKUP_DIR"/images/*.tar.gz; do
    gunzip -c "$img" | podman load 2>/dev/null
done

echo "[2/5] Creating networks..."
# Add your network creation commands here

echo "[3/5] Restoring volumes..."
for vol in "$BACKUP_DIR"/volumes/*.tar.gz; do
    VOL_NAME=$(basename "$vol" .tar.gz)
    podman volume create "$VOL_NAME" 2>/dev/null || true
    gunzip -c "$vol" | podman volume import "$VOL_NAME" -
done

echo "[4/5] Recreating containers..."
# Execute the generated restore script or manually defined commands

echo "[5/5] Verifying..."
podman ps -a
echo ""
echo "Restoration complete. Review the output above for any errors."
```

## Conclusion

Restoring a Podman environment from scratch is a multi-step process that requires restoring images, networks, volumes, and containers in the right order. The key to a smooth recovery is preparation: maintain comprehensive backups, document your container configurations, and test the restore process before you need it. A recovery plan that has never been tested is just a guess. Run through this process on a test system at least once so that when disaster strikes, you know exactly what to do.
