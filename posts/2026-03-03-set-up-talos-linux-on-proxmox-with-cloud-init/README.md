# How to Set Up Talos Linux on Proxmox with Cloud-Init

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Proxmox, Cloud-init, Virtualization, Kubernetes, Homelab

Description: Learn how to deploy Talos Linux virtual machines on Proxmox VE using cloud-init for automated configuration and quick cluster provisioning.

---

Proxmox Virtual Environment is one of the most popular open-source hypervisors for home labs and small-to-medium enterprise environments. If you are already running Proxmox, deploying Talos Linux VMs on it is an excellent way to get a production-quality Kubernetes cluster without any additional hardware. Using cloud-init for automated provisioning makes the process repeatable and fast. This guide covers the complete setup.

## Why Proxmox for Talos Linux

Proxmox gives you a mature, well-tested virtualization platform with a web UI, API access, clustering, and storage management. Running Talos on Proxmox means you get all the benefits of an immutable Kubernetes OS while keeping the flexibility to manage your virtual infrastructure through a familiar interface.

Cloud-init support in Proxmox lets you pass configuration data to VMs at boot time. While Talos does not use traditional cloud-init (it has its own machine configuration), Proxmox's cloud-init integration can be used to pass the Talos machine config through the user-data mechanism.

## Prerequisites

You need:

- A Proxmox VE 7.x or 8.x installation
- At least 32 GB RAM and 4 CPU cores available for VMs
- Storage space for VM disks (at least 200 GB recommended)
- `talosctl` and `kubectl` installed on your workstation
- Network access from your workstation to the Proxmox network

## Downloading the Talos Image

Download the Talos Linux image for the nocloud platform, which is compatible with Proxmox's cloud-init:

```bash
# Download the Talos nocloud image on your Proxmox host
wget https://github.com/siderolabs/talos/releases/download/v1.7.0/nocloud-amd64.raw.xz

# Decompress the image
xz -d nocloud-amd64.raw.xz
```

## Creating the VM Template

Create a VM template that you can clone for each node. This approach is much faster than creating VMs from scratch each time:

```bash
# Create a new VM (on the Proxmox host)
qm create 9000 --name talos-template --memory 4096 --cores 2 --net0 virtio,bridge=vmbr0

# Import the Talos disk image to the VM
qm importdisk 9000 nocloud-amd64.raw local-lvm

# Attach the disk to the VM
qm set 9000 --scsihw virtio-scsi-pci --scsi0 local-lvm:vm-9000-disk-0

# Set the boot order to use the imported disk
qm set 9000 --boot order=scsi0

# Add a cloud-init drive for passing configuration
qm set 9000 --ide2 local-lvm:cloudinit

# Configure the serial console (required for Talos)
qm set 9000 --serial0 socket --vga serial0

# Enable the QEMU guest agent
qm set 9000 --agent enabled=1

# Convert to template
qm template 9000
```

The serial console configuration is important. Talos outputs its boot messages and API status to the serial console, which you can view through the Proxmox web UI.

## Generating Talos Configuration

Generate the machine configuration for your cluster:

```bash
# Generate Talos configuration
talosctl gen config proxmox-cluster https://10.0.0.100:6443

# This creates controlplane.yaml, worker.yaml, and talosconfig
```

If you want a virtual IP for the control plane endpoint (so you do not need an external load balancer), configure VIP in the machine config:

```yaml
# vip-patch.yaml
machine:
  network:
    interfaces:
      - interface: eth0
        dhcp: true
        vip:
          ip: 10.0.0.100
```

```bash
# Patch the control plane config with VIP
talosctl machineconfig patch controlplane.yaml --patch @vip-patch.yaml -o controlplane-vip.yaml
```

## Creating Control Plane VMs

Clone the template for each control plane node:

```bash
# Clone the template for control plane nodes
qm clone 9000 101 --name talos-cp-1 --full
qm clone 9000 102 --name talos-cp-2 --full
qm clone 9000 103 --name talos-cp-3 --full

# Resize the disks (50 GB for control plane)
qm resize 101 scsi0 50G
qm resize 102 scsi0 50G
qm resize 103 scsi0 50G

# Set resources for control plane nodes
qm set 101 --memory 4096 --cores 2
qm set 102 --memory 4096 --cores 2
qm set 103 --memory 4096 --cores 2

# Start the VMs
qm start 101
qm start 102
qm start 103
```

