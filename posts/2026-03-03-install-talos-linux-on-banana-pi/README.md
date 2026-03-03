# How to Install Talos Linux on Banana Pi

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Banana Pi, ARM, Kubernetes, Single Board Computer

Description: Learn how to install and configure Talos Linux on Banana Pi boards for building compact Kubernetes clusters.

---

Banana Pi boards offer a cost-effective path into ARM-based computing. With models like the BPI-M5, BPI-R3, and BPI-M4, these boards provide enough horsepower for running Kubernetes workloads in compact environments. Pairing a Banana Pi with Talos Linux gives you a minimal, secure, and API-driven Kubernetes node without the overhead of managing a full Linux distribution.

This guide walks through the complete process of getting Talos Linux up and running on a Banana Pi board.

## Why Banana Pi with Talos Linux?

Banana Pi boards are manufactured by SinoVoip and come in various configurations. Some models feature dual Ethernet ports, making them interesting for network-focused applications. Others offer eMMC storage and decent RAM for their price point.

Talos Linux is a perfect fit for these boards because it has a small footprint. There is no SSH daemon, no package manager, and no unnecessary services running. Every interaction happens through the Talos API, which means you manage your board the same way whether it is sitting on your desk or deployed at a remote site.

## What You Will Need

Prepare the following before you start:

- A Banana Pi board (BPI-M5 or BPI-R3 recommended for Kubernetes)
- A microSD card (16GB minimum) or eMMC storage
- An SD card reader connected to your workstation
- A wired Ethernet connection
- The `talosctl` binary on your workstation
- A power supply appropriate for your board model

Install `talosctl` first:

```bash
# Install the talosctl CLI
curl -sL https://talos.dev/install | sh

# Check the version
talosctl version --client
```

## Step 1: Get the Talos Linux Image

Download the ARM64 metal image from the Talos Linux releases page:

```bash
# Download the generic ARM64 image
wget https://github.com/siderolabs/talos/releases/download/v1.9.0/metal-arm64.raw.xz

# Decompress it
xz -d metal-arm64.raw.xz
```

Some Banana Pi boards use Amlogic or MediaTek SoCs that require specific device tree configurations. If the generic image does not boot on your board, you will need to use the Talos Image Factory:

```bash
# Visit https://factory.talos.dev
# Select your specific Banana Pi model
# Download the custom image with the right device tree overlay
```

The Image Factory approach is recommended for Banana Pi boards since their SoC variety means a single generic image does not always work out of the box.

## Step 2: Flash the Image

Write the Talos Linux image to your SD card or eMMC:

```bash
# Identify your target device
lsblk

# Write the image to the SD card
# IMPORTANT: Replace /dev/sdX with your actual device
sudo dd if=metal-arm64.raw of=/dev/sdX bs=4M status=progress conv=fsync

# Ensure everything is written to disk
sync
```

If you are using an eMMC module, you will need a compatible adapter. Banana Pi sells eMMC-to-USB adapters that work with their boards.

## Step 3: Connect and Boot

Insert the flashed storage into your Banana Pi. Connect the Ethernet cable and power supply. If your board has an HDMI port, connect a monitor to see the boot output.

Talos Linux will boot and configure the network interface through DHCP. Within a minute or two, you should see the node's IP address displayed on the screen.

If you do not have a monitor connected, check your DHCP server or router admin page for new leases:

```bash
# On many routers, you can scan the local network
nmap -sn 192.168.1.0/24

# Or check ARP tables
arp -a
```

## Step 4: Generate Machine Configuration

From your workstation, create the configuration files that Talos Linux needs:

```bash
# Generate configuration for your cluster
talosctl gen config banana-cluster https://<CONTROL_PLANE_IP>:6443

# This produces:
# controlplane.yaml
# worker.yaml
# talosconfig
```

You can customize the generated files. For Banana Pi boards, you might want to specify the correct install disk:

```yaml
# Edit controlplane.yaml
machine:
  install:
    disk: /dev/mmcblk0  # Common for eMMC on Banana Pi
    image: ghcr.io/siderolabs/installer:v1.9.0
```

## Step 5: Apply the Configuration

Send the configuration to your Banana Pi node:

```bash
# Set the talosconfig path
export TALOSCONFIG="talosconfig"

# Apply control plane configuration
talosctl apply-config --insecure \
  --nodes <BANANA_PI_IP> \
  --file controlplane.yaml
```

The node will process the configuration and reboot. Watch for it to come back online with the new configuration applied.

## Step 6: Bootstrap the Kubernetes Cluster

After the node reboots, initialize the cluster:

```bash
# Configure endpoints
talosctl config endpoint <BANANA_PI_IP>
talosctl config node <BANANA_PI_IP>

# Bootstrap etcd and start the cluster
talosctl bootstrap

# Wait for all components to be healthy
talosctl health
```

On ARM boards, the bootstrap can take several minutes. The health command will poll until everything is ready or until it times out.

## Step 7: Get Your Kubeconfig

Retrieve the kubeconfig to start using kubectl:

```bash
# Download the kubeconfig
talosctl kubeconfig ./kubeconfig

# Test cluster access
kubectl --kubeconfig=./kubeconfig get nodes
kubectl --kubeconfig=./kubeconfig get pods -A
```

## Working with Banana Pi's Dual Ethernet

Some Banana Pi models, like the BPI-R3, have dual Ethernet ports. This is useful for separating management traffic from pod network traffic:

```yaml
# Configure dual network interfaces in the machine config
machine:
  network:
    interfaces:
      # Management interface
      - interface: eth0
        dhcp: true
      # Pod network interface
      - interface: eth1
        addresses:
          - 10.0.0.1/24
```

This separation can improve security and performance, especially in edge deployments where the Kubernetes traffic should not mix with management operations.

## Storage Performance Tips

Banana Pi boards vary in their storage options. Here is how to get the best performance:

For boards with eMMC, always prefer eMMC over SD cards. The random I/O performance is significantly better, and etcd is particularly sensitive to disk latency.

```bash
# Check disk performance on your board
# After the node is running, you can use talosctl
talosctl dmesg | grep -i mmc
```

If your Banana Pi model supports USB 3.0, you can attach an external SSD for additional storage:

```yaml
# Mount an external disk for persistent volumes
machine:
  disks:
    - device: /dev/sda
      partitions:
        - mountpoint: /var/mnt/storage
```

## Handling Board-Specific Firmware

Banana Pi boards sometimes need updated firmware for best compatibility. Before installing Talos Linux, make sure your board's bootloader firmware is up to date. Check the Banana Pi wiki for firmware update instructions specific to your model.

For boards using U-Boot, the boot order might need adjustment:

```bash
# If your board boots from eMMC by default but you want SD card boot,
# you may need to clear the eMMC boot partition
# This is done BEFORE flashing Talos Linux
```

## Troubleshooting

If the board does not boot at all, verify that your board model is supported by the ARM64 Talos image. Some older Banana Pi models use 32-bit ARM processors, which are not compatible with Talos Linux.

If you see the Talos boot screen but the node never becomes reachable, check that your Ethernet cable is plugged into the correct port. On dual-Ethernet boards, the primary management interface may not be the one you expect.

For thermal issues during heavy workloads, add a heatsink to your Banana Pi's SoC. Kubernetes control plane components can push these boards hard, and thermal throttling will degrade performance.

## Conclusion

Installing Talos Linux on a Banana Pi gives you an affordable Kubernetes node that is easy to manage and secure by default. The combination works well for home labs, edge computing, and development environments. With Talos Linux handling the operating system complexity, you can focus on your Kubernetes workloads rather than system administration tasks. The API-driven approach means you can manage one board or twenty boards the same way, which is exactly what you want when scaling out a cluster.
