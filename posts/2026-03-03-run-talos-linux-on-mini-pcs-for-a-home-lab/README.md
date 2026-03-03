# How to Run Talos Linux on Mini PCs for a Home Lab

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Home Lab, Mini PC, Intel NUC, Bare Metal

Description: A practical guide to running Talos Linux on mini PCs like Intel NUC, Lenovo ThinkCentre, and Beelink for a compact and efficient home lab Kubernetes cluster.

---

Mini PCs are the sweet spot for home lab Kubernetes clusters. They are powerful enough to run real workloads, small enough to sit on a shelf, quiet enough to live in your office, and efficient enough that the electricity bill does not hurt. When paired with Talos Linux, a handful of mini PCs becomes a serious Kubernetes platform.

This guide covers the best mini PCs for a Talos Linux home lab, how to set them up, and how to get the most out of the hardware.

## Why Mini PCs

Compared to other home lab options, mini PCs offer the best balance of performance, cost, power consumption, and noise. Full-size desktops are loud and power-hungry. Raspberry Pis are limited by ARM compatibility and slow storage. Cloud VMs have recurring costs that add up. Mini PCs typically draw 10-25 watts at idle, are completely silent, and pack enough compute for serious Kubernetes work.

## Recommended Mini PCs

Here are the best options sorted by price point. All of these run Talos Linux without issues.

### Budget: Under $150 per node

**Beelink Mini S12 Pro** - Intel N100 (4 cores), 16GB RAM, 500GB SSD. The N100 processor is surprisingly capable and draws only 6 watts at idle. These cost around $130-150 new.

**Lenovo ThinkCentre M720q (used)** - Intel i5-8400T (6 cores), 8-16GB RAM. Available refurbished for $80-120. Business-class reliability.

### Mid-range: $150-300 per node

**Intel NUC 12 Pro** - Intel i5-1240P (12 cores), up to 64GB RAM, NVMe storage. Excellent performance but Intel has discontinued the NUC line so stock varies.

**Beelink SER5 Pro** - AMD Ryzen 5 5600H (6 cores), 16-32GB RAM. Strong multi-threaded performance at a reasonable price.

**Minisforum UM580** - AMD Ryzen 7 5800H (8 cores), up to 64GB RAM. Great value for memory-intensive workloads.

### Performance: $300+

**Minisforum MS-01** - Intel i9-12900H (14 cores), up to 96GB RAM, dual 2.5GbE plus 10GbE, two NVMe slots. This is essentially a mini server.

For a typical three-node cluster, the budget option (3x Beelink N100) runs about $400-450 total and gives you a very capable setup.

## Hardware Setup

### What You Need

- 3 mini PCs (minimum for a proper cluster)
- A managed or unmanaged Gigabit switch (5-8 ports)
- Ethernet cables
- USB drive for initial Talos installation
- Optional: USB hub for initial BIOS configuration

### Physical Layout

Mini PCs stack well. Many home labbers use a simple shelf or a 3D-printed rack:

```text
  [Mini PC 3 - worker]
  [Mini PC 2 - worker]
  [Mini PC 1 - control plane]
  [Gigabit Switch]
```

Connect each mini PC to the switch with Ethernet. Connect the switch to your home router for internet access.

### BIOS Configuration

Before installing Talos, configure each mini PC's BIOS:

1. Boot into BIOS (usually F2 or Delete during startup)
2. Set boot order: USB first, then NVMe/SSD
3. Disable Secure Boot (simplifies setup)
4. Enable Wake-on-LAN (for remote power management)
5. Set power-on behavior to "Last State" or "Always On" (so nodes come back after a power outage)

## Installing Talos Linux

### Preparing the Boot Media

```bash
# Download Talos metal image
curl -LO https://github.com/siderolabs/talos/releases/download/v1.6.0/metal-amd64.iso

# Write to USB drive
sudo dd if=metal-amd64.iso of=/dev/sdX bs=4M status=progress conv=fsync
```

### Generating Configuration

```bash
# Generate cluster configs
talosctl gen config minipc-lab https://192.168.1.100:6443 \
  --output-dir ./minipc-config
```

Customize for your mini PCs. Most modern mini PCs use NVMe drives:

```yaml
# controlplane-patch.yaml
machine:
  install:
    disk: /dev/nvme0n1
    image: ghcr.io/siderolabs/installer:v1.6.0
    wipe: true
  network:
    hostname: mini-cp
    interfaces:
      - interface: enp1s0  # Common for mini PCs
        dhcp: false
        addresses:
          - 192.168.1.100/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
    nameservers:
      - 1.1.1.1
      - 8.8.8.8
  # NVMe-specific settings for better performance
  sysctls:
    vm.dirty_ratio: "10"
    vm.dirty_background_ratio: "5"
cluster:
  allowSchedulingOnControlPlanes: true  # Maximize resource usage
  controlPlane:
    endpoint: https://192.168.1.100:6443
```

