# How to Set Up Talos Linux on Raspberry Pi 4

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Raspberry Pi 4, ARM64, Kubernetes, Edge Computing

Description: Step-by-step instructions for installing Talos Linux on a Raspberry Pi 4 and bootstrapping a Kubernetes cluster on affordable ARM hardware.

---

The Raspberry Pi 4 is one of the most popular single-board computers for homelab projects, and it turns out to be a solid platform for running Talos Linux. With up to 8 GB of RAM and a quad-core ARM Cortex-A72 processor, the Pi 4 has enough power to run a lightweight Kubernetes node. Pair a few of them together and you have a real Kubernetes cluster for learning, testing, or even running small production workloads.

This guide walks through every step of getting Talos Linux running on a Raspberry Pi 4, from flashing the image to bootstrapping a fully functional Kubernetes cluster.

## What You Need

Before starting, gather these items:

- One or more Raspberry Pi 4 (4 GB or 8 GB RAM recommended)
- MicroSD cards (32 GB minimum, Class 10 or better)
- Ethernet cables and a network switch
- A power supply for each Pi (official USB-C power supply recommended)
- A computer with an SD card reader for flashing
- `talosctl` and `kubectl` installed on your workstation

While you can technically run Talos on a 2 GB Pi 4, the control plane components alone will use most of that memory. Stick with 4 GB or 8 GB models for a better experience.

## Step 1: Update the Raspberry Pi EEPROM

The Raspberry Pi 4 has an EEPROM that controls the boot process. Make sure it is updated to the latest version for best compatibility:

```bash
# On a Raspberry Pi running Raspberry Pi OS
sudo apt update
sudo apt install rpi-eeprom
sudo rpi-eeprom-update -a
sudo reboot
```

If you do not have a Raspberry Pi OS installation handy, you can use the Raspberry Pi Imager tool to flash the EEPROM update utility.

You also want to make sure the boot order is set to boot from SD card first:

```bash
# Check current boot order
vcgencmd bootloader_config | grep BOOT_ORDER

# Set boot order to SD card (1) then USB (4)
# BOOT_ORDER=0xf14
sudo -E rpi-eeprom-config --edit
```

## Step 2: Download the Talos Linux Image

Talos provides a pre-built image specifically for the Raspberry Pi 4:

```bash
# Download the Raspberry Pi 4 image (ARM64)
curl -LO https://github.com/siderolabs/talos/releases/latest/download/metal-rpi_generic-arm64.raw.xz

# Decompress it
xz -d metal-rpi_generic-arm64.raw.xz
```

The `rpi_generic` image includes the specific kernel modules and firmware needed for the Raspberry Pi's hardware, including the Broadcom WiFi/Bluetooth chip and the VideoCore GPU.

## Step 3: Flash the Image to the SD Card

Use `dd` or a tool like Balena Etcher to write the image to your microSD card:

```bash
# Find your SD card device (be very careful here)
# On macOS
diskutil list

# On Linux
lsblk

# Flash the image (replace /dev/sdX with your actual device)
sudo dd if=metal-rpi_generic-arm64.raw of=/dev/sdX bs=4M status=progress conv=fsync

# On macOS, use rdisk for faster writes
sudo dd if=metal-rpi_generic-arm64.raw of=/dev/rdiskN bs=4m
```

Double-check that you are writing to the correct device. Writing to the wrong disk will destroy data.

## Step 4: Boot the Raspberry Pi

Insert the microSD card into the Raspberry Pi and connect:

1. Ethernet cable to your network
2. Power supply

You do not need a monitor or keyboard. Talos is entirely headless and managed through its API. The Pi will boot, obtain an IP address via DHCP, and display the Talos maintenance screen if you do have a monitor connected.

Find the Pi's IP address from your router's DHCP lease table, or use a network scanner:

```bash
# Scan your local network for the Pi
# Using nmap
nmap -sn 192.168.1.0/24

# Or using arp
arp -a | grep -i "dc:a6:32\|d8:3a:dd\|e4:5f:01\|28:cd:c1"
```

The Pi's MAC address starts with one of the Raspberry Pi Foundation's registered prefixes.

## Step 5: Generate the Talos Configuration

