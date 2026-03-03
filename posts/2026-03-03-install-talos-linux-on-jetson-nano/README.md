# How to Install Talos Linux on Jetson Nano

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Jetson Nano, NVIDIA, Edge Computing, Kubernetes

Description: Learn how to install Talos Linux on NVIDIA Jetson Nano for running GPU-accelerated Kubernetes workloads at the edge.

---

The NVIDIA Jetson Nano is a compact, powerful single-board computer designed for AI and machine learning workloads at the edge. It features an NVIDIA Maxwell GPU with 128 CUDA cores, making it capable of running inference workloads that would be impossible on standard ARM boards like the Raspberry Pi. Running Talos Linux on the Jetson Nano gives you a secure, immutable Kubernetes node with GPU acceleration capabilities. This guide covers the installation process and the specific considerations for this unique hardware.

## Understanding the Jetson Nano

Before diving into the installation, it helps to understand what makes the Jetson Nano special:

- **CPU**: Quad-core ARM Cortex-A57 at 1.43 GHz
- **GPU**: 128-core NVIDIA Maxwell
- **RAM**: 4GB LPDDR4 (shared between CPU and GPU)
- **Storage**: MicroSD card slot (some models have eMMC)
- **Network**: Gigabit Ethernet, optional WiFi via M.2
- **Power**: 5W or 10W modes via barrel jack or micro-USB

The GPU is what sets the Jetson apart. With Talos Linux and the right configuration, you can run containerized AI inference workloads on Kubernetes at the edge with the same security guarantees as a cloud deployment.

## Prerequisites

Gather your hardware and software:

**Hardware:**
- NVIDIA Jetson Nano Developer Kit (4GB version recommended)
- MicroSD card (64GB or larger, UHS-I or better)
- 5V 4A barrel jack power supply (not micro-USB for best performance)
- Ethernet cable
- SD card reader

**Software on your workstation:**

```bash
# Install talosctl
curl -sL https://talos.dev/install | sh

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl && sudo mv kubectl /usr/local/bin/
```

## Preparing the Talos Image

The Jetson Nano requires an ARM64 image with specific board support. Use the Talos Image Factory to create a compatible image:

```bash
# Create a schematic for the Jetson Nano
cat > jetson-nano-schematic.yaml <<'EOF'
overlay:
  name: jetson_nano
  image: siderolabs/sbc-jetson
customization:
  systemExtensions:
    officialExtensions: []
EOF

# Submit the schematic to the Image Factory
SCHEMATIC_ID=$(curl -s -X POST --data-binary @jetson-nano-schematic.yaml \
  https://factory.talos.dev/schematics \
  -H "Content-Type: application/x-yaml" | jq -r '.id')

echo "Schematic ID: ${SCHEMATIC_ID}"

# Download the Jetson Nano-specific image
curl -LO "https://factory.talos.dev/image/${SCHEMATIC_ID}/v1.7.0/metal-arm64.raw.xz"
xz -d metal-arm64.raw.xz

echo "Image ready: metal-arm64.raw"
```

The Image Factory handles the complexity of including the right device tree overlays, bootloader configuration, and NVIDIA-specific drivers needed for the Jetson Nano hardware.

## Flashing the SD Card

Write the Talos image to your SD card:

```bash
# Identify your SD card device
# On macOS:
diskutil list

# On Linux:
lsblk

# IMPORTANT: Verify the correct device to avoid data loss

# Unmount the SD card first
# On macOS:
diskutil unmountDisk /dev/disk4

# On Linux:
sudo umount /dev/sdX*

# Flash the image
# On macOS (use rdisk for faster writes):
sudo dd if=metal-arm64.raw of=/dev/rdisk4 bs=4M status=progress

# On Linux:
sudo dd if=metal-arm64.raw of=/dev/sdX bs=4M status=progress conv=fsync

# Make sure all data is written
sync

echo "SD card flashed successfully"
```

## Booting the Jetson Nano

Insert the SD card and power on the Jetson Nano:

