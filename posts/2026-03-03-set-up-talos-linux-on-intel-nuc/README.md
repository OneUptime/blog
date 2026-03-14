# How to Set Up Talos Linux on Intel NUC

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Intel NUC, Kubernetes, Bare Metal, X86

Description: A complete walkthrough for setting up Talos Linux on Intel NUC mini PCs to run production-grade Kubernetes clusters.

---

Intel NUCs are compact, powerful mini PCs that make excellent Kubernetes nodes. Their small form factor, low power consumption, and desktop-class performance put them in a sweet spot between single board computers and full rack servers. When you combine an Intel NUC with Talos Linux, you get a production-capable Kubernetes node that fits in the palm of your hand.

This guide covers the complete setup process, from preparing the boot media to having a running Kubernetes cluster on your Intel NUC.

## Why Intel NUC for Kubernetes?

Intel NUCs pack real x86_64 processors, support up to 64GB of RAM (depending on the model), and include NVMe storage slots. Unlike ARM single board computers, you get native x86 compatibility, which means virtually every container image works without worrying about multi-architecture builds.

The NUC's power efficiency is another strong point. A typical NUC draws between 15 and 25 watts under load, which makes running a cluster of three or five NUCs practical from a power and cooling perspective.

Talos Linux is an ideal OS for NUCs because it eliminates the management overhead that comes with traditional Linux distributions. There is no SSH access, no package manager, and no chance of someone logging in and making ad hoc changes to the system.

## Prerequisites

Before starting, make sure you have:

- An Intel NUC (8th generation or newer recommended)
- At least 8GB of RAM installed in the NUC
- An NVMe or SATA SSD installed
- A USB flash drive (4GB minimum) for the installer
- Ethernet connectivity
- `talosctl` installed on your workstation
- A keyboard and monitor for initial BIOS configuration

```bash
# Install talosctl on your workstation
curl -sL https://talos.dev/install | sh

# Verify
talosctl version --client
```

## Step 1: Configure the NUC BIOS

Before installing Talos Linux, adjust a few BIOS settings on your NUC:

1. Power on the NUC and press F2 to enter BIOS setup
2. Under Boot, set the boot order to prioritize USB devices
3. Disable Secure Boot (or configure it with Talos Linux keys if you want Secure Boot)
4. Enable Wake-on-LAN if you want remote power management
5. Save and exit

These settings ensure the NUC can boot from your USB installer and that Talos Linux can start without Secure Boot issues.

## Step 2: Download and Create Boot Media

Download the Talos Linux ISO and write it to a USB drive:

```bash
# Download the Talos Linux ISO for x86_64
wget https://github.com/siderolabs/talos/releases/download/v1.9.0/metal-amd64.iso

# Write the ISO to a USB drive
# Find your USB device
lsblk

# Write the ISO (replace /dev/sdX with your USB device)
sudo dd if=metal-amd64.iso of=/dev/sdX bs=4M status=progress conv=fsync
sync
```

On macOS, you can use the following approach:

```bash
# On macOS, identify the USB device
diskutil list

# Unmount the device first
diskutil unmountDisk /dev/diskN

# Write the ISO
sudo dd if=metal-amd64.iso of=/dev/rdiskN bs=4m
sync
```

## Step 3: Boot from USB

Insert the USB drive into your Intel NUC and power it on. The NUC should boot from the USB drive and load Talos Linux. You will see the Talos Linux boot screen and eventually the maintenance mode interface showing the node's IP address.

If the NUC does not boot from USB, press F10 during startup to access the one-time boot menu and select your USB drive.

## Step 4: Generate Configuration

On your workstation, generate the Talos configuration files:

```bash
# Generate cluster configuration
talosctl gen config nuc-cluster https://<NUC_IP>:6443

# Files created:
# controlplane.yaml
# worker.yaml
# talosconfig
```

For Intel NUCs, you will likely want to customize the install disk and potentially the network configuration:

```yaml
# Edit controlplane.yaml
machine:
  install:
    disk: /dev/nvme0n1  # NVMe SSD
    image: ghcr.io/siderolabs/installer:v1.9.0
    wipe: true  # Clean install
  network:
    hostname: nuc-cp-01
    interfaces:
      - interface: eno1  # Intel NUC Ethernet
        dhcp: true
```