Create the machine configuration for your cluster. For a single-node setup, you can run the control plane on one Pi. For a multi-node cluster, designate one Pi as the control plane and the rest as workers.

```bash
# Generate configs
talosctl gen config pi-cluster https://<PI_IP>:6443 \
  --config-patch '[{"op": "add", "path": "/machine/install/disk", "value": "/dev/mmcblk0"}]'
```

The config patch sets the install disk to `/dev/mmcblk0`, which is the SD card device on the Raspberry Pi.

## Step 6: Apply the Configuration

Apply the control plane configuration to your first Pi:

```bash
# Apply config to the control plane node
talosctl apply-config --insecure --nodes <PI_IP> --file controlplane.yaml
```

The Pi will reboot and begin installing Talos to the SD card. This process takes a few minutes. You can watch the progress if you have a monitor attached, or just wait and try connecting.

## Step 7: Configure talosctl and Bootstrap

Set up your local `talosctl` configuration and bootstrap the cluster:

```bash
# Set up talosctl
talosctl config endpoint <PI_IP>
talosctl config node <PI_IP>
talosctl config merge talosconfig

# Wait for the node to be ready
talosctl health --wait-timeout 10m

# Bootstrap etcd
talosctl bootstrap
```

The bootstrap process on a Raspberry Pi 4 takes longer than on x86 hardware. Give it 5-10 minutes before worrying that something went wrong.

## Step 8: Get the Kubeconfig

Once the cluster is healthy, grab the kubeconfig:

```bash
# Retrieve kubeconfig
talosctl kubeconfig .

# Verify the cluster
kubectl get nodes

# Check system pods
kubectl get pods -n kube-system
```

Your single-node cluster should show one node in Ready state.

## Adding Worker Nodes

For additional Raspberry Pis as worker nodes, flash each one with the same Talos image and apply the worker configuration:

```bash
# Apply worker config to each additional Pi
talosctl apply-config --insecure --nodes <WORKER_PI_IP> --file worker.yaml
```

Each worker will join the cluster automatically after installing and rebooting.

## Performance Tuning for Raspberry Pi 4

The Raspberry Pi 4 has some quirks that are worth addressing:

### SD Card Wear

SD cards have limited write endurance. To reduce wear, you can adjust the Talos configuration to limit logging:

```yaml
# Reduce log verbosity in machine config
machine:
  logging:
    destinations:
      - endpoint: "udp://log-server:514"
        format: json_lines
  sysctls:
    vm.dirty_writeback_centisecs: "1500"
```

### USB Boot for Better Performance

If you want better I/O performance, consider booting from a USB SSD instead of an SD card. Update the EEPROM boot order to try USB first, then flash the Talos image to a USB drive instead.

### CPU Throttling

The Raspberry Pi 4 throttles the CPU when it gets too hot. A heatsink or active cooling fan makes a noticeable difference in sustained performance. Without cooling, you might see the CPU drop from 1.5 GHz to 600 MHz under load.

```bash
# Check CPU temperature on a running Talos node
talosctl -n <PI_IP> dmesg | grep -i thermal
```

### Memory Considerations

On a 4 GB Pi running a control plane node, you will have roughly 2-2.5 GB available for workloads after the system and Kubernetes components take their share. Plan your deployments accordingly and set resource limits on your pods.

## Troubleshooting

If the Pi does not boot at all, check that the EEPROM is updated and the image was flashed correctly. A corrupted flash is the most common issue. Try re-flashing with Balena Etcher for a more reliable write.

If the Pi boots but you cannot reach the Talos API, verify that your ethernet cable is connected and check the DHCP lease. Some networks block traffic between devices, so make sure your router is not doing client isolation.

If the cluster bootstrap times out, it is likely a resource issue. The Pi 4 is significantly slower than typical server hardware, so increase timeout values and be patient.

## Wrapping Up

The Raspberry Pi 4 might be a tiny computer, but it runs Talos Linux and Kubernetes remarkably well. For homelab setups, learning environments, and small-scale edge deployments, a cluster of Pi 4s running Talos gives you a real Kubernetes experience at a fraction of the cost of traditional hardware. The setup is straightforward, and once running, you manage everything through the same `talosctl` and `kubectl` tools you would use on any other Talos cluster.