1. Insert the flashed SD card into the Jetson Nano
2. Connect the Ethernet cable to your network
3. Connect the barrel jack power supply (for 10W mode)
4. The Jetson will boot into Talos maintenance mode

```bash
# Find the Jetson Nano on your network
# Check your router's DHCP lease table or scan the network
nmap -sn 192.168.1.0/24

# The Jetson Nano's MAC address typically starts with 48:b0:2d or 00:04:4b
# Look for these prefixes in your ARP table
arp -a | grep -i "48:b0\|00:04:4b"
```

## Generating Talos Configuration

Create the machine configuration for your Jetson Nano:

```bash
# For a single Jetson Nano node
NANO_IP="192.168.1.60"

# Generate Talos configuration
talosctl gen config talos-jetson-cluster "https://${NANO_IP}:6443" \
  --output-dir _out

# Create a Jetson Nano-specific patch
cat > jetson-patch.yaml <<'EOF'
machine:
  install:
    disk: /dev/mmcblk0
    image: factory.talos.dev/installer/SCHEMATIC_ID:v1.7.0
  network:
    interfaces:
      - interface: eth0
        dhcp: true
  sysctls:
    # Optimize for the Jetson's limited RAM
    vm.overcommit_memory: "1"
EOF

# Apply the patch
talosctl machineconfig patch _out/controlplane.yaml \
  --patch @jetson-patch.yaml \
  --output _out/controlplane-jetson.yaml
```

## Applying Configuration

Apply the configuration to the Jetson Nano:

```bash
# Apply configuration while the node is in maintenance mode
talosctl apply-config --insecure --nodes ${NANO_IP} \
  --file _out/controlplane-jetson.yaml

# The node will install Talos to disk and reboot
# Wait for the installation to complete
sleep 180

# Configure talosctl
talosctl config merge _out/talosconfig
talosctl config endpoint ${NANO_IP}
talosctl config node ${NANO_IP}

# Verify the node is running
talosctl health --nodes ${NANO_IP}
```

## Bootstrapping the Cluster

```bash
# Bootstrap the cluster (for a single-node setup)
talosctl bootstrap --nodes ${NANO_IP}

# Wait for the cluster to be healthy
talosctl health --wait-timeout 15m

# Get the kubeconfig
talosctl kubeconfig

# Verify
kubectl get nodes -o wide
kubectl get pods -A
```

## Enabling GPU Access

To use the Jetson Nano's GPU in Kubernetes, you need the NVIDIA device plugin:

```bash
# Install the NVIDIA device plugin
kubectl apply -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/v0.14.3/nvidia-device-plugin.yml

# Verify the GPU is recognized
kubectl describe node | grep -A5 "nvidia.com/gpu"
```

After the device plugin is running, you can request GPU resources in your pod specifications:

```yaml
# gpu-inference-pod.yaml
# Run a GPU-accelerated inference workload
apiVersion: v1
kind: Pod
metadata:
  name: gpu-inference
spec:
  containers:
    - name: inference
      image: nvcr.io/nvidia/l4t-pytorch:r32.7.1-pth1.10-py3
      resources:
        limits:
          nvidia.com/gpu: 1
      command:
        - python3
        - -c
        - |
          import torch
          print(f"CUDA available: {torch.cuda.is_available()}")
          print(f"GPU: {torch.cuda.get_device_name(0)}")
          # Your inference code here
```

## Building a Multi-Node Jetson Cluster

If you have multiple Jetson Nanos, you can build a multi-node cluster:

```bash
# For a multi-node cluster, designate one as control plane
# and the others as workers

# Generate configuration with a VIP or dedicated endpoint
talosctl gen config talos-jetson-fleet "https://192.168.1.100:6443" \
  --output-dir _out-fleet

# Apply control plane config to the first Jetson
talosctl apply-config --insecure --nodes 192.168.1.60 \
  --file _out-fleet/controlplane.yaml

# Apply worker config to additional Jetsons
talosctl apply-config --insecure --nodes 192.168.1.61 \
  --file _out-fleet/worker.yaml

talosctl apply-config --insecure --nodes 192.168.1.62 \
  --file _out-fleet/worker.yaml
```