## Applying Talos Configuration

After the VMs boot into maintenance mode, apply the machine configuration. Find the IP addresses of your VMs from the Proxmox network or DHCP server:

```bash
# Apply configuration to each control plane node
talosctl apply-config --insecure --nodes 10.0.0.11 --file controlplane-vip.yaml
talosctl apply-config --insecure --nodes 10.0.0.12 --file controlplane-vip.yaml
talosctl apply-config --insecure --nodes 10.0.0.13 --file controlplane-vip.yaml

# Bootstrap the first control plane node
talosctl config endpoint 10.0.0.100
talosctl config node 10.0.0.11
talosctl bootstrap

# Get the kubeconfig
talosctl kubeconfig
```

## Creating Worker VMs

Clone and configure worker nodes the same way:

```bash
# Clone worker nodes
qm clone 9000 201 --name talos-worker-1 --full
qm clone 9000 202 --name talos-worker-2 --full
qm clone 9000 203 --name talos-worker-3 --full

# Resize disks (100 GB for workers to hold more container images)
qm resize 201 scsi0 100G
qm resize 202 scsi0 100G
qm resize 203 scsi0 100G

# Set resources for worker nodes (more resources than control plane)
qm set 201 --memory 8192 --cores 4
qm set 202 --memory 8192 --cores 4
qm set 203 --memory 8192 --cores 4

# Start worker VMs
qm start 201
qm start 202
qm start 203
```

Apply the worker configuration:

```bash
# Apply worker configuration
talosctl apply-config --insecure --nodes 10.0.0.21 --file worker.yaml
talosctl apply-config --insecure --nodes 10.0.0.22 --file worker.yaml
talosctl apply-config --insecure --nodes 10.0.0.23 --file worker.yaml
```

## Automation with Proxmox API

For larger deployments, use the Proxmox API to automate VM creation:

```bash
# Create and configure a VM using the Proxmox API
curl -X POST "https://proxmox:8006/api2/json/nodes/pve/qemu/9000/clone" \
  -H "Authorization: PVEAPIToken=user@pam!token=<token-value>" \
  -d "newid=104" \
  -d "name=talos-cp-4" \
  -d "full=1"
```

You can also use Terraform with the Proxmox provider for full infrastructure-as-code management:

```hcl
# main.tf
resource "proxmox_vm_qemu" "talos_worker" {
  count       = 3
  name        = "talos-worker-${count.index + 1}"
  target_node = "pve"
  clone       = "talos-template"
  cores       = 4
  memory      = 8192

  disk {
    type    = "scsi"
    storage = "local-lvm"
    size    = "100G"
  }

  network {
    model  = "virtio"
    bridge = "vmbr0"
  }
}
```

## GPU Passthrough

If you have a GPU in your Proxmox host and need it for ML workloads, configure PCI passthrough:

```bash
# Configure IOMMU in the Proxmox host (add to kernel command line)
# intel_iommu=on (for Intel) or amd_iommu=on (for AMD)

# Pass the GPU to a specific VM
qm set 201 --hostpci0 01:00,pcie=1
```

Use the Talos NVIDIA extension image for the VM that gets the GPU.

## Backup and Snapshots

Proxmox makes it easy to backup and snapshot your Talos VMs:

```bash
# Take a snapshot of a VM
qm snapshot 101 pre-upgrade --vmstate 1

# Create a backup
vzdump 101 --storage backup-storage --mode snapshot
```

Snapshots are particularly useful before upgrading Talos. If something goes wrong, you can roll back instantly.

## Conclusion

Proxmox and Talos Linux together create a powerful, cost-effective Kubernetes platform. The template-based workflow makes provisioning new nodes fast, and cloud-init integration handles the initial configuration. Whether you are running a home lab or a small production environment, this combination gives you enterprise-grade Kubernetes with minimal overhead. The Proxmox API and Terraform integration make it easy to scale up as your needs grow.
