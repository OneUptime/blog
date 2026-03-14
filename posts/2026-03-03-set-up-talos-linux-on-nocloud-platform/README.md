# How to Set Up Talos Linux on Nocloud Platform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Nocloud, Cloud-init, Kubernetes, Virtualization

Description: A practical guide to deploying Talos Linux using the nocloud datasource for bare metal and local virtualization environments.

---

The nocloud platform in Talos Linux refers to a deployment method that uses the cloud-init nocloud datasource for providing machine configuration. This approach is useful when you are running Talos Linux on platforms that do not have native cloud provider support but still want a cloud-init-like provisioning experience. It works well with local hypervisors, custom virtualization setups, and bare metal servers.

This guide explains how to deploy and configure Talos Linux using the nocloud platform type.

## What Is the Nocloud Datasource?

The nocloud datasource is a simple mechanism from cloud-init that reads configuration from a local source rather than a cloud provider's metadata service. Configuration can come from:

- A mounted ISO/CD-ROM with config files
- A local filesystem partition with a specific label
- A network URL passed as a kernel parameter

Talos Linux uses this datasource to obtain its machine configuration during boot, which makes it flexible enough to work in environments that do not have cloud APIs.

## When to Use Nocloud

The nocloud platform is the right choice when:

- You are running Talos on a local hypervisor like KVM/QEMU, Proxmox, or Xen without cloud-init integration
- You want to provision bare metal machines with a configuration CD
- You are using a hosting provider that supports custom ISOs but not cloud provider metadata
- You need a generic provisioning method that works across different platforms

## Prerequisites

Make sure you have:

- A machine or VM to install Talos on
- `talosctl` installed on your workstation
- The Talos Linux nocloud image
- A way to attach virtual media (for VMs) or burn CDs (for bare metal)

```bash
# Install talosctl
curl -sL https://talos.dev/install | sh

# Verify
talosctl version --client
```

## Step 1: Download the Nocloud Image

Talos provides a nocloud-specific image that is configured to read from the nocloud datasource:

```bash
# Download the nocloud image
wget https://github.com/siderolabs/talos/releases/download/v1.9.0/nocloud-amd64.raw.xz

# Decompress it
xz -d nocloud-amd64.raw.xz
```

For ARM64 platforms:

```bash
# ARM64 variant
wget https://github.com/siderolabs/talos/releases/download/v1.9.0/nocloud-arm64.raw.xz
xz -d nocloud-arm64.raw.xz
```

## Step 2: Generate Machine Configuration

Generate the Talos configuration files:

```bash
# Generate configuration
talosctl gen config nocloud-cluster https://<CONTROL_PLANE_IP>:6443

# Files generated:
# controlplane.yaml
# worker.yaml
# talosconfig
```

## Step 3: Create the Nocloud Configuration ISO

The nocloud datasource reads configuration from an ISO with a specific volume label. Create one:

```bash
# Create a directory for the nocloud config
mkdir -p nocloud-config

# Copy the machine config
cp controlplane.yaml nocloud-config/user-data

# Create the metadata file
cat > nocloud-config/meta-data << 'META'
instance-id: talos-cp-01
local-hostname: talos-cp-01
META

# Create the ISO with the cidata volume label
# On Linux
genisoimage -output nocloud-config.iso \
  -volid cidata \
  -joliet -rock \
  nocloud-config/user-data \
  nocloud-config/meta-data

# On macOS
hdiutil makehybrid -o nocloud-config.iso \
  -hfs -joliet -iso \
  -default-volume-name cidata \
  nocloud-config/
```

The volume label `cidata` is important. The nocloud datasource looks for this specific label when scanning for configuration.

## Step 4: Deploy on a Virtual Machine

Here is how to use the nocloud image with common hypervisors:

### QEMU/KVM

```bash
# Create a disk from the nocloud image
cp nocloud-amd64.raw talos-disk.raw
qemu-img resize talos-disk.raw 20G

# Boot the VM with the config ISO attached
qemu-system-x86_64 \
  -m 4096 \
  -cpu host \
  -smp 2 \
  -drive file=talos-disk.raw,format=raw,if=virtio \
  -cdrom nocloud-config.iso \
  -net nic,model=virtio \
  -net bridge,br=br0 \
  -enable-kvm
```

### Proxmox

```bash
# Upload the nocloud image to Proxmox storage
# Then create a VM

# Create the VM
qm create 100 \
  --name talos-cp-01 \
  --memory 4096 \
  --cores 2 \
  --net0 virtio,bridge=vmbr0

# Import the disk image
qm importdisk 100 nocloud-amd64.raw local-lvm

# Attach the disk
qm set 100 --scsi0 local-lvm:vm-100-disk-0

# Upload and attach the config ISO
# First upload nocloud-config.iso to Proxmox storage
qm set 100 --ide2 local:iso/nocloud-config.iso,media=cdrom

# Set boot order
qm set 100 --boot order=scsi0

# Start the VM
qm start 100
```

