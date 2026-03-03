# How to Install Talos Linux on Libre Computer Board

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Libre Computer, ARM, Kubernetes, Single Board Computer

Description: A practical guide to installing Talos Linux on Libre Computer boards for lightweight Kubernetes deployments.

---

Libre Computer boards, sometimes known by their codenames like Le Potato, Renegade, and Sweet Potato, have carved out a niche as Raspberry Pi alternatives with competitive specifications and open-source friendly designs. If you are looking to run Kubernetes on these boards without the hassle of managing a traditional Linux installation, Talos Linux is a natural fit.

This article covers the entire process of installing Talos Linux on a Libre Computer board, configuring it, and bootstrapping a Kubernetes cluster.

## About Libre Computer Boards

Libre Computer produces several board models based on Amlogic and Rockchip SoCs. The most popular models include:

- **Le Potato (AML-S905X-CC)**: An affordable board with 2GB RAM and an Amlogic S905X processor
- **Renegade (ROC-RK3328-CC)**: Features a Rockchip RK3328 and up to 4GB RAM
- **Sweet Potato (AML-S905X-CC-V2)**: An updated version of Le Potato

These boards run ARM64 processors, which means they are compatible with Talos Linux's ARM64 images. The key advantage of Libre Computer boards is their focus on mainline Linux kernel support, which translates to better compatibility with operating systems like Talos Linux.

## Prerequisites

You will need:

- A Libre Computer board (Le Potato, Renegade, or compatible model)
- A microSD card (16GB minimum)
- An SD card writer
- Ethernet cable and network connection
- A power supply for your board (5V/3A for most models)
- `talosctl` installed on your workstation

```bash
# Install talosctl
curl -sL https://talos.dev/install | sh

# Verify
talosctl version --client
```

## Step 1: Download the Talos Image

Libre Computer boards use ARM64 processors, so you need the ARM64 metal image:

```bash
# Download the ARM64 image
wget https://github.com/siderolabs/talos/releases/download/v1.9.0/metal-arm64.raw.xz

# Extract the compressed image
xz -d metal-arm64.raw.xz
```

Since Libre Computer boards use specific SoCs, you may get better results with a board-specific image from the Talos Image Factory:

```bash
# The Image Factory lets you generate images with the right
# device tree overlays for your specific board model
# Visit: https://factory.talos.dev
```

For Le Potato boards, the Amlogic overlay is typically needed. For Renegade boards, the Rockchip RK3328 overlay applies.

## Step 2: Flash the Storage

Write the Talos image to your microSD card:

```bash
# List available block devices
lsblk

# Flash the image - be very careful with the device path
sudo dd if=metal-arm64.raw of=/dev/sdX bs=4M status=progress conv=fsync

# Flush disk buffers
sync
```

Libre Computer boards generally boot from microSD by default. If your board has an eMMC slot, you can flash to eMMC for better performance, but you will need an eMMC-to-USB adapter.

## Step 3: First Boot

Insert the microSD card and connect your Libre Computer board to the network via Ethernet. Attach power and let it boot.

Talos Linux will start up and request an IP address via DHCP. You can observe the boot sequence through:

- An HDMI-connected display
- A serial console (UART pins on the board header)

```bash
# Connect via serial console if available
# Most Libre Computer boards use 115200 baud
screen /dev/ttyUSB0 115200
```

Once Talos boots, note the IP address displayed on the console. If you do not have a console, scan your network:

```bash
# Find the board on your network
nmap -sn 192.168.1.0/24
```

## Step 4: Create the Machine Configuration

Generate the Talos configuration from your workstation:

```bash
# Generate configuration files
talosctl gen config libre-cluster https://<BOARD_IP>:6443

# Output files:
# - controlplane.yaml (for control plane nodes)
# - worker.yaml (for worker nodes)
# - talosconfig (client configuration)
```

You might want to customize the configuration for your specific board. Here is an example of setting the install disk:

```yaml
# In controlplane.yaml or worker.yaml
machine:
  install:
    disk: /dev/mmcblk0
    image: ghcr.io/siderolabs/installer:v1.9.0
  # Optionally set a hostname
  network:
    hostname: libre-cp-01
```

## Step 5: Push the Configuration

Apply the configuration to your board:

