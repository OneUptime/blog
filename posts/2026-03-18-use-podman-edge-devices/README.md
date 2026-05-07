# How to Use Podman on Edge Devices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Edge Computing, Container, Linux, DevOps, IoT, NVIDIA Jetson, Edge Deployment

Description: Learn to deploy and manage Podman containers on edge devices like NVIDIA Jetson and Intel NUC, covering offline deployment, remote management, and auto-updates.

---

> Edge computing pushes workloads closer to where data is generated. Podman is an ideal container runtime for edge devices because it runs without a daemon, uses minimal resources, and supports rootless operation. These qualities matter when you are deploying containers to hundreds of devices with limited connectivity and no on-site administrators.

Edge devices operate in challenging environments: limited bandwidth, intermittent connectivity, restricted storage, and no direct physical access for maintenance. Unlike data center servers that run in climate-controlled racks, edge devices might sit in factory floors, retail stores, cell towers, or remote monitoring stations. Podman's lightweight, daemonless architecture makes it well-suited for these constraints.

---

## Common Edge Device Platforms

| Device | CPU | RAM | Storage | Use Case |
|--------|-----|-----|---------|----------|
| NVIDIA Jetson Nano | ARM Cortex-A57 | 4GB | 16GB eMMC | AI inference |
| NVIDIA Jetson Orin | ARM Cortex-A78AE | 8-64GB | 64GB eMMC | Advanced AI |
| Intel NUC | x86_64 | 8-64GB | 256GB+ SSD | General edge |
| Raspberry Pi 5 | ARM Cortex-A76 | 4-8GB | microSD/SSD | Light edge |
| Industrial Gateways | ARM/x86 | 2-8GB | 32-128GB | Factory/OT |

---

## Installing Podman on Edge Devices

### NVIDIA Jetson (JetPack / Ubuntu-based)

```bash
sudo apt update
sudo apt install -y podman slirp4netns fuse-overlayfs uidmap
```

### Intel NUC (Ubuntu/Fedora)

```bash
# Ubuntu

sudo apt update && sudo apt install -y podman

# Fedora IoT
sudo rpm-ostree install podman
sudo systemctl reboot
```

### Fedora IoT (Purpose-Built for Edge)

Fedora IoT is an immutable OS designed for edge deployments:

```bash
# On Fedora IoT, Podman is pre-installed
podman --version

# Enable auto-updates
sudo systemctl enable --now podman-auto-update.timer
```

### Verify Installation

```bash
podman version
podman info --format '{{.Host.Arch}} {{.Host.OS}} {{.Host.Kernel}}'
```

---

## Configuring Podman for Edge Constraints

### Minimizing Storage Usage

Edge devices often have limited storage. Configure aggressive cleanup:

```bash
mkdir -p ~/.config/containers ~/.local/bin ~/.local/state ~/.config/systemd/user

# Use overlay storage for rootless containers
cat > ~/.config/containers/storage.conf <<EOF
[storage]
driver = "overlay"

[storage.options.overlay]
mount_program = "/usr/bin/fuse-overlayfs"
EOF
```

Create an automated cleanup script:

```bash
cat > ~/.local/bin/podman-edge-cleanup.sh <<'EOF'
#!/bin/bash
# Remove stopped containers older than 1 hour
podman container prune -f --filter "until=1h"
# Remove unused images
podman image prune -a -f
# Remove unused volumes
podman volume prune -f
# Log disk usage
echo "$(date): $(podman system df --format '{{.Type}}: {{.Size}} ({{.Reclaimable}} reclaimable)')" >> ~/.local/state/podman-storage.log
EOF

chmod +x ~/.local/bin/podman-edge-cleanup.sh
```

Schedule it with a systemd timer:

```bash
cat > ~/.config/systemd/user/podman-cleanup.timer <<EOF
[Unit]
Description=Podman Edge Cleanup Timer

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
EOF

cat > ~/.config/systemd/user/podman-cleanup.service <<EOF
[Unit]
Description=Podman Edge Cleanup

[Service]
Type=oneshot
ExecStart=/bin/bash -lc '$HOME/.local/bin/podman-edge-cleanup.sh'
EOF

systemctl --user daemon-reload
systemctl --user enable --now podman-cleanup.timer
```

