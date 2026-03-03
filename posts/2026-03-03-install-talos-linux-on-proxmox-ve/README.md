# How to Install Talos Linux on Proxmox VE

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Proxmox, Virtualization, Kubernetes, Homelab

Description: Deploy Talos Linux on Proxmox VE for a secure Kubernetes cluster in your homelab or on-premises infrastructure.

---

Proxmox VE is a popular open-source virtualization platform, especially among homelab enthusiasts and small businesses. It provides a web-based management interface and supports both KVM virtual machines and LXC containers. Running Talos Linux on Proxmox VE gives you a production-grade Kubernetes cluster on your own hardware. This guide walks through the complete setup process.

## Prerequisites

You should have:

- A Proxmox VE server (version 7.0 or later) with at least 32GB RAM
- Network access to the Proxmox host
- SSH access to the Proxmox server (for initial setup)

Install the client tools on your workstation:

```bash
# Install talosctl
curl -sL https://talos.dev/install | sh

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl && sudo mv kubectl /usr/local/bin/
```

## Downloading the Talos Image

Download the Talos ISO or the nocloud image to your Proxmox server:

```bash
# SSH into your Proxmox server
ssh root@proxmox-server

# Download the Talos ISO to the ISO storage
cd /var/lib/vz/template/iso/
wget https://github.com/siderolabs/talos/releases/download/v1.7.0/talos-amd64.iso

# Alternatively, download the nocloud image for cloud-init-like provisioning
cd /var/lib/vz/template/
wget https://github.com/siderolabs/talos/releases/download/v1.7.0/nocloud-amd64.raw.xz
xz -d nocloud-amd64.raw.xz
```

## Creating VMs Using the ISO Method

The ISO method is the most straightforward approach. You boot from the Talos ISO, and the node enters maintenance mode where it waits for configuration via the Talos API.

You can create VMs through the Proxmox web UI or using the command line:

```bash
# SSH into Proxmox and create VMs using qm commands

# Create control plane VM 1
qm create 201 \
  --name talos-cp-1 \
  --memory 8192 \
  --cores 4 \
  --sockets 1 \
  --cpu host \
  --net0 virtio,bridge=vmbr0 \
  --scsihw virtio-scsi-pci \
  --scsi0 local-lvm:50,discard=on \
  --ide2 local:iso/talos-amd64.iso,media=cdrom \
  --boot order=ide2 \
  --ostype l26 \
  --agent enabled=0

# Create control plane VM 2
qm create 202 \
  --name talos-cp-2 \
  --memory 8192 \
  --cores 4 \
  --sockets 1 \
  --cpu host \
  --net0 virtio,bridge=vmbr0 \
  --scsihw virtio-scsi-pci \
  --scsi0 local-lvm:50,discard=on \
  --ide2 local:iso/talos-amd64.iso,media=cdrom \
  --boot order=ide2 \
  --ostype l26 \
  --agent enabled=0

# Create control plane VM 3
qm create 203 \
  --name talos-cp-3 \
  --memory 8192 \
  --cores 4 \
  --sockets 1 \
  --cpu host \
  --net0 virtio,bridge=vmbr0 \
  --scsihw virtio-scsi-pci \
  --scsi0 local-lvm:50,discard=on \
  --ide2 local:iso/talos-amd64.iso,media=cdrom \
  --boot order=ide2 \
  --ostype l26 \
  --agent enabled=0

# Create worker VMs
for i in 1 2 3; do
  VMID=$((210 + i))
  qm create ${VMID} \
    --name talos-worker-${i} \
    --memory 16384 \
    --cores 4 \
    --sockets 1 \
    --cpu host \
    --net0 virtio,bridge=vmbr0 \
    --scsihw virtio-scsi-pci \
    --scsi0 local-lvm:100,discard=on \
    --ide2 local:iso/talos-amd64.iso,media=cdrom \
    --boot order=ide2 \
    --ostype l26 \
    --agent enabled=0
done
```

Start all VMs:

```bash
# Start all Talos VMs
for vmid in 201 202 203 211 212 213; do
  qm start ${vmid}
  echo "Started VM ${vmid}"
done
```

## Generating Talos Configuration

On your workstation, generate the Talos configuration:

```bash
# Choose your cluster endpoint
# This should be a VIP or the IP of a load balancer
CLUSTER_ENDPOINT="https://192.168.1.100:6443"

# Generate configuration
talosctl gen config talos-proxmox-cluster "${CLUSTER_ENDPOINT}" \
  --output-dir _out

# Create a Proxmox-specific patch
cat > proxmox-patch.yaml <<'EOF'
machine:
  install:
    disk: /dev/sda
    image: ghcr.io/siderolabs/installer:v1.7.0
EOF

# Apply patches
talosctl machineconfig patch _out/controlplane.yaml \
  --patch @proxmox-patch.yaml \
  --output _out/controlplane-patched.yaml

talosctl machineconfig patch _out/worker.yaml \
  --patch @proxmox-patch.yaml \
  --output _out/worker-patched.yaml
```

