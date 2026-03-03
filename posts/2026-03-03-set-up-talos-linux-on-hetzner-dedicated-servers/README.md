# How to Set Up Talos Linux on Hetzner Dedicated Servers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Hetzner, Dedicated Server, Bare Metal, Kubernetes

Description: Complete guide to installing and running Talos Linux on Hetzner dedicated (bare metal) servers for high-performance Kubernetes clusters.

---

Hetzner's dedicated server auction is legendary in the hosting world. You can get serious hardware - 64 GB RAM, 8-core Xeon processors, NVMe drives - at prices that cloud instances cannot touch. Running Talos Linux on these bare metal servers gives you a Kubernetes cluster with raw hardware performance and the operational simplicity of an immutable OS. This guide walks through the entire installation process.

## Why Dedicated Servers

Dedicated servers eliminate the noisy neighbor problem. You get the full capacity of the hardware with no hypervisor overhead. For workloads that are CPU-intensive, memory-intensive, or I/O-sensitive, the performance difference compared to virtual machines can be significant.

Hetzner's auction servers (available through the Robot marketplace) offer refurbished hardware at steep discounts. A server with 128 GB RAM and 2x1 TB NVMe might cost less per month than a comparable cloud instance costs per day.

The trade-off is that you manage the hardware lifecycle yourself. If a disk fails, you need to coordinate with Hetzner support for replacement. But Talos Linux minimizes the software management overhead, so the total operational burden is still reasonable.

## Prerequisites

Before starting:

- A Hetzner dedicated server (ordered through Robot or the auction)
- Access to the Hetzner Robot panel for your server
- KVM/IPMI access (available through the Robot panel)
- `talosctl` and `kubectl` installed on your local machine
- Network planning for your cluster (public IPs, optional vSwitch for private networking)

## Preparing the Installation Media

There are several ways to install Talos on a Hetzner dedicated server. The most reliable method uses the Hetzner Rescue System and writes the Talos image directly to disk.

First, boot your server into the rescue system through the Robot panel. Then SSH into the rescue system:

```bash
# SSH into the Hetzner rescue system
ssh root@<server-ip>

# Download the Talos metal image
curl -LO https://github.com/siderolabs/talos/releases/download/v1.7.0/metal-amd64.raw.xz

# Write the image to the primary disk
xz -d -c metal-amd64.raw.xz | dd of=/dev/sda bs=4M status=progress

# If your server uses NVMe drives
xz -d -c metal-amd64.raw.xz | dd of=/dev/nvme0n1 bs=4M status=progress

# Sync and reboot
sync
reboot
```

After reboot, the server will boot into Talos Linux maintenance mode.

## Network Configuration

Hetzner dedicated servers have public IP addresses assigned directly to the server. Talos needs to be configured with the correct network settings. Check your server's network configuration in the Robot panel, then create a machine config patch:

```yaml
# network-patch.yaml
machine:
  network:
    hostname: talos-node-1
    interfaces:
      - interface: eth0
        addresses:
          - <public-ip>/32
        routes:
          - network: 0.0.0.0/0
            gateway: <gateway-ip>
    nameservers:
      - 185.12.64.1
      - 185.12.64.2
```

Hetzner uses a point-to-point network setup for dedicated servers. The gateway is typically a /32 address, and your server's IP is also configured as /32 with a static route to the gateway.

## Generating Talos Configuration

Generate the base configuration:

```bash
# Generate Talos configuration
talosctl gen config hetzner-cluster https://<first-cp-ip>:6443

# Apply network patches to the controlplane config
talosctl machineconfig patch controlplane.yaml --patch @network-patch.yaml -o controlplane-patched.yaml
```

## Applying the Configuration

Once the server is in maintenance mode, apply the configuration:

```bash
# Configure talosctl endpoint
talosctl config endpoint <server-ip>
talosctl config node <server-ip>

# Apply the machine configuration
talosctl apply-config --insecure --nodes <server-ip> --file controlplane-patched.yaml

# For the first control plane node, bootstrap etcd
talosctl bootstrap --nodes <server-ip>

# Get the kubeconfig
talosctl kubeconfig --nodes <server-ip>
```

## Setting Up Private Networking with vSwitch

Hetzner offers vSwitch for private networking between dedicated servers. A vSwitch creates a VLAN that connects your servers at Layer 2:

