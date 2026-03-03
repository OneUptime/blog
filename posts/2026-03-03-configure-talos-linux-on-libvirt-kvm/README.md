# How to Configure Talos Linux on libvirt/KVM

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, libvirt, KVM, Virtualization, Kubernetes, Linux

Description: Learn how to deploy and manage Talos Linux Kubernetes clusters using libvirt and KVM with virsh and virt-install tools.

---

libvirt is the standard virtualization management layer on Linux, providing a consistent API over KVM, QEMU, and other hypervisors. If you manage VMs with virsh, virt-manager, or the libvirt API, you can run Talos Linux clusters with the same tools you already know. This guide covers setting up Talos VMs using libvirt/KVM, including network configuration, storage pools, and cluster bootstrapping.

## Why libvirt Over Raw QEMU

While QEMU is the underlying hypervisor, libvirt adds a management layer that makes VM lifecycle operations much more convenient. You get persistent VM definitions, automatic network management with DHCP and DNS, storage pool management, and integration with tools like Terraform, Ansible, and Vagrant. For anything beyond a quick test, libvirt is the better choice.

## Prerequisites

Install libvirt and related tools:

```bash
# On Ubuntu/Debian
sudo apt install qemu-kvm libvirt-daemon-system libvirt-clients \
  virtinst bridge-utils virt-manager

# On Fedora
sudo dnf install @virtualization

# On Arch Linux
sudo pacman -S libvirt qemu-full virt-install virt-manager dnsmasq

# Enable and start libvirtd
sudo systemctl enable --now libvirtd

# Add your user to the libvirt group
sudo usermod -aG libvirt $USER
```

You also need `talosctl` and `kubectl` installed.

## Downloading the Talos Image

Download the metal image and place it in a libvirt storage pool:

```bash
# Download the Talos image
curl -LO https://github.com/siderolabs/talos/releases/download/v1.7.0/metal-amd64.raw.xz
xz -d metal-amd64.raw.xz

# Move it to the libvirt images directory
sudo mv metal-amd64.raw /var/lib/libvirt/images/talos-v1.7.0.raw
```

## Creating a Network

Define a libvirt network for the Talos cluster:

```xml
<!-- talos-network.xml -->
<network>
  <name>talos</name>
  <forward mode='nat'>
    <nat>
      <port start='1024' end='65535'/>
    </nat>
  </forward>
  <bridge name='virbr-talos' stp='on' delay='0'/>
  <ip address='10.10.0.1' netmask='255.255.255.0'>
    <dhcp>
      <range start='10.10.0.10' end='10.10.0.100'/>
      <!-- Static DHCP assignments for predictable IPs -->
      <host mac='52:54:00:aa:00:01' name='cp1' ip='10.10.0.11'/>
      <host mac='52:54:00:aa:00:02' name='cp2' ip='10.10.0.12'/>
      <host mac='52:54:00:aa:00:03' name='cp3' ip='10.10.0.13'/>
      <host mac='52:54:00:aa:00:11' name='worker1' ip='10.10.0.21'/>
      <host mac='52:54:00:aa:00:12' name='worker2' ip='10.10.0.22'/>
      <host mac='52:54:00:aa:00:13' name='worker3' ip='10.10.0.23'/>
    </dhcp>
  </ip>
</network>
```

```bash
# Define, start, and auto-start the network
virsh net-define talos-network.xml
virsh net-start talos
virsh net-autostart talos
```

Static DHCP assignments give each node a predictable IP address based on its MAC address. This makes the cluster configuration much easier.

## Creating VM Disks

Create disk images for each node:

```bash
# Create disk images backed by the Talos base image
for node in cp1 cp2 cp3; do
  qemu-img create -f qcow2 \
    -b /var/lib/libvirt/images/talos-v1.7.0.raw -F raw \
    /var/lib/libvirt/images/talos-$node.qcow2 50G
done

for node in worker1 worker2 worker3; do
  qemu-img create -f qcow2 \
    -b /var/lib/libvirt/images/talos-v1.7.0.raw -F raw \
    /var/lib/libvirt/images/talos-$node.qcow2 100G
done
```

## Creating VMs with virt-install

Use `virt-install` to create the VMs:

```bash
# Create control plane VMs
virt-install \
  --name talos-cp1 \
  --ram 4096 \
  --vcpus 2 \
  --os-variant generic \
  --disk path=/var/lib/libvirt/images/talos-cp1.qcow2,bus=virtio \
  --network network=talos,model=virtio,mac=52:54:00:aa:00:01 \
  --boot uefi \
  --graphics none \
  --console pty,target.type=serial \
  --noautoconsole \
  --import

virt-install \
  --name talos-cp2 \
  --ram 4096 \
  --vcpus 2 \
  --os-variant generic \
  --disk path=/var/lib/libvirt/images/talos-cp2.qcow2,bus=virtio \
  --network network=talos,model=virtio,mac=52:54:00:aa:00:02 \
  --boot uefi \
  --graphics none \
  --console pty,target.type=serial \
  --noautoconsole \
  --import

virt-install \
  --name talos-cp3 \
  --ram 4096 \
  --vcpus 2 \
  --os-variant generic \
  --disk path=/var/lib/libvirt/images/talos-cp3.qcow2,bus=virtio \
  --network network=talos,model=virtio,mac=52:54:00:aa:00:03 \
  --boot uefi \
  --graphics none \
  --console pty,target.type=serial \
  --noautoconsole \
  --import
```

