# How to Build a Talos Linux Home Lab Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Home Lab, Self-Hosting, Bare Metal

Description: A complete guide to building a Talos Linux home lab cluster from hardware selection through cluster setup and running your first workloads.

---

Building a home lab Kubernetes cluster is one of the best ways to learn Kubernetes in a hands-on environment. Talos Linux is an excellent choice for a home lab because it turns your hardware into a purpose-built Kubernetes platform with minimal overhead. No package managers, no SSH, no unnecessary services eating your RAM. Just Kubernetes.

This guide walks through building a Talos Linux home lab from scratch, from picking hardware to running your first workloads.

## Choosing Your Hardware

You do not need expensive equipment for a home lab. Here are some practical options ordered by budget:

**Budget option (under $200)**: Three Raspberry Pi 4 (4GB or 8GB models). This gives you a proper multi-node cluster, though ARM architecture means some container images may not be available.

**Mid-range option ($300-600)**: Three used mini PCs like Intel NUCs, Lenovo ThinkCentre Tiny, or HP EliteDesk Mini. These typically come with Intel i5 processors, 8-16GB RAM, and a small SSD. Much more capable than Pis.

**Full setup ($500-1000)**: Three mini PCs plus a managed switch, a dedicated router, and an external NAS or SSD for shared storage.

For a practical starting point, three nodes with 8GB RAM each gives you enough headroom for a control plane plus several workloads.

## Network Setup

Keep your lab network simple. Connect everything to the same switch and use your home router for DHCP initially. You will want to assign static IPs to your Talos nodes later.

```text
Internet
  |
  Router (192.168.1.1)
  |
  Switch
  |--- Node 1 (192.168.1.10) - control plane
  |--- Node 2 (192.168.1.11) - worker
  |--- Node 3 (192.168.1.12) - worker
  |
  Workstation (192.168.1.100)
```

## Preparing the Talos Boot Media

Download the Talos Linux image for your architecture:

```bash
# Download the Talos ISO (for x86_64)
curl -LO https://github.com/siderolabs/talos/releases/download/v1.6.0/metal-amd64.iso

# Or for Raspberry Pi
curl -LO https://github.com/siderolabs/talos/releases/download/v1.6.0/metal-arm64.raw.xz
```

For mini PCs, flash the ISO to a USB drive:

```bash
# Find your USB drive
lsblk

# Flash the ISO (replace /dev/sdX with your USB device)
sudo dd if=metal-amd64.iso of=/dev/sdX bs=4M status=progress
sync
```

Boot each node from the USB drive. Talos will start in maintenance mode and wait for configuration.

## Generating Cluster Configuration

On your workstation, install talosctl and generate the cluster configuration:

```bash
# Install talosctl
curl -sL https://talos.dev/install | sh

# Generate cluster config
talosctl gen config homelab https://192.168.1.10:6443 \
  --output-dir ./homelab-config
```

This creates three files:
- `controlplane.yaml` - configuration for control plane nodes
- `worker.yaml` - configuration for worker nodes
- `talosconfig` - client configuration for talosctl

Customize the control plane config for your network:

```yaml
# Edit controlplane.yaml
machine:
  install:
    disk: /dev/sda  # Check your actual disk device
    image: ghcr.io/siderolabs/installer:v1.6.0
    wipe: true
  network:
    hostname: talos-cp
    interfaces:
      - interface: eth0
        dhcp: false
        addresses:
          - 192.168.1.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
    nameservers:
      - 192.168.1.1
      - 1.1.1.1
cluster:
  controlPlane:
    endpoint: https://192.168.1.10:6443
  allowSchedulingOnControlPlanes: true  # For small clusters
```

For worker nodes:

```yaml
# Edit worker.yaml
machine:
  install:
    disk: /dev/sda
    image: ghcr.io/siderolabs/installer:v1.6.0
    wipe: true
  network:
    interfaces:
      - interface: eth0
        dhcp: false
        addresses:
          - 192.168.1.11/24  # Change for each worker
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
    nameservers:
      - 192.168.1.1
      - 1.1.1.1
```