```bash
# Create a vSwitch in the Robot panel or via API
# After creating the vSwitch, note the VLAN ID (e.g., 4000)
```

Configure Talos to use the vSwitch VLAN:

```yaml
# vswitch-patch.yaml
machine:
  network:
    interfaces:
      - interface: eth0
        addresses:
          - <public-ip>/32
        routes:
          - network: 0.0.0.0/0
            gateway: <gateway-ip>
        vlans:
          - vlanId: 4000
            addresses:
              - 10.0.0.1/24
```

This creates a VLAN interface on the physical NIC. All servers in the same vSwitch can communicate over the 10.0.0.0/24 network.

## Multi-Node Cluster Setup

For a production cluster, set up three control plane nodes and your desired number of workers. Each server gets its own network configuration:

```bash
# Apply config to each control plane node
talosctl apply-config --insecure --nodes <cp1-ip> --file cp1-config.yaml
talosctl apply-config --insecure --nodes <cp2-ip> --file cp2-config.yaml
talosctl apply-config --insecure --nodes <cp3-ip> --file cp3-config.yaml

# Apply config to worker nodes
talosctl apply-config --insecure --nodes <worker1-ip> --file worker1-config.yaml
talosctl apply-config --insecure --nodes <worker2-ip> --file worker2-config.yaml
```

## Storage Configuration

Hetzner dedicated servers often come with multiple drives. You can configure Talos to use extra drives for storage:

```yaml
# storage-patch.yaml
machine:
  disks:
    - device: /dev/sdb
      partitions:
        - mountpoint: /var/mnt/storage
```

For Kubernetes persistent storage, deploy a local path provisioner or use Rook/Ceph with the extra drives:

```bash
# Deploy the local path provisioner
kubectl apply -f https://raw.githubusercontent.com/rancher/local-path-provisioner/master/deploy/local-path-storage.yaml
```

Or for more advanced storage, use Rook with Ceph across your dedicated servers' extra disks:

```bash
# Deploy Rook operator
kubectl apply -f https://raw.githubusercontent.com/rook/rook/release-1.13/deploy/examples/operator.yaml

# Create a Ceph cluster using the extra disks
kubectl apply -f - <<EOF
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  dataDirHostPath: /var/lib/rook
  cephVersion:
    image: quay.io/ceph/ceph:v18
  mon:
    count: 3
  storage:
    useAllNodes: true
    useAllDevices: false
    devices:
      - name: sdb
      - name: sdc
EOF
```

## Load Balancing Without Cloud Provider

Since dedicated servers do not have a cloud provider, you need an alternative for LoadBalancer services. MetalLB is the standard choice:

```bash
# Install MetalLB
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/main/config/manifests/metallb-native.yaml

# Configure MetalLB with your server IPs or additional IPs
kubectl apply -f - <<EOF
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: default-pool
  namespace: metallb-system
spec:
  addresses:
    - <additional-ip-1>/32
    - <additional-ip-2>/32
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: default
  namespace: metallb-system
EOF
```

You can order additional IP addresses from Hetzner and assign them to MetalLB for your LoadBalancer services.

## RAID Configuration

Many Hetzner servers come with multiple identical drives. For reliability, configure software RAID in Talos:

```yaml
machine:
  install:
    disk: /dev/sda
  disks:
    - device: /dev/md0
      partitions:
        - mountpoint: /var/mnt/data
```

For the OS disk, you might want to set up RAID during the rescue system phase before installing Talos.

## Monitoring Hardware Health

Since you are on bare metal, monitor hardware health. Deploy the node exporter with hardware monitoring:

```bash
# The Prometheus node exporter can report hardware sensors
# Deploy it as part of your monitoring stack
helm install prometheus prometheus-community/kube-prometheus-stack \
  --set nodeExporter.enabled=true
```

Check SMART status of drives periodically through `talosctl`:

```bash
# Check disk health (requires Talos extensions)
talosctl read /proc/mdstat --nodes <node-ip>
```

## Conclusion

Hetzner dedicated servers with Talos Linux give you bare metal Kubernetes at an unbeatable price point. The installation through the rescue system is straightforward, and vSwitch provides private networking between your servers. For storage, the extra drives in dedicated servers open up options like Rook/Ceph that would be expensive to replicate in the cloud. The main operational consideration is hardware lifecycle management, but for the cost savings, most teams find it a worthwhile trade-off.
