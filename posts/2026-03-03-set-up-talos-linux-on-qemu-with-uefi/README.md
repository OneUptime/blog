# How to Set Up Talos Linux on QEMU with UEFI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, QEMU, UEFI, Virtualization, Kubernetes, Development

Description: Complete guide to running Talos Linux on QEMU with UEFI boot for local development, testing, and learning Kubernetes.

---

QEMU is a versatile open-source machine emulator that runs on Linux, macOS, and Windows. Running Talos Linux on QEMU with UEFI boot is an excellent way to learn Talos, test configurations, and develop against a real Kubernetes cluster without needing cloud resources or dedicated hardware. This guide walks you through setting up a complete Talos cluster on QEMU.

## Why QEMU for Talos

QEMU gives you full control over the virtual hardware. You can specify exact CPU counts, memory sizes, disk configurations, and network topologies. Unlike managed VM solutions like VirtualBox or VMware Workstation, QEMU is fully scriptable from the command line, making it ideal for automated testing and CI/CD pipelines.

UEFI boot support through OVMF (Open Virtual Machine Firmware) is important because Talos Linux supports both BIOS and UEFI, and modern hardware almost exclusively uses UEFI. Testing with UEFI ensures your configurations work on real hardware.

## Prerequisites

Install the required packages on your system:

```bash
# On Ubuntu/Debian
sudo apt install qemu-system-x86 qemu-utils ovmf

# On Fedora
sudo dnf install qemu-system-x86 edk2-ovmf

# On macOS (using Homebrew)
brew install qemu

# On Arch Linux
sudo pacman -S qemu-full edk2-ovmf
```

You also need `talosctl` and `kubectl`:

```bash
# Install talosctl
curl -sL https://talos.dev/install | sh

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/
```

## Downloading the Talos Image

Download the metal image for QEMU:

```bash
# Download the Talos metal image (AMD64)
curl -LO https://github.com/siderolabs/talos/releases/download/v1.7.0/metal-amd64.raw.xz
xz -d metal-amd64.raw.xz
```

## Creating VM Disks

Create disk images for each node. Each node needs its own copy of the Talos image:

```bash
# Create directories for each node
mkdir -p ~/talos-qemu/{cp1,cp2,cp3,worker1,worker2}

# Create disk images (copy the base image for each node)
for node in cp1 cp2 cp3 worker1 worker2; do
  qemu-img create -f qcow2 -b ~/metal-amd64.raw -F raw ~/talos-qemu/$node/disk.qcow2 20G
done
```

Using qcow2 backing files keeps the disk images small. Each node's disk starts as a thin copy of the base image and only grows as changes are written.

## Setting Up the UEFI Firmware

Locate the OVMF firmware files on your system:

```bash
# On Ubuntu/Debian
ls /usr/share/OVMF/
# Look for OVMF_CODE.fd and OVMF_VARS.fd

# On Fedora
ls /usr/share/edk2/ovmf/
# Look for OVMF_CODE.fd

# Copy the VARS file for each VM (the CODE file is shared, but VARS must be per-VM)
for node in cp1 cp2 cp3 worker1 worker2; do
  cp /usr/share/OVMF/OVMF_VARS.fd ~/talos-qemu/$node/OVMF_VARS.fd
done
```

Each VM needs its own copy of OVMF_VARS.fd because the UEFI variables are stored there and differ between VMs.

## Creating a Network Bridge

For VMs to communicate with each other and with your host, create a bridge network:

```bash
# Create a bridge interface
sudo ip link add br0 type bridge
sudo ip addr add 10.5.0.1/24 dev br0
sudo ip link set br0 up

# Enable IP forwarding
sudo sysctl -w net.ipv4.ip_forward=1

# Set up NAT for internet access from VMs
sudo iptables -t nat -A POSTROUTING -s 10.5.0.0/24 -j MASQUERADE
```

Create TAP interfaces for each VM:

```bash
# Create TAP interfaces
for i in 0 1 2 3 4; do
  sudo ip tuntap add tap$i mode tap
  sudo ip link set tap$i master br0
  sudo ip link set tap$i up
done
```

## Launching the VMs

Start each VM with UEFI boot. Here is the command for the first control plane node:

```bash
# Launch the first control plane VM with UEFI
qemu-system-x86_64 \
  -name cp1 \
  -machine q35,accel=kvm \
  -cpu host \
  -smp 2 \
  -m 4096 \
  -drive if=pflash,format=raw,readonly=on,file=/usr/share/OVMF/OVMF_CODE.fd \
  -drive if=pflash,format=raw,file=$HOME/talos-qemu/cp1/OVMF_VARS.fd \
  -drive file=$HOME/talos-qemu/cp1/disk.qcow2,format=qcow2,if=virtio \
  -netdev tap,id=net0,ifname=tap0,script=no,downscript=no \
  -device virtio-net-pci,netdev=net0,mac=52:54:00:00:00:01 \
  -nographic \
  -serial mon:stdio &
```

Launch the remaining nodes with different MAC addresses and TAP interfaces:

```bash
# Launch CP2
qemu-system-x86_64 \
  -name cp2 -machine q35,accel=kvm -cpu host -smp 2 -m 4096 \
  -drive if=pflash,format=raw,readonly=on,file=/usr/share/OVMF/OVMF_CODE.fd \
  -drive if=pflash,format=raw,file=$HOME/talos-qemu/cp2/OVMF_VARS.fd \
  -drive file=$HOME/talos-qemu/cp2/disk.qcow2,format=qcow2,if=virtio \
  -netdev tap,id=net0,ifname=tap1,script=no,downscript=no \
  -device virtio-net-pci,netdev=net0,mac=52:54:00:00:00:02 \
  -nographic -serial mon:stdio &

# Launch Worker1
qemu-system-x86_64 \
  -name worker1 -machine q35,accel=kvm -cpu host -smp 4 -m 8192 \
  -drive if=pflash,format=raw,readonly=on,file=/usr/share/OVMF/OVMF_CODE.fd \
  -drive if=pflash,format=raw,file=$HOME/talos-qemu/worker1/OVMF_VARS.fd \
  -drive file=$HOME/talos-qemu/worker1/disk.qcow2,format=qcow2,if=virtio \
  -netdev tap,id=net0,ifname=tap3,script=no,downscript=no \
  -device virtio-net-pci,netdev=net0,mac=52:54:00:00:00:04 \
  -nographic -serial mon:stdio &
```

## Generating and Applying Configuration

Once the VMs are running, generate the Talos config and apply it:

```bash
# Generate config pointing to the first CP node
talosctl gen config qemu-cluster https://10.5.0.2:6443

# Apply config to control plane nodes
talosctl apply-config --insecure --nodes 10.5.0.2 --file controlplane.yaml
talosctl apply-config --insecure --nodes 10.5.0.3 --file controlplane.yaml
talosctl apply-config --insecure --nodes 10.5.0.4 --file controlplane.yaml

# Apply config to worker nodes
talosctl apply-config --insecure --nodes 10.5.0.5 --file worker.yaml
talosctl apply-config --insecure --nodes 10.5.0.6 --file worker.yaml

# Bootstrap the cluster
talosctl config endpoint 10.5.0.2
talosctl config node 10.5.0.2
talosctl bootstrap

# Get kubeconfig
talosctl kubeconfig
```

## Using a Startup Script

Automate the entire launch process with a script:

```bash
#!/bin/bash
# start-cluster.sh

OVMF_CODE=/usr/share/OVMF/OVMF_CODE.fd
BASE_DIR=$HOME/talos-qemu

# Array of node configurations: name, tap, mac, cpu, ram
nodes=(
  "cp1:tap0:52:54:00:00:00:01:2:4096"
  "cp2:tap1:52:54:00:00:00:02:2:4096"
  "cp3:tap2:52:54:00:00:00:03:2:4096"
  "worker1:tap3:52:54:00:00:00:04:4:8192"
  "worker2:tap4:52:54:00:00:00:05:4:8192"
)

for node_config in "${nodes[@]}"; do
  IFS=: read -r name tap mac cpu ram <<< "$node_config"
  echo "Starting $name..."
  qemu-system-x86_64 \
    -name "$name" \
    -machine q35,accel=kvm \
    -cpu host \
    -smp "$cpu" \
    -m "$ram" \
    -drive if=pflash,format=raw,readonly=on,file=$OVMF_CODE \
    -drive if=pflash,format=raw,file=$BASE_DIR/$name/OVMF_VARS.fd \
    -drive file=$BASE_DIR/$name/disk.qcow2,format=qcow2,if=virtio \
    -netdev tap,id=net0,ifname=$tap,script=no,downscript=no \
    -device virtio-net-pci,netdev=net0,mac=$mac \
    -daemonize \
    -serial file:$BASE_DIR/$name/console.log
done

echo "All nodes started. Check logs in $BASE_DIR/*/console.log"
```

## Shutting Down the Cluster

Gracefully shut down the VMs:

```bash
# Shutdown through Talos
talosctl shutdown --nodes 10.5.0.2,10.5.0.3,10.5.0.4,10.5.0.5,10.5.0.6

# Or kill the QEMU processes
pkill -f "qemu-system-x86_64.*talos"
```

## Performance Tips

For better VM performance:

- Always use `-accel kvm` (or `-accel hvf` on macOS) for hardware acceleration
- Use virtio drivers for disk and network (they are much faster than emulated hardware)
- Allocate enough memory - Talos itself is lightweight, but Kubernetes components need at least 2 GB per node
- Use SSD or NVMe storage on the host for VM disk images

## Conclusion

QEMU with UEFI boot provides a lightweight, scriptable environment for running Talos Linux clusters locally. It is perfect for development, testing, and learning. The bridge networking setup gives VMs real IPs on a local network, and the OVMF firmware ensures your UEFI configurations are tested properly. Once you have the startup script dialed in, spinning up a fresh cluster takes just a few minutes.