### libvirt/virt-manager

```bash
# Create the VM using virt-install
virt-install \
  --name talos-cp-01 \
  --memory 4096 \
  --vcpus 2 \
  --disk path=nocloud-amd64.raw,format=raw \
  --cdrom nocloud-config.iso \
  --network bridge=br0 \
  --os-variant linux2022 \
  --boot hd \
  --noautoconsole
```

## Step 5: Using Network-Based Configuration

Instead of creating a configuration ISO, you can pass the configuration URL as a kernel parameter:

```bash
# Host the configuration on an HTTP server
cp controlplane.yaml /var/www/html/talos/controlplane.yaml

# Boot Talos with the config URL as a kernel parameter
# Add to your boot configuration:
# talos.config=http://192.168.1.10/talos/controlplane.yaml
```

This method is cleaner for environments where you do not want to manage ISO files for each machine. The Talos Linux boot process will fetch the configuration from the HTTP endpoint.

## Step 6: Bootstrap the Cluster

Once the node is running with the applied configuration:

```bash
# Configure talosctl
talosctl config endpoint <NODE_IP>
talosctl config node <NODE_IP>

# Bootstrap
talosctl bootstrap

# Check health
talosctl health

# Get kubeconfig
talosctl kubeconfig ./kubeconfig
kubectl --kubeconfig=./kubeconfig get nodes
```

## Creating Multiple Nocloud Configs

For multi-node clusters, create separate ISOs for each node:

```bash
# Script to generate per-node config ISOs
for i in 1 2 3; do
  mkdir -p "nocloud-cp-${i}"

  # Copy the control plane config
  cp controlplane.yaml "nocloud-cp-${i}/user-data"

  # Create node-specific metadata
  cat > "nocloud-cp-${i}/meta-data" << META
instance-id: talos-cp-0${i}
local-hostname: talos-cp-0${i}
META

  # Generate the ISO
  genisoimage -output "nocloud-cp-${i}.iso" \
    -volid cidata \
    -joliet -rock \
    "nocloud-cp-${i}/user-data" \
    "nocloud-cp-${i}/meta-data"
done

# Same for workers
for i in 1 2; do
  mkdir -p "nocloud-worker-${i}"
  cp worker.yaml "nocloud-worker-${i}/user-data"

  cat > "nocloud-worker-${i}/meta-data" << META
instance-id: talos-worker-0${i}
local-hostname: talos-worker-0${i}
META

  genisoimage -output "nocloud-worker-${i}.iso" \
    -volid cidata \
    -joliet -rock \
    "nocloud-worker-${i}/user-data" \
    "nocloud-worker-${i}/meta-data"
done
```

## Network Configuration with Nocloud

If your environment does not have DHCP, you can include network configuration in the nocloud data:

```bash
# Create a network-config file
cat > nocloud-config/network-config << 'NETCFG'
version: 2
ethernets:
  eth0:
    addresses:
      - 192.168.1.100/24
    gateway4: 192.168.1.1
    nameservers:
      addresses:
        - 8.8.8.8
        - 8.8.4.4
NETCFG

# Include it in the ISO
genisoimage -output nocloud-config.iso \
  -volid cidata \
  -joliet -rock \
  nocloud-config/user-data \
  nocloud-config/meta-data \
  nocloud-config/network-config
```

## Troubleshooting

If Talos does not pick up the nocloud configuration, verify that:

1. The ISO volume label is exactly `cidata` (case-sensitive)
2. The files are named `user-data` and `meta-data` (with hyphens)
3. The ISO is attached as a CD-ROM device, not a disk
4. The machine config in `user-data` is valid YAML

Check if Talos can see the config source:

```bash
# Check Talos logs for nocloud detection
talosctl dmesg | grep -i nocloud
talosctl dmesg | grep -i "config"
```

If using network-based config and it fails to fetch, ensure the HTTP server is reachable from the Talos node's network and that there are no firewall rules blocking access.

## Conclusion

The nocloud platform in Talos Linux provides a flexible provisioning method that works across many different environments. Whether you are running local VMs, working with Proxmox, or deploying on bare metal with configuration media, the nocloud approach gives you a standardized way to deliver machine configurations. It bridges the gap between cloud-native provisioning and traditional bare metal deployment, letting you use the same Talos Linux workflow regardless of where your machines are running.
