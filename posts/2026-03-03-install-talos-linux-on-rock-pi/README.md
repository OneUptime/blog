# How to Install Talos Linux on Rock Pi

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Rock Pi, ARM, Kubernetes, Single Board Computer

Description: A complete guide to installing Talos Linux on Rock Pi single board computers for running Kubernetes at the edge.

---

Rock Pi boards from Radxa have become popular choices for home labs, edge computing, and lightweight Kubernetes clusters. With their ARM-based processors and compact form factor, they provide a solid foundation for running containerized workloads. Talos Linux, a purpose-built operating system for Kubernetes, pairs well with these boards because of its minimal footprint and immutable design.

In this guide, we will walk through the full process of installing Talos Linux on a Rock Pi board, from downloading the correct image to bootstrapping your first Kubernetes cluster.

## Why Use Talos Linux on Rock Pi?

Running Kubernetes on single board computers used to be a painful experience. You would install a general-purpose Linux distribution, then spend hours configuring kubeadm, managing packages, and dealing with system drift. Talos Linux removes all of that complexity. It ships with only the components needed to run Kubernetes, and it is managed entirely through an API rather than SSH.

Rock Pi boards, particularly the Rock Pi 4 and Rock Pi X, offer enough RAM and processing power to handle small Kubernetes workloads. When combined with Talos Linux, you get a secure, predictable, and easy-to-manage cluster node.

## Prerequisites

Before getting started, make sure you have the following ready:

- A Rock Pi board (Rock Pi 4B or newer recommended, with at least 2GB RAM)
- A microSD card (16GB minimum, 32GB recommended) or an eMMC module
- A computer with an SD card reader for flashing
- The `talosctl` CLI tool installed on your workstation
- A stable network connection for the Rock Pi

Install `talosctl` if you do not already have it:

```bash
# Download the latest talosctl binary
curl -sL https://talos.dev/install | sh

# Verify the installation
talosctl version --client
```

## Step 1: Download the Talos Linux ARM Image

Talos Linux provides pre-built images for ARM64 platforms. You need to download the correct image for your Rock Pi board.

```bash
# Download the Talos Linux metal ARM64 image
# Replace v1.9.0 with the latest version
wget https://github.com/siderolabs/talos/releases/download/v1.9.0/metal-arm64.raw.xz

# Decompress the image
xz -d metal-arm64.raw.xz
```

If your Rock Pi board requires a specific overlay or firmware, check the Talos Linux documentation for board-specific images. Some Rock Pi models need additional device tree blobs to boot correctly.

## Step 2: Flash the Image to Your SD Card

With the image downloaded, you need to write it to your microSD card or eMMC module.

```bash
# Identify your SD card device
# On macOS
diskutil list

# On Linux
lsblk

# Write the image to the SD card (replace /dev/sdX with your device)
sudo dd if=metal-arm64.raw of=/dev/sdX bs=4M status=progress conv=fsync

# Sync to ensure all data is written
sync
```

Be extremely careful with the `dd` command. Writing to the wrong device can destroy data on your primary drive. Double-check the device path before proceeding.

On macOS, you can also use balenaEtcher for a graphical flashing experience, which provides built-in verification.

## Step 3: Boot the Rock Pi

Insert the flashed SD card into your Rock Pi and power it on. Connect the board to your network via Ethernet for the most reliable experience. Talos Linux will boot and attempt to acquire an IP address through DHCP.

You can monitor the boot process by connecting a serial console or HDMI display to the board. Talos Linux will show its IP address on the console once it has booted.

If you do not have a display connected, check your router's DHCP lease table to find the IP address assigned to the Rock Pi.

## Step 4: Generate the Talos Configuration

Now that your Rock Pi is running Talos Linux, you need to generate the machine configuration files.

```bash
# Generate configuration files for your cluster
talosctl gen config my-rock-cluster https://<CONTROL_PLANE_IP>:6443

# This creates three files:
# - controlplane.yaml (for control plane nodes)
# - worker.yaml (for worker nodes)
# - talosconfig (for talosctl authentication)
```

Replace `<CONTROL_PLANE_IP>` with the IP address of the Rock Pi that will serve as your control plane node. If you are running a single-node cluster, this will be the only Rock Pi's address.

## Step 5: Apply the Configuration

Apply the generated configuration to your Rock Pi node:

```bash
# Set the talosctl endpoint and node
export TALOSCONFIG="talosconfig"

# Apply the control plane configuration
talosctl apply-config --insecure \
  --nodes <ROCK_PI_IP> \
  --file controlplane.yaml
```

After applying the configuration, the Rock Pi will reboot and begin setting up the Kubernetes control plane components.

## Step 6: Bootstrap the Cluster

Once the node has rebooted and is running with the new configuration, bootstrap the etcd cluster:

```bash
# Configure talosctl to talk to your cluster
talosctl config endpoint <ROCK_PI_IP>
talosctl config node <ROCK_PI_IP>

# Bootstrap the cluster
talosctl bootstrap

# Watch the bootstrap progress
talosctl health
```

The bootstrap process takes a few minutes on ARM hardware. Be patient while etcd initializes and the Kubernetes API server starts up.

## Step 7: Retrieve the Kubeconfig

Once the cluster is healthy, grab the kubeconfig file to interact with Kubernetes:

```bash
# Get the kubeconfig
talosctl kubeconfig ./kubeconfig

# Verify the cluster is running
kubectl --kubeconfig=./kubeconfig get nodes

# Check that system pods are running
kubectl --kubeconfig=./kubeconfig get pods -A
```

## Adding Worker Nodes

If you have additional Rock Pi boards, you can add them as worker nodes:

```bash
# Flash each additional Rock Pi with the same Talos image
# Boot them and wait for DHCP

# Apply the worker configuration to each new node
talosctl apply-config --insecure \
  --nodes <WORKER_IP> \
  --file worker.yaml
```

Each worker node will automatically join the cluster after applying the configuration.

## Performance Considerations

ARM-based boards have some limitations compared to full x86 servers. Here are a few tips for getting the best performance:

- Use an eMMC module instead of an SD card for better I/O performance
- If your Rock Pi supports NVMe storage (like the Rock Pi 4C+), use that for etcd data
- Keep your workloads lightweight - these boards work best for edge computing and development clusters
- Consider using three or more boards for a proper HA control plane setup

## Troubleshooting Common Issues

If the Rock Pi does not boot, check that you downloaded the correct ARM64 image and that the SD card was flashed properly. Some Rock Pi models have specific boot order requirements that may need firmware updates.

If the node boots but cannot be reached over the network, verify that your Ethernet cable is connected and your DHCP server is functioning. Talos Linux does not enable WiFi by default, so a wired connection is necessary during initial setup.

For kernel compatibility issues with specific Rock Pi hardware, you may need to build a custom Talos Linux image with the appropriate device tree overlays. The Talos Linux image factory at factory.talos.dev can help with this.

## Conclusion

Running Talos Linux on Rock Pi boards gives you a clean, secure, and maintainable Kubernetes platform in a compact form factor. The combination of Talos Linux's immutable design and Rock Pi's capable ARM hardware creates a solid foundation for edge deployments, home labs, and development clusters. Once you have the first node running, scaling out by adding more boards is straightforward.
