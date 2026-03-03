# How to Set Up a Talos Linux Cluster with Raspberry Pi Nodes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Raspberry Pi, Kubernetes Cluster, ARM64, Homelab

Description: Build a multi-node Kubernetes cluster using Raspberry Pi boards running Talos Linux, with detailed steps for networking, configuration, and cluster management.

---

Building a Kubernetes cluster from Raspberry Pi boards is one of the best ways to learn cluster management, and Talos Linux makes the process cleaner than any other approach. Instead of manually installing packages and configuring systemd services on each Pi, you flash an image, apply a config file, and you are done. No SSH, no apt-get, no config drift between nodes.

This guide covers building a complete multi-node Talos Linux cluster using Raspberry Pi boards, from the initial hardware setup through to running workloads.

## Planning Your Cluster

A practical Pi cluster for Kubernetes needs at least three boards:

- 1 control plane node (Raspberry Pi 4 or 5, 4 GB+ RAM)
- 2 worker nodes (Raspberry Pi 4 or 5, 2 GB+ RAM, though 4 GB is better)

For a more resilient setup, use three control plane nodes and two or more workers. Three control plane nodes give you etcd quorum even if one node goes down.

### Hardware Shopping List

Here is what you need for a 3-node cluster:

- 3x Raspberry Pi 4 (4 GB or 8 GB) or Pi 5
- 3x MicroSD cards (32 GB minimum, A2 rated preferred)
- 3x USB-C power supplies or a multi-port USB charger
- 1x Network switch (5-port gigabit is perfect)
- 3x Ethernet cables
- 1x Cluster case or rack (optional but keeps things tidy)
- `talosctl` and `kubectl` on your workstation

## Step 1: Prepare the Boot Media

Download the Talos image and flash it to all three SD cards:

```bash
# Download the Pi image
curl -LO https://github.com/siderolabs/talos/releases/latest/download/metal-rpi_generic-arm64.raw.xz
xz -d metal-rpi_generic-arm64.raw.xz

# Flash to each SD card (adjust device paths)
# Card 1 - Control Plane
sudo dd if=metal-rpi_generic-arm64.raw of=/dev/sdX bs=4M status=progress conv=fsync

# Repeat for cards 2 and 3
```

If you are using USB SSDs for better performance, flash the image to each SSD instead.

## Step 2: Network Setup

Connect all Pis to your network switch, and connect the switch to your router or local network. Each Pi needs a stable IP address for Talos to work correctly.

You have two options for IP assignment:

### Option A: DHCP with Reservations

Configure your router to assign fixed IPs based on MAC address. This is the simplest approach.

### Option B: Static IPs in Talos Config

Set static IPs directly in the Talos machine configuration (covered in Step 3).

Plan your IP allocation:

```text
192.168.1.100 - Control Plane 1
192.168.1.101 - Worker 1
192.168.1.102 - Worker 2
192.168.1.99  - Virtual IP (for the Kubernetes API endpoint)
```

## Step 3: Generate Machine Configurations

Create the cluster configurations with a VIP for the control plane endpoint:

```bash
# Generate configs with VIP
talosctl gen config pi-cluster https://192.168.1.99:6443 \
  --config-patch '[
    {"op": "add", "path": "/machine/install/disk", "value": "/dev/mmcblk0"},
    {"op": "add", "path": "/machine/network/interfaces", "value": [
      {
        "interface": "eth0",
        "dhcp": true,
        "vip": {"ip": "192.168.1.99"}
      }
    ]}
  ]'
```

The VIP (Virtual IP) gives you a stable endpoint for the Kubernetes API that floats between control plane nodes.

For static IP assignments, create separate patches for each node:

```yaml
# cp1-patch.yaml
- op: add
  path: /machine/network/interfaces
  value:
    - interface: eth0
      addresses:
        - 192.168.1.100/24
      routes:
        - network: 0.0.0.0/0
          gateway: 192.168.1.1
      vip:
        ip: 192.168.1.99
```

```yaml
# worker1-patch.yaml
- op: add
  path: /machine/network/interfaces
  value:
    - interface: eth0
      addresses:
        - 192.168.1.101/24
      routes:
        - network: 0.0.0.0/0
          gateway: 192.168.1.1
```

## Step 4: Boot and Configure

Insert the SD cards, connect the ethernet cables, and power on all three Pis. Wait about two minutes for them to boot into Talos maintenance mode.

Find their IP addresses:

```bash
# Scan the network
nmap -sn 192.168.1.0/24 | grep -B2 "Raspberry"

# Or check your router's DHCP lease table
```

