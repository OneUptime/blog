# How to Install Talos Linux on Raspberry Pi

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Raspberry Pi, ARM, Kubernetes, Edge Computing

Description: Step-by-step guide to installing Talos Linux on Raspberry Pi 4 and 5 for building ARM-based Kubernetes clusters at the edge.

---

The Raspberry Pi is one of the most popular single-board computers in the world, and it makes an excellent platform for running Talos Linux at the edge, in homelabs, or in educational settings. Talos supports both the Raspberry Pi 4 and Raspberry Pi 5 with official ARM64 images. This guide covers everything from flashing the SD card to running a production-ready Kubernetes cluster on a fleet of Pis.

## Prerequisites

You will need:

- One or more Raspberry Pi 4 (4GB+ RAM) or Raspberry Pi 5 units
- MicroSD cards (32GB minimum, 64GB+ recommended) or USB drives
- Ethernet cables (WiFi is possible but not recommended for Kubernetes)
- A network switch
- Power supplies for each Pi
- A workstation with an SD card reader

Install the tools on your workstation:

```bash
# Install talosctl
curl -sL https://talos.dev/install | sh

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl && sudo mv kubectl /usr/local/bin/

# For flashing SD cards
# On macOS
brew install --cask balenaetcher
# Or use dd which is available everywhere
```

## Downloading the Talos Image

Download the Raspberry Pi-specific Talos image:

```bash
# For Raspberry Pi 4
curl -LO https://github.com/siderolabs/talos/releases/download/v1.7.0/metal-arm64.raw.xz
xz -d metal-arm64.raw.xz

# Alternatively, use the Image Factory for a Pi-specific image
# with the right overlays pre-included
# For Raspberry Pi 4:
curl -LO "https://factory.talos.dev/image/ee21ef4a5ef808a9b7484cc0dda0f25075021691c8c09a276591eedb638ea1f9/v1.7.0/metal-arm64.raw.xz"
xz -d metal-arm64.raw.xz
```

The Image Factory approach is recommended because it includes the correct board-specific overlays (device tree, firmware) needed for the Raspberry Pi to boot correctly.

## Preparing the Image with Image Factory

For the best experience, use the Talos Image Factory to create a customized image:

```bash
# Create a schematic for Raspberry Pi 4
cat > rpi4-schematic.yaml <<'EOF'
overlay:
  name: rpi_generic
  image: siderolabs/sbc-raspberrypi
customization:
  systemExtensions:
    officialExtensions: []
EOF

# Submit the schematic to get a custom image
SCHEMATIC_ID=$(curl -s -X POST --data-binary @rpi4-schematic.yaml \
  https://factory.talos.dev/schematics \
  -H "Content-Type: application/x-yaml" | jq -r '.id')

echo "Schematic ID: ${SCHEMATIC_ID}"

# Download the custom image
curl -LO "https://factory.talos.dev/image/${SCHEMATIC_ID}/v1.7.0/metal-arm64.raw.xz"
xz -d metal-arm64.raw.xz
```

## Flashing the SD Card

Flash the Talos image to your SD cards:

```bash
# Identify your SD card device
# On macOS:
diskutil list
# Look for the SD card (usually /dev/diskN)

# On Linux:
lsblk
# Look for the SD card (usually /dev/sdX or /dev/mmcblkN)

# IMPORTANT: Double-check the device name to avoid overwriting the wrong disk

# On macOS - unmount first
diskutil unmountDisk /dev/disk4

# Flash the image (replace /dev/disk4 with your actual device)
# On macOS use rdisk for faster writes
sudo dd if=metal-arm64.raw of=/dev/rdisk4 bs=4M status=progress

# On Linux
sudo dd if=metal-arm64.raw of=/dev/sdX bs=4M status=progress conv=fsync

# Flush the write cache
sync
```

If you have multiple Pis, repeat the flashing process for each SD card. Each Pi will get its own configuration through the Talos API after booting.

## Updating Raspberry Pi Firmware

For the best compatibility, make sure your Raspberry Pi firmware is up to date. This is especially important for Raspberry Pi 4 UEFI boot support:

```bash
# If your Pi does not boot, you may need to update the firmware
# Boot the Pi with a standard Raspberry Pi OS first, then:
# sudo apt update && sudo apt upgrade -y
# sudo rpi-update
# Then flash Talos again

# For Pi 4, you may need to update the EEPROM:
# sudo rpi-eeprom-update -a
# sudo reboot
```

## Booting and Finding Your Pis

Insert the SD cards, connect ethernet, and power on the Pis:

```bash
# The Pis will boot into Talos maintenance mode
# They will get IP addresses from your DHCP server

# Find the Pis on your network
# Method 1: Check your router's DHCP lease table
# Method 2: Scan the network
nmap -sn 192.168.1.0/24 | grep -B2 "Raspberry"

# Method 3: Check ARP table after a few minutes
arp -a | grep -i "dc:a6\|28:cd\|e4:5f"
# (Common Raspberry Pi MAC address prefixes)
```