### Limiting Resource Usage

Prevent containers from consuming all device resources:

```bash
podman run -d --name edge-app \
  --memory 512m \
  --memory-swap 512m \
  --cpus 1.5 \
  --pids-limit 100 \
  myorg/edge-app:latest
```

---

## Offline and Pre-Loaded Deployment

Edge devices frequently operate with limited or no internet connectivity.

### Pre-Loading Images

Save images on a connected machine and transfer them to edge devices:

```bash
# On a connected machine
podman pull docker.io/myorg/edge-app:v2.1
podman save -o edge-app-v2.1.tar docker.io/myorg/edge-app:v2.1

# Transfer to edge device (USB, SCP, etc.)
scp edge-app-v2.1.tar edge-device:/tmp/

# On the edge device
podman load -i /tmp/edge-app-v2.1.tar
podman images
```

### Creating an Edge Deployment Bundle

Package everything needed for deployment:

```bash
#!/bin/bash
# create-edge-bundle.sh
BUNDLE_DIR="edge-bundle-$(date +%Y%m%d)"
mkdir -p "$BUNDLE_DIR"

# Save images
podman save -o "$BUNDLE_DIR/app.tar" myorg/edge-app:latest
podman save -o "$BUNDLE_DIR/monitor.tar" myorg/edge-monitor:latest

# Include Quadlet files
cp ~/.config/containers/systemd/*.container "$BUNDLE_DIR/"
cp ~/.config/containers/systemd/*.network "$BUNDLE_DIR/"

# Include deployment script
cat > "$BUNDLE_DIR/deploy.sh" <<'DEPLOY'
#!/bin/bash
set -e
echo "Loading container images..."
for tar in *.tar; do
  podman load -i "$tar"
done

echo "Installing systemd units..."
mkdir -p ~/.config/containers/systemd
cp *.container *.network ~/.config/containers/systemd/

echo "Starting services..."
systemctl --user daemon-reload
systemctl --user start edge-app edge-monitor
echo "Deployment complete"
DEPLOY

chmod +x "$BUNDLE_DIR/deploy.sh"
tar czf "$BUNDLE_DIR.tar.gz" "$BUNDLE_DIR"
echo "Bundle created: $BUNDLE_DIR.tar.gz"
```

---

## Remote Management

### Managing Edge Devices via SSH

```bash
# Check container status across multiple devices
for device in edge-01 edge-02 edge-03; do
  echo "=== $device ==="
  ssh podman-svc@$device "podman ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
done
```

### Podman Remote API

Enable the Podman REST API on the edge device for remote management:

```bash
# On the edge device, enable the socket
systemctl --user enable --now podman.socket

# From a management station, add an SSH-backed connection
# Replace 1000 with the remote UID of podman-svc if it differs.
podman system connection add \
  --socket-path /run/user/1000/podman/podman.sock \
  edge-device podman-svc@edge-device

# Then use podman with the saved connection
podman --connection edge-device ps
```

### Fleet Management Script

```bash
#!/bin/bash
# fleet-update.sh - Update containers across edge fleet
DEVICES="edge-01 edge-02 edge-03 edge-04 edge-05"
IMAGE="myorg/edge-app:v2.2"

for device in $DEVICES; do
  echo "Updating $device..."
  scp edge-app-v2.2.tar podman-svc@$device:/tmp/

  ssh podman-svc@$device bash <<REMOTE
    podman load -i /tmp/edge-app-v2.2.tar
    podman stop edge-app 2>/dev/null
    podman rm edge-app 2>/dev/null
    podman run -d --name edge-app \
      -p 8080:8080 \
      --memory 512m \
      --restart always \
      $IMAGE
    rm /tmp/edge-app-v2.2.tar
    echo "Update complete on \$(hostname)"
REMOTE
done
```

---

## Auto-Updates for Connected Edge Devices

For edge devices with internet connectivity, use Podman's auto-update feature:

```bash
mkdir -p ~/.config/containers/systemd

cat > ~/.config/containers/systemd/edge-app.container <<EOF
[Unit]
Description=Edge Application
After=network-online.target

[Container]
Image=docker.io/myorg/edge-app:latest
PublishPort=8080:8080
Volume=edge-data:/data:Z
Environment=DEVICE_ID=edge-01
Environment=REGION=us-west
AutoUpdate=registry
Label=io.containers.autoupdate=registry

[Service]
Restart=always
TimeoutStartSec=120

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable --now edge-app
systemctl --user enable --now podman-auto-update.timer
```

---

## Health Monitoring at the Edge

### Local Health Checks

```bash
podman run -d --name edge-app \
  --health-cmd "curl -f http://localhost:8080/health || exit 1" \
  --health-interval 60s \
  --health-retries 3 \
  --health-timeout 10s \
  -p 8080:8080 \
  myorg/edge-app:latest
```

### Watchdog Script

Create a watchdog that restarts unhealthy containers:

```bash
mkdir -p ~/.local/bin ~/.config/systemd/user

cat > ~/.local/bin/podman-watchdog.sh <<'EOF'
#!/bin/bash
# Check container health and restart if unhealthy
CONTAINERS=$(podman ps --format '{{.Names}}')

for name in $CONTAINERS; do
  health=$(podman inspect "$name" --format '{{.State.Health.Status}}' 2>/dev/null)
  if [ "$health" = "unhealthy" ]; then
    echo "$(date): $name is unhealthy, restarting..."
    podman restart "$name"
    logger -t podman-watchdog "Restarted unhealthy container: $name"
  fi
done
EOF

chmod +x ~/.local/bin/podman-watchdog.sh
```

Schedule the watchdog:

```bash
cat > ~/.config/systemd/user/podman-watchdog.timer <<EOF
[Unit]
Description=Podman Watchdog Timer

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min

[Install]
WantedBy=timers.target
EOF

cat > ~/.config/systemd/user/podman-watchdog.service <<EOF
[Unit]
Description=Podman Watchdog

[Service]
Type=oneshot
ExecStart=/bin/bash -lc '$HOME/.local/bin/podman-watchdog.sh'
EOF

systemctl --user daemon-reload
systemctl --user enable --now podman-watchdog.timer
```

---

## NVIDIA Jetson GPU Containers

For AI inference on NVIDIA Jetson devices, use NVIDIA's recommended CDI flow with Podman:

```bash
# Install NVIDIA Container Toolkit
sudo apt update
sudo apt install -y nvidia-container-toolkit

# Generate a CDI specification for Podman
sudo nvidia-ctk cdi generate --output=/var/run/cdi/nvidia.yaml

# Run a GPU-accelerated container
podman run --rm \
  --device nvidia.com/gpu=all \
  --security-opt=label=disable \
  nvcr.io/nvidia/l4t-pytorch:latest \
  python3 -c "import torch; print(f'CUDA available: {torch.cuda.is_available()}')"
```

---

## Resilient Edge Patterns

### Automatic Restart on Boot

Ensure containers start automatically after power loss:

```bash
# Enable lingering for the service user
sudo loginctl enable-linger podman-svc

# Quadlet containers with [Install] WantedBy=default.target
# will start automatically on boot
```

### Data Persistence on Unreliable Storage

```bash
# Use named volumes for critical data
podman volume create edge-data

# Run with volume
podman run -d --name edge-app \
  -v edge-data:/app/data:Z \
  myorg/edge-app:latest

# Periodically sync data to prevent loss
podman exec edge-app sync
```

---

## Conclusion

Podman on edge devices provides a production-ready container runtime that respects the constraints of edge computing. Its daemonless architecture means no background process consuming resources when containers are idle. Rootless operation improves security on devices that may be physically accessible. Offline deployment through image bundles, automatic updates for connected devices, health monitoring watchdogs, and fleet management scripts give you the operational tools needed to manage containers across distributed edge infrastructure. Whether you are running AI inference on NVIDIA Jetson or data collection on industrial gateways, Podman delivers reliable container management without the overhead of traditional container runtimes.