### Booting and Applying Configuration

Boot each mini PC from the USB drive. Talos starts in maintenance mode and shows its DHCP-assigned IP.

```bash
# Apply configs
talosctl apply-config --insecure \
  --nodes 192.168.1.100 \
  --file minipc-config/controlplane.yaml

talosctl apply-config --insecure \
  --nodes 192.168.1.101 \
  --file minipc-config/worker.yaml

talosctl apply-config --insecure \
  --nodes 192.168.1.102 \
  --file minipc-config/worker.yaml

# Bootstrap
export TALOSCONFIG=./minipc-config/talosconfig
talosctl config endpoint 192.168.1.100
talosctl config node 192.168.1.100

talosctl bootstrap
talosctl health --wait-timeout 600s
talosctl kubeconfig ./minipc-config/kubeconfig
```

## Post-Installation Setup

### MetalLB for Load Balancing

Bare metal clusters need MetalLB for Service type LoadBalancer:

```bash
export KUBECONFIG=./minipc-config/kubeconfig

helm install metallb metallb/metallb \
  --namespace metallb-system \
  --create-namespace

# Wait for MetalLB to be ready, then apply config
kubectl apply -f - <<EOF
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: homelab
  namespace: metallb-system
spec:
  addresses:
    - 192.168.1.200-192.168.1.230
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: homelab
  namespace: metallb-system
EOF
```

### Storage with Longhorn

Mini PCs with NVMe drives have fast local storage. Longhorn provides replicated persistent volumes:

```bash
helm install longhorn longhorn/longhorn \
  --namespace longhorn-system \
  --create-namespace \
  --set defaultSettings.defaultReplicaCount=2
```

### Ingress Controller

Install an ingress controller to expose services:

```bash
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=LoadBalancer
```

## Performance Tuning for Mini PCs

### CPU Governor

Most mini PCs support frequency scaling. For a home lab, the performance governor gives the best response times:

```yaml
machine:
  install:
    extraKernelArgs:
      - intel_pstate=active
      - cpufreq.default_governor=performance
```

### Memory Optimization

If your mini PCs have 16GB or more, you have enough headroom for most workloads. Set appropriate resource requests to prevent overcommit:

```yaml
# Set resource defaults for namespaces
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: apps
spec:
  limits:
    - default:
        cpu: 500m
        memory: 512Mi
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      type: Container
```

### NVMe Performance

NVMe drives in mini PCs are fast. Make sure you are using them effectively:

```yaml
machine:
  sysctls:
    # Reduce IO scheduler overhead for NVMe
    vm.swappiness: "1"
    vm.dirty_ratio: "10"
    vm.dirty_background_ratio: "5"
```

## Power Consumption and Cost

A three-node cluster of Beelink N100 mini PCs draws approximately:
- Idle: 18-24 watts total (6-8W per node)
- Under load: 30-45 watts total

At average US electricity rates ($0.12/kWh), that is roughly $2-3 per month to run 24/7. Even the beefier Ryzen-based mini PCs typically keep the total under $5-8 per month.

Compare this to running three cloud VMs at similar specs, which would cost $50-100+ per month.

## Remote Management

Since Talos Linux has no SSH, all management happens through the API. Set up your workstation for easy access:

```bash
# Add to your shell profile
export TALOSCONFIG=/path/to/minipc-config/talosconfig
export KUBECONFIG=/path/to/minipc-config/kubeconfig

# Quick health check alias
alias lab-status='talosctl health && kubectl get nodes'
```

For power management when you are away from home, Wake-on-LAN lets you power on nodes remotely:

```bash
# Install wakeonlan on your workstation
# Power on a node by its MAC address
wakeonlan AA:BB:CC:DD:EE:FF

# Shutdown a node gracefully through Talos
talosctl shutdown --nodes 192.168.1.102
```

## Summary

Mini PCs are the ideal hardware platform for a Talos Linux home lab. They deliver real server-grade performance in a tiny, quiet, power-efficient package. A three-node cluster costs less than a few months of equivalent cloud compute, runs silently on your desk, and gives you a platform to learn and experiment with Kubernetes without constraints. Talos Linux makes the most of the hardware by eliminating OS overhead, and the API-driven management means you never need to plug in a monitor or keyboard after the initial setup.