## Applying Configuration to Nodes

When VMs boot from the Talos ISO, they enter maintenance mode and display their IP address on the console (visible in the Proxmox web UI). Use these IPs to apply the configuration:

```bash
# Check the console of each VM in the Proxmox web UI
# to find the DHCP-assigned IP addresses

# Apply configuration to control plane nodes
talosctl apply-config --insecure --nodes 192.168.1.11 \
  --file _out/controlplane-patched.yaml

talosctl apply-config --insecure --nodes 192.168.1.12 \
  --file _out/controlplane-patched.yaml

talosctl apply-config --insecure --nodes 192.168.1.13 \
  --file _out/controlplane-patched.yaml

# Apply configuration to worker nodes
talosctl apply-config --insecure --nodes 192.168.1.21 \
  --file _out/worker-patched.yaml

talosctl apply-config --insecure --nodes 192.168.1.22 \
  --file _out/worker-patched.yaml

talosctl apply-config --insecure --nodes 192.168.1.23 \
  --file _out/worker-patched.yaml
```

After applying the configuration, each node will install Talos to the disk and reboot. You should then detach the ISO from each VM:

```bash
# SSH into Proxmox and remove the ISO from each VM
for vmid in 201 202 203 211 212 213; do
  qm set ${vmid} --ide2 none
  qm set ${vmid} --boot order=scsi0
done
```

## Using the Nocloud Image Method

An alternative approach uses the nocloud image format, which is more automated:

```bash
# On the Proxmox server, create a VM from the nocloud image
qm create 201 --name talos-cp-1 --memory 8192 --cores 4 \
  --net0 virtio,bridge=vmbr0 --scsihw virtio-scsi-pci

# Import the nocloud disk image
qm importdisk 201 /var/lib/vz/template/nocloud-amd64.raw local-lvm

# Attach the imported disk
qm set 201 --scsi0 local-lvm:vm-201-disk-0,discard=on

# Set boot order
qm set 201 --boot order=scsi0

# Start the VM
qm start 201
```

## Bootstrapping the Cluster

Once all nodes have installed and rebooted:

```bash
# Configure talosctl
talosctl config merge _out/talosconfig
talosctl config endpoint 192.168.1.11
talosctl config node 192.168.1.11

# Bootstrap the cluster
talosctl bootstrap --nodes 192.168.1.11

# Wait for the cluster to be healthy
talosctl health --wait-timeout 15m

# Get the kubeconfig
talosctl kubeconfig

# Verify the cluster
kubectl get nodes -o wide
kubectl get pods -A
```

## Setting Up a VIP for the Control Plane

Instead of an external load balancer, you can use Talos's built-in VIP feature:

```yaml
# vip-patch.yaml
# Configure a virtual IP that floats between control plane nodes
machine:
  network:
    interfaces:
      - interface: eth0
        dhcp: true
        vip:
          ip: 192.168.1.100
```

Apply this to all control plane nodes. The VIP will be assigned to one of the control plane nodes and will float to another if the active one goes down.

## Installing a CNI and Storage

```bash
# Install Cilium as the CNI
cilium install --helm-set ipam.mode=kubernetes

# For storage, use the Proxmox CSI driver or local-path-provisioner
# Local path provisioner is simpler for homelabs
kubectl apply -f https://raw.githubusercontent.com/rancher/local-path-provisioner/v0.0.26/deploy/local-path-storage.yaml
```

## Proxmox Tips for Talos

A few Proxmox-specific tips that help with Talos deployments:

1. **Use virtio drivers** for the best performance with both disk and network
2. **Set CPU type to host** to expose hardware features like AES-NI
3. **Disable the QEMU guest agent** since Talos does not support it
4. **Use SSD storage** for control plane nodes where etcd runs
5. **Enable IOMMU** if you plan to pass through hardware devices

## Conclusion

Proxmox VE is an excellent platform for running Talos Linux, whether in a homelab or a production environment. The combination of Proxmox's accessible management interface with Talos's security-hardened Kubernetes makes for a powerful setup. The ISO boot method is the most straightforward way to get started, and the nocloud image method provides more automation for larger deployments. Once the cluster is running, you get the same secure, immutable Kubernetes experience as on any other platform.
