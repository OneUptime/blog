# How to Install Talos Linux on Pine64

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Pine64, ARM, Kubernetes, Single Board Computer

Description: Step-by-step instructions for installing Talos Linux on Pine64 boards to build ARM-based Kubernetes clusters.

---

Pine64 produces a range of affordable ARM-based single board computers that have gained a strong following among hobbyists and developers. Boards like the ROCKPro64, Quartz64, and the original Pine A64 offer solid specs at competitive prices. If you want to run Kubernetes on these boards without the overhead of a traditional Linux distribution, Talos Linux is an excellent choice.

This guide covers the entire process of getting Talos Linux running on Pine64 hardware, from image preparation through cluster bootstrapping.

## Why Choose Pine64 for Talos Linux?

Pine64 boards stand out for a few reasons. The ROCKPro64, for example, comes with up to 4GB of RAM, a hexa-core ARM processor, and support for PCIe storage. That is more than enough for running lightweight Kubernetes workloads. The Pine64 ecosystem also includes affordable NAS enclosures and cluster cases that make building multi-node setups convenient.

Talos Linux fits well here because it strips away everything you do not need. There is no package manager, no shell access, and no configuration drift to worry about. You get a Kubernetes node that boots quickly and stays consistent.

## Prerequisites

Gather the following before you begin:

- A Pine64 board (ROCKPro64 or Quartz64 recommended)
- A microSD card (16GB or larger) or eMMC module
- An SD card reader
- The `talosctl` command-line tool
- Ethernet connectivity for the Pine64 board
- A workstation running macOS or Linux

Set up `talosctl` on your workstation:

```bash
# Install talosctl
curl -sL https://talos.dev/install | sh

# Confirm it works
talosctl version --client
```

## Step 1: Download the Correct Image

Talos Linux provides generic ARM64 metal images that work with most ARM boards. Download the appropriate image for your Pine64 board:

```bash
# Download the ARM64 metal image
wget https://github.com/siderolabs/talos/releases/download/v1.9.0/metal-arm64.raw.xz

# Extract the image
xz -d metal-arm64.raw.xz
```

For boards like the ROCKPro64 that use the Rockchip platform, you may need to use the Talos Linux Image Factory to generate an image with the proper board overlay:

```bash
# Alternatively, use the Image Factory for board-specific images
# Visit https://factory.talos.dev and select your board
# Download the generated image with the correct device tree
```

## Step 2: Write the Image to Storage

Flash the image onto your microSD card or eMMC module:

```bash
# Find your SD card device
lsblk

# Flash the image (replace /dev/sdX carefully)
sudo dd if=metal-arm64.raw of=/dev/sdX bs=4M status=progress conv=fsync

# Make sure the write completes
sync
```

If you are using an eMMC module, you will need a USB-to-eMMC adapter to flash it from your workstation. The Pine64 store sells these adapters specifically for their boards.

## Step 3: Prepare the Board and Boot

Insert the storage media into your Pine64 board. Connect an Ethernet cable and power supply. If you have a serial console adapter (the Pine64 store sells USB serial cables for their boards), connect it so you can monitor the boot process.

```bash
# If using a serial console, connect at 1500000 baud for ROCKPro64
# or 115200 baud for other Pine64 boards
screen /dev/ttyUSB0 1500000
```

Power on the board. Talos Linux should boot within a minute or two and obtain an IP address from your DHCP server. You will see the assigned IP address on the serial console or connected display.

## Step 4: Generate Cluster Configuration

On your workstation, generate the Talos Linux configuration files:

```bash
# Generate configs for a cluster named pine-cluster
talosctl gen config pine-cluster https://<CONTROL_PLANE_IP>:6443

# You will get:
# controlplane.yaml - configuration for control plane nodes
# worker.yaml - configuration for worker nodes
# talosconfig - authentication config for talosctl
```

If you want to customize the configuration, you can edit the YAML files before applying them. Common customizations for Pine64 boards include adjusting the install disk path and network interface names.

## Step 5: Apply Configuration to the Node

Push the configuration to your Pine64 board:

```bash
# Point talosctl at your node
export TALOSCONFIG="talosconfig"

# Apply the control plane config
talosctl apply-config --insecure \
  --nodes <PINE64_IP> \
  --file controlplane.yaml

# The node will reboot with the new configuration
```

Wait for the board to reboot. This may take a couple of minutes on ARM hardware.

## Step 6: Bootstrap Kubernetes

After the node has rebooted and is running the applied configuration, initialize the Kubernetes cluster:

```bash
# Set your talosctl endpoints
talosctl config endpoint <PINE64_IP>
talosctl config node <PINE64_IP>

# Start the bootstrap process
talosctl bootstrap

# Monitor cluster health
talosctl health
```

The health check will wait for all Kubernetes components to become ready. On Pine64 hardware, expect this to take three to five minutes.

## Step 7: Access Your Cluster

Pull down the kubeconfig and verify your cluster:

```bash
# Retrieve the kubeconfig
talosctl kubeconfig ./kubeconfig

# List nodes
kubectl --kubeconfig=./kubeconfig get nodes

# Check system workloads
kubectl --kubeconfig=./kubeconfig get pods -n kube-system
```

## Building a Multi-Node Pine64 Cluster

Pine64 boards are great for multi-node clusters. If you have several boards, you can create a proper Kubernetes cluster with multiple control plane and worker nodes.

```bash
# Flash each board with the Talos image
# Boot them and note their IP addresses

# Apply control plane config to the first three boards
for ip in 192.168.1.101 192.168.1.102 192.168.1.103; do
  talosctl apply-config --insecure \
    --nodes $ip \
    --file controlplane.yaml
done

# Apply worker config to remaining boards
for ip in 192.168.1.104 192.168.1.105; do
  talosctl apply-config --insecure \
    --nodes $ip \
    --file worker.yaml
done
```

Only bootstrap etcd on the first control plane node. The others will join automatically.

## Storage Options

Pine64 boards support several storage options, and your choice matters for Kubernetes performance:

- **microSD**: Cheapest option but slowest. Fine for testing but not great for production workloads with heavy I/O.
- **eMMC**: Faster and more reliable than SD cards. A good middle ground for most use cases.
- **NVMe (ROCKPro64)**: The ROCKPro64 has a PCIe slot that accepts an NVMe adapter. This gives you the best performance for etcd and persistent volumes.

To configure Talos Linux to use a specific disk for installation, modify the machine config:

```yaml
# In controlplane.yaml or worker.yaml
machine:
  install:
    disk: /dev/mmcblk1  # Adjust to your target disk
    image: ghcr.io/siderolabs/installer:v1.9.0
```

## Networking Considerations

Pine64 boards typically have a single Gigabit Ethernet port. For Kubernetes networking, this is usually sufficient for development and light workloads. If you need more bandwidth, some Pine64 boards support USB Ethernet adapters for additional interfaces.

Talos Linux will use DHCP by default. If you prefer static IP addresses, configure them in the machine config:

```yaml
machine:
  network:
    interfaces:
      - interface: eth0
        addresses:
          - 192.168.1.100/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
```

## Troubleshooting

If your Pine64 board does not boot, the most common cause is a missing or incorrect device tree blob. Use the Talos Image Factory to generate an image specific to your board model. The factory includes overlays for popular Pine64 boards.

If the board boots but network connectivity fails, check your Ethernet cable and DHCP server. Some Pine64 boards require specific kernel modules for their Ethernet controllers, which should be included in the standard Talos ARM64 image.

For power-related issues, make sure you are using a power supply that can deliver enough current. The ROCKPro64 needs at least 3A at 12V, and underpowered boards can behave erratically.

## Conclusion

Pine64 boards combined with Talos Linux give you an affordable, secure, and maintainable Kubernetes platform. Whether you are building a home lab, an edge computing cluster, or a development environment, this combination delivers a clean experience without the baggage of a full Linux distribution. The simplicity of Talos Linux's API-driven management makes it especially appealing when running multiple boards that you want to manage consistently.
