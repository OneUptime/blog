# How to Set Up Talos Linux on Raspberry Pi 5

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Raspberry Pi 5, ARM64, Kubernetes, Single Board Computer

Description: A hands-on guide to running Talos Linux on the Raspberry Pi 5, covering image flashing, configuration, and cluster bootstrapping on the latest Pi hardware.

---

The Raspberry Pi 5 brings a significant performance leap over its predecessor. With the BCM2712 quad-core Cortex-A76 processor running at 2.4 GHz, up to 8 GB of RAM, and a dedicated I/O controller (the RP1 chip), the Pi 5 is a much more capable platform for running Kubernetes. Talos Linux runs well on this hardware, and the improved CPU and I/O performance makes the cluster noticeably snappier compared to the Pi 4.

This guide covers the complete setup process for getting Talos Linux running on a Raspberry Pi 5.

## Hardware Requirements

Here is what you need:

- One or more Raspberry Pi 5 boards (4 GB or 8 GB)
- MicroSD cards (32 GB minimum) or USB SSDs for better performance
- USB-C power supply rated at 5V/5A (the Pi 5 draws more power than the Pi 4)
- Ethernet cables and a switch
- A workstation with `talosctl` and `kubectl` installed

The Pi 5 requires a 5A power supply for full performance. Using the Pi 4's 3A supply will work but the board may throttle under heavy load.

## Key Differences from Pi 4

Before diving in, it is worth understanding what changed with the Pi 5 that affects Talos Linux:

- The RP1 I/O controller means network and USB devices are on a different bus topology
- The new PMIC (power management IC) changes how power states are handled
- PCIe support through the FPC connector enables NVMe SSDs
- The EEPROM update process is slightly different
- The bootloader supports network boot out of the box

## Step 1: Update the Bootloader

The Pi 5 uses a different bootloader than the Pi 4. Update it to the latest version for best Talos compatibility:

```bash
# If you have Raspberry Pi OS on the Pi 5
sudo apt update
sudo apt install rpi-eeprom
sudo rpi-eeprom-update -a
sudo reboot
```

You can also use the Raspberry Pi Imager to flash a bootloader update image. Select "Misc utility images" then "Bootloader" and choose the latest version.

## Step 2: Download the Talos Image

Talos provides ARM64 images that work on the Raspberry Pi 5. Use the generic ARM64 metal image with the RPi overlay:

```bash
# Download the SBC image for Raspberry Pi
curl -LO https://github.com/siderolabs/talos/releases/latest/download/metal-rpi_generic-arm64.raw.xz

# Decompress
xz -d metal-rpi_generic-arm64.raw.xz
```

If the generic image does not work with your Pi 5 revision, check the Talos release notes for a Pi 5-specific image or overlay.

## Step 3: Flash the Image

Write the image to your microSD card or USB drive:

```bash
# Identify the target device
# On macOS
diskutil list

# On Linux
lsblk

# Flash to SD card (replace /dev/sdX)
sudo dd if=metal-rpi_generic-arm64.raw of=/dev/sdX bs=4M status=progress conv=fsync

# Sync to make sure all data is written
sync
```

If you are using a USB SSD for better performance, flash the image to the SSD and connect it to the Pi 5 via USB 3.0. The Pi 5's USB 3.0 ports can sustain much higher I/O than the SD card slot.

## Step 4: NVMe Boot (Optional)

The Pi 5 supports NVMe SSDs through an M.2 HAT or third-party adapter board. NVMe provides the best storage performance by far. To use NVMe boot:

```bash
# First, update the bootloader to enable NVMe boot
# In the EEPROM config, set:
# BOOT_ORDER=0xf416
# This tries NVMe (6), then USB (4), then SD (1)
sudo rpi-eeprom-config --edit
```

Flash the Talos image to the NVMe drive:

```bash
# Flash to NVMe (typically /dev/nvme0n1)
sudo dd if=metal-rpi_generic-arm64.raw of=/dev/nvme0n1 bs=4M status=progress conv=fsync
```

The performance difference is substantial. Random read/write speeds on NVMe are 10-50x faster than SD cards, which makes a huge difference for etcd and container image pulls.

## Step 5: First Boot

Connect the ethernet cable and power supply, then power on the Pi. It will boot into Talos maintenance mode. Find the IP address using your router or a network scan:

```bash
# Scan the network
nmap -sn 192.168.1.0/24

# Look for the Pi 5's MAC address prefix
# Pi 5 uses D8:3A:DD prefix
arp -a | grep -i "d8:3a:dd"
```

## Step 6: Generate Machine Configuration

Create the Talos configuration files:

```bash
# For a single control plane node
talosctl gen config pi5-cluster https://<PI5_IP>:6443

# For SD card install
talosctl gen config pi5-cluster https://<PI5_IP>:6443 \
  --config-patch '[{"op": "add", "path": "/machine/install/disk", "value": "/dev/mmcblk0"}]'

# For NVMe install
talosctl gen config pi5-cluster https://<PI5_IP>:6443 \
  --config-patch '[{"op": "add", "path": "/machine/install/disk", "value": "/dev/nvme0n1"}]'
```

## Step 7: Apply Configuration

Apply the configuration to your Pi 5:

```bash
# Apply the control plane config
talosctl apply-config --insecure --nodes <PI5_IP> --file controlplane.yaml
```

The node will reboot and install Talos to the target disk. On NVMe, this takes about a minute. On SD card, expect 3-5 minutes.

## Step 8: Bootstrap and Verify

```bash
# Configure talosctl
talosctl config endpoint <PI5_IP>
talosctl config node <PI5_IP>
talosctl config merge talosconfig

# Bootstrap the cluster
talosctl bootstrap

# Wait for health
talosctl health --wait-timeout 10m

# Get kubeconfig
talosctl kubeconfig .

# Verify
kubectl get nodes
kubectl get pods -n kube-system
```

## Adding More Pi 5 Nodes

Scale out by adding worker nodes:

```bash
# Flash and boot additional Pi 5 boards
# Then apply worker config to each
talosctl apply-config --insecure --nodes <WORKER_IP> --file worker.yaml
```

You can mix Pi 5 and Pi 4 nodes in the same cluster. Kubernetes handles the scheduling transparently since both run ARM64.

## Performance Comparison with Pi 4

In practical testing, the Pi 5 shows meaningful improvements over the Pi 4 for Kubernetes workloads:

| Metric | Pi 4 (8GB) | Pi 5 (8GB) |
|--------|-----------|-----------|
| Cluster bootstrap time | 8-10 min | 3-5 min |
| Pod startup (nginx) | 15-20 sec | 5-8 sec |
| etcd write latency | 10-15 ms | 3-5 ms (NVMe) |
| Container image pull (100MB) | 30-45 sec | 10-15 sec |

The faster CPU, improved memory bandwidth, and NVMe support make the Pi 5 a significantly better Kubernetes node.

## Power Management

The Pi 5's power consumption is higher than the Pi 4. Under full Kubernetes load, expect:

- Idle: 3-4W
- Moderate load: 5-7W
- Full load: 8-10W

Make sure your power supply can handle the draw, especially if you are powering multiple Pis through a USB hub or PoE HAT.

```yaml
# You can configure power-related kernel parameters in the machine config
machine:
  sysctls:
    kernel.sched_energy_aware: "0"  # Disable energy-aware scheduling for max performance
```

## Thermal Management

The Pi 5 runs hotter than the Pi 4 due to its faster CPU. Talos does not have a way to control the fan directly (since there is no userspace), but the Pi 5's firmware handles fan control automatically when using the official active cooler.

Without cooling, the Pi 5 will thermal throttle under sustained Kubernetes workloads. The active cooler or a third-party heatsink with a fan is strongly recommended.

```bash
# Check for thermal throttling
talosctl -n <PI5_IP> dmesg | grep -i therm
```

## Troubleshooting

If the Pi 5 does not boot from the Talos image, the most common cause is an outdated bootloader. Update the EEPROM to the latest stable release using the Raspberry Pi Imager.

If you see network connectivity issues after boot, verify that your ethernet cable is plugged into the correct port. The Pi 5 has a different physical layout than the Pi 4 and it is easy to mistake the port positions.

If the cluster is slow to bootstrap, check that you are using a fast storage medium. Running the control plane on a slow SD card can cause etcd timeouts and bootstrap failures.

## Wrapping Up

The Raspberry Pi 5 is the best Pi yet for running Talos Linux and Kubernetes. The faster CPU, NVMe support, and improved I/O make it suitable not just for learning and testing, but for actual lightweight production workloads at the edge. Combined with Talos's minimal footprint and API-driven management, a cluster of Pi 5s gives you a surprisingly capable Kubernetes platform in a very small package.