Create worker VMs with more resources:

```bash
# Create worker VMs
for i in 1 2 3; do
  virt-install \
    --name talos-worker$i \
    --ram 8192 \
    --vcpus 4 \
    --os-variant generic \
    --disk path=/var/lib/libvirt/images/talos-worker$i.qcow2,bus=virtio \
    --network network=talos,model=virtio,mac=52:54:00:aa:00:1$i \
    --boot uefi \
    --graphics none \
    --console pty,target.type=serial \
    --noautoconsole \
    --import
done
```

## Generating Talos Configuration

Generate the machine configuration:

```bash
# Generate Talos config with VIP for the control plane
talosctl gen config libvirt-cluster https://10.10.0.100:6443 \
  --config-patch='[
    {"op": "add", "path": "/machine/network/interfaces", "value": [
      {
        "interface": "eth0",
        "dhcp": true,
        "vip": {
          "ip": "10.10.0.100"
        }
      }
    ]}
  ]'
```

The VIP (Virtual IP) address floats between control plane nodes, providing a stable endpoint for the Kubernetes API without needing an external load balancer.

## Applying Configuration

Apply the machine configuration to each node:

```bash
# Apply config to control plane nodes
talosctl apply-config --insecure --nodes 10.10.0.11 --file controlplane.yaml
talosctl apply-config --insecure --nodes 10.10.0.12 --file controlplane.yaml
talosctl apply-config --insecure --nodes 10.10.0.13 --file controlplane.yaml

# Apply config to worker nodes
talosctl apply-config --insecure --nodes 10.10.0.21 --file worker.yaml
talosctl apply-config --insecure --nodes 10.10.0.22 --file worker.yaml
talosctl apply-config --insecure --nodes 10.10.0.23 --file worker.yaml

# Bootstrap the cluster
talosctl config endpoint 10.10.0.100
talosctl config node 10.10.0.11
talosctl bootstrap

# Get kubeconfig
talosctl kubeconfig
```

## Managing VMs with virsh

Common management operations:

```bash
# List all VMs
virsh list --all

# View console output
virsh console talos-cp1

# Shutdown a VM gracefully
virsh shutdown talos-cp1

# Force power off
virsh destroy talos-cp1

# Start a VM
virsh start talos-cp1

# Take a snapshot
virsh snapshot-create-as talos-cp1 pre-upgrade --description "Before Talos upgrade"

# Revert to a snapshot
virsh snapshot-revert talos-cp1 pre-upgrade
```

## Adding Extra Disks

If you want to test storage solutions like Rook/Ceph, add extra disks to worker nodes:

```bash
# Create extra disk images
for i in 1 2 3; do
  qemu-img create -f qcow2 /var/lib/libvirt/images/talos-worker$i-data.qcow2 50G
done

# Attach the disks to running VMs
for i in 1 2 3; do
  virsh attach-disk talos-worker$i \
    /var/lib/libvirt/images/talos-worker$i-data.qcow2 \
    vdb --driver qemu --subdriver qcow2 --persistent
done
```

## Terraform Integration

For infrastructure-as-code, use the libvirt Terraform provider:

```hcl
# main.tf
terraform {
  required_providers {
    libvirt = {
      source = "dmacvicar/libvirt"
    }
  }
}

provider "libvirt" {
  uri = "qemu:///system"
}

resource "libvirt_volume" "talos_base" {
  name   = "talos-base.raw"
  source = "/var/lib/libvirt/images/talos-v1.7.0.raw"
  pool   = "default"
}

resource "libvirt_volume" "worker_disk" {
  count          = 3
  name           = "talos-worker-${count.index + 1}.qcow2"
  base_volume_id = libvirt_volume.talos_base.id
  size           = 107374182400  # 100 GB
  pool           = "default"
}

resource "libvirt_domain" "worker" {
  count  = 3
  name   = "talos-worker-${count.index + 1}"
  memory = 8192
  vcpu   = 4

  disk {
    volume_id = libvirt_volume.worker_disk[count.index].id
  }

  network_interface {
    network_name = "talos"
    mac          = "52:54:00:aa:00:${format("%02x", count.index + 17)}"
  }

  boot_device {
    dev = ["hd"]
  }

  firmware = "/usr/share/OVMF/OVMF_CODE.fd"
}
```

## Cleanup

To tear down the cluster:

```bash
# Stop and remove all VMs
for vm in talos-cp1 talos-cp2 talos-cp3 talos-worker1 talos-worker2 talos-worker3; do
  virsh destroy $vm 2>/dev/null
  virsh undefine $vm --nvram
done

# Remove disk images
rm -f /var/lib/libvirt/images/talos-*.qcow2

# Remove the network
virsh net-destroy talos
virsh net-undefine talos
```

## Conclusion

libvirt/KVM provides a production-quality virtualization layer for running Talos Linux clusters on Linux hosts. The combination of static DHCP assignments, UEFI boot support, and virsh management commands gives you a convenient and repeatable workflow. Whether you are using this for development, testing, or running a small production cluster on a powerful server, libvirt handles the VM lifecycle while Talos handles the Kubernetes lifecycle. The Terraform integration makes it easy to version control your entire infrastructure.