```bash
# Set the talosconfig
export TALOSCONFIG="talosconfig"

# Apply the configuration
talosctl apply-config --insecure \
  --nodes <BOARD_IP> \
  --file controlplane.yaml
```

The board will reboot and come back up with the applied configuration. Give it a few minutes.

## Step 6: Initialize the Cluster

Once the board is back online, bootstrap the Kubernetes cluster:

```bash
# Set endpoint and node
talosctl config endpoint <BOARD_IP>
talosctl config node <BOARD_IP>

# Bootstrap etcd
talosctl bootstrap

# Watch the health status
talosctl health
```

The health check monitors etcd, the API server, and other critical components. On ARM hardware, this typically takes three to five minutes to complete.

## Step 7: Use Your Cluster

Get the kubeconfig and start deploying workloads:

```bash
# Retrieve kubeconfig
talosctl kubeconfig ./kubeconfig

# Verify nodes
kubectl --kubeconfig=./kubeconfig get nodes

# Check system pods
kubectl --kubeconfig=./kubeconfig get pods -A
```

## Building a Libre Computer Cluster

One of the appealing things about Libre Computer boards is their price. You can build a multi-node cluster without spending much. Here is how to expand your cluster:

```bash
# Flash additional boards with the same Talos image
# Boot them and note their IP addresses

# Add control plane nodes (for HA - use 3 total)
talosctl apply-config --insecure \
  --nodes <SECOND_CP_IP> \
  --file controlplane.yaml

talosctl apply-config --insecure \
  --nodes <THIRD_CP_IP> \
  --file controlplane.yaml

# Add worker nodes
talosctl apply-config --insecure \
  --nodes <WORKER_IP> \
  --file worker.yaml
```

## Memory Management on Low-RAM Boards

The Le Potato only has 2GB of RAM, which is tight for Kubernetes. Here are some strategies to make it work:

Running a control plane node on a 2GB board is possible but leaves little room for workloads. Consider using 2GB boards as workers and a more capable board (or VM) as your control plane.

If you must run a control plane on 2GB of RAM, you can tune the kubelet:

```yaml
# In the machine config
machine:
  kubelet:
    extraArgs:
      system-reserved: cpu=200m,memory=256Mi
      kube-reserved: cpu=200m,memory=256Mi
```

The Renegade with 4GB of RAM is much more comfortable for control plane duties.

## Kernel and Device Tree Considerations

Libre Computer boards benefit from their focus on mainline Linux kernel support. This means that most hardware features work well with the standard Talos Linux kernel. However, there are some things to be aware of:

- **GPU acceleration**: Not relevant for Talos Linux since there is no desktop environment
- **WiFi**: Most Libre Computer boards do not have onboard WiFi, which is fine since Talos Linux prefers Ethernet
- **USB**: USB 2.0 and 3.0 ports should work out of the box for external storage

If you need specific kernel modules that are not included in the default Talos image, you can build a custom image:

```bash
# Use the Talos Linux imager to build a custom image
# with additional kernel modules or system extensions
docker run --rm -v $(pwd)/_out:/out \
  ghcr.io/siderolabs/imager:v1.9.0 metal \
  --arch arm64 \
  --extra-kernel-arg net.ifnames=0
```

## Troubleshooting

**Board does not boot**: Verify that your microSD card is not corrupted. Try flashing again with a different card. Some cheaper SD cards have compatibility issues with certain board models.

**No network connectivity**: Libre Computer boards use various Ethernet controllers. Most are supported by the Talos kernel, but if yours is not, check the Talos Linux GitHub issues for your specific board model.

**Slow performance**: If running from a microSD card, I/O will be the bottleneck. Use a high-quality UHS-I or UHS-II card for better results. Class 10 cards without UHS ratings are noticeably slower.

**Boot loops**: This usually indicates a configuration error. Reset by reflashing the SD card with a fresh Talos image and starting over.

## Conclusion

Libre Computer boards paired with Talos Linux give you an affordable, secure Kubernetes platform that is easy to manage. The boards' focus on mainline kernel support makes them reliable hosts for Talos Linux, and the API-driven management model means you spend less time on system administration and more time on your actual workloads. Whether you build a single-node test cluster or a multi-node home lab, this combination delivers a clean and predictable experience.