## Optimizing for the Jetson's Resources

The Jetson Nano has limited RAM (4GB shared between CPU and GPU), so you need to be careful with resource allocation:

```yaml
# resource-quotas.yaml
# Set resource quotas to prevent OOM on the Jetson
apiVersion: v1
kind: ResourceQuota
metadata:
  name: jetson-limits
  namespace: default
spec:
  hard:
    requests.cpu: "3"
    requests.memory: 2Gi
    limits.cpu: "4"
    limits.memory: 3Gi
```

```bash
kubectl apply -f resource-quotas.yaml
```

Adjust Kubernetes component resource usage:

```yaml
# jetson-kubelet-patch.yaml
# Optimize kubelet for limited resources
machine:
  kubelet:
    extraArgs:
      system-reserved: "cpu=500m,memory=512Mi"
      kube-reserved: "cpu=500m,memory=512Mi"
      eviction-hard: "memory.available<256Mi,nodefs.available<10%"
```

## Running AI Inference Workloads

Here is an example of deploying a simple image classification service on the Jetson:

```yaml
# classification-deployment.yaml
# Image classification service using the Jetson GPU
apiVersion: apps/v1
kind: Deployment
metadata:
  name: image-classifier
spec:
  replicas: 1
  selector:
    matchLabels:
      app: image-classifier
  template:
    metadata:
      labels:
        app: image-classifier
    spec:
      containers:
        - name: classifier
          image: your-registry/jetson-classifier:latest
          ports:
            - containerPort: 8080
          resources:
            limits:
              nvidia.com/gpu: 1
              memory: 1Gi
            requests:
              cpu: 500m
              memory: 512Mi
---
apiVersion: v1
kind: Service
metadata:
  name: image-classifier
spec:
  type: NodePort
  ports:
    - port: 8080
      targetPort: 8080
      nodePort: 30080
  selector:
    app: image-classifier
```

## Power Management

The Jetson Nano supports two power modes. For a Kubernetes node that runs continuously, use the 10W mode with the barrel jack power supply:

```bash
# Check the current power mode (via Talos)
talosctl read /sys/devices/system/cpu/cpufreq/policy0/scaling_governor --nodes ${NANO_IP}

# The power mode is set by the NVIDIA power management
# In 10W mode (MAXN), all 4 CPU cores are active
# In 5W mode, only 2 CPU cores are active
```

## Monitoring the Jetson

Monitor GPU usage and temperature:

```bash
# Check GPU temperature via Talos
talosctl read /sys/devices/virtual/thermal/thermal_zone1/temp --nodes ${NANO_IP}
# Divide by 1000 to get Celsius

# Check CPU temperature
talosctl read /sys/devices/virtual/thermal/thermal_zone0/temp --nodes ${NANO_IP}
```

For ongoing monitoring, deploy a GPU-aware monitoring stack:

```yaml
# gpu-monitor.yaml
# Monitor GPU metrics with dcgm-exporter
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: gpu-monitor
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: gpu-monitor
  template:
    metadata:
      labels:
        app: gpu-monitor
    spec:
      containers:
        - name: dcgm-exporter
          image: nvcr.io/nvidia/k8s/dcgm-exporter:latest
          ports:
            - containerPort: 9400
              name: metrics
          resources:
            limits:
              nvidia.com/gpu: 1
```

## Conclusion

Installing Talos Linux on the NVIDIA Jetson Nano brings together the security of an immutable operating system with the AI capabilities of NVIDIA's edge hardware. The setup requires a bit more effort than a standard x86 deployment because of the ARM architecture and GPU driver requirements, but the Image Factory makes this manageable. Once running, you have a secure, Kubernetes-native AI inference platform that can be managed remotely through the Talos API, with no need for SSH access to the device. This makes it particularly well suited for edge deployments where physical access to the device may be limited.