## Applying Configuration and Bootstrapping

Apply the configuration to each node:

```bash
# Configure talosctl to use the generated config
export TALOSCONFIG=./homelab-config/talosconfig
talosctl config endpoint 192.168.1.10
talosctl config node 192.168.1.10

# Apply control plane config
talosctl apply-config --insecure \
  --nodes 192.168.1.10 \
  --file homelab-config/controlplane.yaml

# Apply worker configs
talosctl apply-config --insecure \
  --nodes 192.168.1.11 \
  --file homelab-config/worker.yaml

talosctl apply-config --insecure \
  --nodes 192.168.1.12 \
  --file homelab-config/worker.yaml
```

Bootstrap the cluster from the control plane node:

```bash
# Bootstrap etcd and Kubernetes
talosctl bootstrap --nodes 192.168.1.10

# Wait for the cluster to come up (this takes a few minutes)
talosctl health --wait-timeout 600s
```

Get your kubeconfig:

```bash
# Retrieve kubeconfig
talosctl kubeconfig ./homelab-config/kubeconfig

# Test cluster access
export KUBECONFIG=./homelab-config/kubeconfig
kubectl get nodes
# NAME        STATUS   ROLES           AGE   VERSION
# talos-cp    Ready    control-plane   5m    v1.29.0
# talos-w1    Ready    <none>          4m    v1.29.0
# talos-w2    Ready    <none>          4m    v1.29.0
```

## Installing Essential Components

A bare Kubernetes cluster needs a few additions to be useful in a home lab.

### CNI Plugin

Talos installs Flannel by default, which is fine for a home lab. If you want more features, install Cilium instead:

```bash
# Install Cilium
helm install cilium cilium/cilium \
  --namespace kube-system \
  --set ipam.mode=kubernetes \
  --set kubeProxyReplacement=true \
  --set k8sServiceHost=192.168.1.10 \
  --set k8sServicePort=6443
```

### Load Balancer

For bare metal, you need MetalLB to get external IPs for Services:

```bash
# Install MetalLB
helm install metallb metallb/metallb \
  --namespace metallb-system \
  --create-namespace
```

Configure an IP range:

```yaml
# metallb-pool.yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: homelab-pool
  namespace: metallb-system
spec:
  addresses:
    - 192.168.1.200-192.168.1.250
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: homelab-l2
  namespace: metallb-system
```

### Storage

For persistent storage, the simplest option is local-path-provisioner:

```bash
kubectl apply -f https://raw.githubusercontent.com/rancher/local-path-provisioner/master/deploy/local-path-storage.yaml

# Set as default storage class
kubectl patch storageclass local-path -p '{"metadata":{"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'
```

## Running Your First Workloads

Now deploy something useful. A good starting point is a simple web dashboard:

```bash
# Deploy the Kubernetes dashboard
helm install dashboard kubernetes-dashboard/kubernetes-dashboard \
  --namespace kubernetes-dashboard \
  --create-namespace \
  --set service.type=LoadBalancer
```

Or deploy a personal wiki, a file server, or any other self-hosted application. The cluster is yours to experiment with.

## Power Management Tips

Home lab clusters run 24/7, which means electricity costs. A three-node mini PC cluster typically draws 30-60 watts total, costing $3-6 per month in electricity depending on your rates.

To reduce power consumption, you can scale down workers when not in use:

```bash
# Gracefully shut down a worker for the night
talosctl shutdown --nodes 192.168.1.12

# Bring it back up via Wake-on-LAN
wakeonlan AA:BB:CC:DD:EE:FF
```

## Next Steps

Once your basic cluster is running, you can explore adding storage with Longhorn or Rook-Ceph, setting up a reverse proxy with Traefik or nginx, deploying a monitoring stack with Prometheus and Grafana, running your own DNS with Pi-hole or AdGuard, or setting up automated backups. A home lab is a sandbox where you can break things safely and learn from the experience. Talos Linux makes it easy to tear down and rebuild, so do not be afraid to experiment.