## Step 5: Apply Configuration and Install

Push the configuration to your NUC. Talos will install itself to the NVMe SSD:

```bash
# Set the talosconfig
export TALOSCONFIG="talosconfig"

# Apply the configuration - this triggers installation to disk
talosctl apply-config --insecure \
  --nodes <NUC_IP> \
  --file controlplane.yaml
```

The NUC will install Talos Linux to its SSD and reboot. Remove the USB drive when the NUC reboots so it boots from the SSD instead.

## Step 6: Bootstrap Kubernetes

After the NUC boots from its SSD with the applied configuration:

```bash
# Configure talosctl
talosctl config endpoint <NUC_IP>
talosctl config node <NUC_IP>

# Bootstrap the cluster
talosctl bootstrap

# Monitor health
talosctl health
```

On Intel NUC hardware, the bootstrap process is fast - typically under two minutes.

## Step 7: Access Your Cluster

```bash
# Get the kubeconfig
talosctl kubeconfig ./kubeconfig

# Verify everything is running
kubectl --kubeconfig=./kubeconfig get nodes
kubectl --kubeconfig=./kubeconfig get pods -A
```

## Building an HA Cluster with Multiple NUCs

Three Intel NUCs make a solid high-availability Kubernetes cluster. Here is how to set it up:

```bash
# Generate config with an HA endpoint
# Use a virtual IP or load balancer address
talosctl gen config nuc-cluster https://192.168.1.100:6443 \
  --config-patch '[{"op": "add", "path": "/machine/network/interfaces/0/vip", "value": {"ip": "192.168.1.100"}}]'

# Flash all three NUCs with Talos Linux via USB
# Boot them and note their IPs

# Apply control plane config to all three
for ip in 192.168.1.101 192.168.1.102 192.168.1.103; do
  talosctl apply-config --insecure \
    --nodes $ip \
    --file controlplane.yaml
done

# Bootstrap only the first node
talosctl config endpoint 192.168.1.101
talosctl config node 192.168.1.101
talosctl bootstrap
```

The virtual IP (VIP) feature in Talos Linux lets the control plane float between your NUCs, providing a stable endpoint even if one node goes down.

## Optimizing NUC Performance

Intel NUCs have several advantages you can leverage:

**NVMe Storage**: NUCs with NVMe SSDs give you excellent I/O for etcd and persistent volumes. This is a significant improvement over SD card-based setups on ARM boards.

**Power Management**: Configure the NUC BIOS to always power on after AC loss. This way, if there is a power outage and your UPS eventually dies, the NUC will restart automatically when power returns.

**Thermal Management**: NUCs have active cooling (small fans), but they can get warm under sustained load. Ensure adequate ventilation, especially if you stack multiple NUCs together.

```yaml
# You can tune kernel parameters for better performance
machine:
  sysctls:
    vm.swappiness: "0"
    net.core.somaxconn: "32768"
```

## Network Configuration

Many Intel NUCs have only one Ethernet port. If you need multiple network interfaces, you can add a USB Ethernet adapter or a Thunderbolt-to-Ethernet adapter:

```yaml
# Configure multiple interfaces
machine:
  network:
    interfaces:
      - interface: eno1
        dhcp: true
      - interface: enp0s20u1  # USB Ethernet adapter
        addresses:
          - 10.0.0.1/24
```

## Troubleshooting

If the NUC does not boot from USB, check that the BIOS boot order is correct and that Legacy Boot or UEFI boot mode matches what the Talos ISO expects. Modern Talos Linux images support UEFI boot, which is what most NUCs use.

If Talos installs but the NUC boots into a blank screen after removing the USB drive, check that the install disk path in your configuration matches the actual SSD device. Use `talosctl disks` while booted from USB to see available disks.

For network issues, Intel NUCs use Intel Ethernet controllers that are well-supported by the Linux kernel. If you have connectivity problems, check physical connections and DHCP server configuration first.

## Conclusion

Intel NUCs running Talos Linux deliver a compact, powerful, and secure Kubernetes platform. The x86_64 architecture means full container image compatibility, the NVMe storage provides excellent performance, and Talos Linux's immutable design keeps everything clean and manageable. Whether you are building a home lab, a small production cluster, or an edge deployment, the NUC plus Talos combination is hard to beat for its form factor.