Apply configurations to each node:

```bash
# Control Plane 1
talosctl apply-config --insecure --nodes 192.168.1.100 --file controlplane.yaml

# Worker 1
talosctl apply-config --insecure --nodes 192.168.1.101 --file worker.yaml

# Worker 2
talosctl apply-config --insecure --nodes 192.168.1.102 --file worker.yaml
```

Each node will reboot after receiving its configuration.

## Step 5: Bootstrap the Cluster

Configure your local `talosctl` and bootstrap:

```bash
# Set up talosctl
talosctl config endpoint 192.168.1.100
talosctl config node 192.168.1.100
talosctl config merge talosconfig

# Bootstrap etcd on the first control plane node
talosctl bootstrap

# Watch the progress
talosctl health --wait-timeout 15m
```

On Raspberry Pi hardware, the bootstrap takes 5-10 minutes. Be patient and let it complete.

## Step 6: Verify the Cluster

```bash
# Get kubeconfig
talosctl kubeconfig .

# Check nodes
kubectl get nodes -o wide

# Expected output:
# NAME       STATUS   ROLES           AGE   VERSION   INTERNAL-IP
# talos-cp   Ready    control-plane   5m    v1.29.x   192.168.1.100
# talos-w1   Ready    <none>          3m    v1.29.x   192.168.1.101
# talos-w2   Ready    <none>          3m    v1.29.x   192.168.1.102

# Check system pods
kubectl get pods -n kube-system
```

## Step 7: Deploy a Test Workload

Verify the cluster works by deploying nginx:

```yaml
# nginx-test.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-test
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
        - name: nginx
          image: nginx:latest
          ports:
            - containerPort: 80
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 100m
              memory: 128Mi
---
apiVersion: v1
kind: Service
metadata:
  name: nginx-test
spec:
  type: NodePort
  selector:
    app: nginx
  ports:
    - port: 80
      nodePort: 30080
```

```bash
kubectl apply -f nginx-test.yaml

# Verify pods are distributed across workers
kubectl get pods -o wide

# Access the service
curl http://192.168.1.101:30080
```

## Storage Options

Raspberry Pi clusters need a storage solution for stateful workloads. Here are your options:

### Local Path Provisioner

The simplest option, using the SD card or USB drive for storage:

```bash
kubectl apply -f https://raw.githubusercontent.com/rancher/local-path-provisioner/master/deploy/local-path-storage.yaml
```

### NFS on an External Server

If you have a NAS or another machine with storage:

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: nfs-pv
spec:
  capacity:
    storage: 50Gi
  accessModes:
    - ReadWriteMany
  nfs:
    server: 192.168.1.50
    path: /export/kubernetes
```

### Longhorn

Longhorn provides distributed block storage but requires more resources than a Pi cluster can comfortably spare. Only use it if you have 8 GB Pi 5 boards.

## Monitoring the Cluster

Keep an eye on resource usage with lightweight monitoring:

```bash
# Install metrics-server for basic resource monitoring
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Check resource usage
kubectl top nodes
kubectl top pods --all-namespaces
```

## Maintenance and Upgrades

Upgrading Talos on a Pi cluster is straightforward:

```bash
# Upgrade one node at a time
# Start with workers
talosctl upgrade --nodes 192.168.1.101 \
  --image ghcr.io/siderolabs/installer:v1.7.0

# Verify the worker is healthy
talosctl -n 192.168.1.101 health

# Then upgrade the next worker
talosctl upgrade --nodes 192.168.1.102 \
  --image ghcr.io/siderolabs/installer:v1.7.0

# Finally upgrade the control plane
talosctl upgrade --nodes 192.168.1.100 \
  --image ghcr.io/siderolabs/installer:v1.7.0
```

## Common Issues and Fixes

SD card corruption is the most common problem with Pi clusters. If a node stops responding, try re-flashing the SD card and re-applying the configuration. Using USB SSDs significantly reduces this risk.

Memory pressure on 2 GB Pis can cause pod evictions. Set resource requests and limits on all pods and avoid scheduling heavy workloads on low-memory nodes.

Network issues between nodes are usually caused by the switch or router. Make sure all Pis are on the same subnet and that your router allows inter-device communication.

## Wrapping Up

A Raspberry Pi cluster running Talos Linux is a fantastic learning tool and a capable platform for lightweight workloads. The combination of cheap hardware and an API-driven, immutable OS gives you a real Kubernetes experience that closely mirrors how production clusters are managed. Once your Pi cluster is running, you interact with it using the same tools and workflows as any enterprise Kubernetes deployment.