## Generating Talos Configuration

Generate the machine configuration for your Pi cluster:

```bash
# For a single control plane node (suitable for a small Pi cluster)
talosctl gen config talos-pi-cluster "https://192.168.1.50:6443" \
  --output-dir _out

# Or for a multi-node control plane (3+ Pis)
# Use a VIP for the endpoint
talosctl gen config talos-pi-cluster "https://192.168.1.100:6443" \
  --output-dir _out

# Patch for Raspberry Pi specific settings
cat > rpi-cp-patch.yaml <<'EOF'
machine:
  install:
    disk: /dev/mmcblk0
    image: factory.talos.dev/installer/SCHEMATIC_ID:v1.7.0
  network:
    interfaces:
      - interface: eth0
        dhcp: true
        vip:
          ip: 192.168.1.100
EOF

cat > rpi-worker-patch.yaml <<'EOF'
machine:
  install:
    disk: /dev/mmcblk0
    image: factory.talos.dev/installer/SCHEMATIC_ID:v1.7.0
  network:
    interfaces:
      - interface: eth0
        dhcp: true
EOF

# Apply patches
talosctl machineconfig patch _out/controlplane.yaml \
  --patch @rpi-cp-patch.yaml \
  --output _out/controlplane-pi.yaml

talosctl machineconfig patch _out/worker.yaml \
  --patch @rpi-worker-patch.yaml \
  --output _out/worker-pi.yaml
```

## Applying Configuration

Apply the configuration to each Pi through the Talos API:

```bash
# Apply to control plane Pis
talosctl apply-config --insecure --nodes 192.168.1.50 \
  --file _out/controlplane-pi.yaml

talosctl apply-config --insecure --nodes 192.168.1.51 \
  --file _out/controlplane-pi.yaml

talosctl apply-config --insecure --nodes 192.168.1.52 \
  --file _out/controlplane-pi.yaml

# Apply to worker Pis
talosctl apply-config --insecure --nodes 192.168.1.53 \
  --file _out/worker-pi.yaml

talosctl apply-config --insecure --nodes 192.168.1.54 \
  --file _out/worker-pi.yaml
```

## Bootstrapping the Cluster

```bash
# Configure talosctl
talosctl config merge _out/talosconfig
talosctl config endpoint 192.168.1.100
talosctl config node 192.168.1.50

# Wait for installation
sleep 180

# Bootstrap the cluster
talosctl bootstrap --nodes 192.168.1.50

# Check health
talosctl health --wait-timeout 15m

# Get kubeconfig
talosctl kubeconfig

# Verify
kubectl get nodes -o wide
```

## Using USB Boot for Better Performance

SD cards are the bottleneck on Raspberry Pi clusters. USB SSDs provide dramatically better performance:

```bash
# Flash the Talos image to a USB drive instead
sudo dd if=metal-arm64.raw of=/dev/sdX bs=4M status=progress conv=fsync

# Update the machine config to use the USB disk
# The disk will typically be /dev/sda instead of /dev/mmcblk0
cat > rpi-usb-patch.yaml <<'EOF'
machine:
  install:
    disk: /dev/sda
    image: factory.talos.dev/installer/SCHEMATIC_ID:v1.7.0
EOF
```

For Pi 4, make sure USB boot is enabled in the EEPROM configuration. Pi 5 supports USB boot by default.

## Resource Considerations

Raspberry Pis have limited resources compared to cloud instances. Keep these limitations in mind:

- **RAM**: Pi 4 comes in 2GB, 4GB, and 8GB variants. Use 4GB minimum for workers, 4GB minimum for control plane nodes
- **CPU**: The ARM Cortex-A72 (Pi 4) or Cortex-A76 (Pi 5) is capable but not as fast as x86 server CPUs
- **Storage I/O**: SD cards are slow; USB SSDs are strongly recommended for anything beyond testing
- **Network**: Gigabit Ethernet is sufficient for most workloads

```yaml
# Set resource limits to avoid overwhelming Pi nodes
# Example deployment with Pi-appropriate limits
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      containers:
        - name: my-app
          image: my-app:latest
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
```

## Installing Lightweight Components

Choose lightweight alternatives for your Pi cluster:

```bash
# Use Flannel instead of Cilium for lower resource usage
kubectl apply -f https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml

# Use local-path-provisioner for storage
kubectl apply -f https://raw.githubusercontent.com/rancher/local-path-provisioner/v0.0.26/deploy/local-path-storage.yaml
```

## Conclusion

Running Talos Linux on Raspberry Pi brings enterprise-grade Kubernetes security to edge computing and homelab environments. The immutable, API-driven approach works especially well on Pis because it eliminates the SD card corruption issues that plague traditional Linux installations (since Talos does minimal writes to disk). With USB SSD boot and careful resource management, a Raspberry Pi Talos cluster can handle real workloads reliably. Start with a single Pi to learn the workflow, then scale up to a full cluster as your needs grow.
