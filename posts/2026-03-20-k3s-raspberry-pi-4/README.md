# How to Install K3s on Raspberry Pi 4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Raspberry Pi, ARM64, Edge Computing

Description: A complete guide to installing K3s on the Raspberry Pi 4, leveraging its quad-core ARM64 CPU and up to 8GB of RAM for a capable edge Kubernetes node.

## Introduction

The Raspberry Pi 4 Model B is a powerful ARM64 SBC with a quad-core Cortex-A72 CPU and up to 8GB of RAM, making it capable of running K3s as both a server and agent node. Combined with a fast USB 3.0 SSD, the Pi 4 becomes a surprisingly capable Kubernetes platform for home labs, edge deployments, and developer environments.

## Hardware Recommendations

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| Model | Raspberry Pi 4 2GB | Raspberry Pi 4 8GB |
| Storage | 16GB microSD | 32GB+ USB SSD |
| Power | Official 15W adapter | Official 15W adapter |
| Cooling | Heatsink | Active cooling case |

## Step 1: Prepare Raspberry Pi OS (64-bit)

Using the 64-bit OS is strongly recommended for K3s on Pi 4:

1. Download Raspberry Pi Imager
2. Select "Raspberry Pi OS Lite (64-bit)"
3. In advanced settings, configure:
   - Hostname (e.g., `pi4-k3s-01`)
   - Username and password (e.g., `k3sadmin`)
   - SSH enabled
   - WiFi credentials (or use Ethernet)
4. Flash to MicroSD card or USB SSD

**Using a USB SSD**: Connect the SSD via USB 3.0 and flash to the SSD instead of a microSD for much better I/O performance.

## Step 2: First Boot and Updates

```bash
# SSH into the Pi 4

ssh k3sadmin@pi4-k3s-01.local

# Update the system
sudo apt-get update && sudo apt-get full-upgrade -y

# Verify 64-bit OS
uname -m
# Expected: aarch64
```

## Step 3: Enable cgroup Memory

```bash
# Edit the boot command line
sudo nano /boot/firmware/cmdline.txt

# Add to the end of the SINGLE line:
# cgroup_memory=1 cgroup_enable=memory

# Example final line:
# console=serial0,115200 console=tty1 root=PARTUUID=xxx rootfstype=ext4 fsck.repair=yes rootwait cgroup_memory=1 cgroup_enable=memory

# On older Debian 11 / Raspberry Pi OS releases, the file is /boot/cmdline.txt

# Reboot
sudo reboot
```

## Step 4: Disable Swap

```bash
# Disable swap to prevent Kubernetes scheduling issues
sudo dphys-swapfile swapoff
sudo dphys-swapfile uninstall
sudo update-rc.d dphys-swapfile remove

# Disable zram-swap if present
sudo systemctl disable --now systemd-zram-setup@zram0.service 2>/dev/null || true

# Verify
free -h
# Swap: 0B
```

## Step 5: Configure K3s

```bash
sudo mkdir -p /etc/rancher/k3s

# Configuration for a K3s SERVER node (Pi 4 with 4GB+ RAM)
sudo tee /etc/rancher/k3s/config.yaml > /dev/null <<EOF
# Cluster token
token: "PiClusterToken123"

# TLS SANs for external access
tls-san:
  - 192.168.1.100
  - pi4-k3s-01.local
  - k3s.home.lab

# Disable components for lighter footprint (optional)
# disable:
#   - traefik

# Kubelet tuning for Pi 4
kubelet-arg:
  - "max-pods=110"
  - "kube-reserved=cpu=200m,memory=256Mi"
  - "system-reserved=cpu=200m,memory=256Mi"
  - "eviction-hard=memory.available<100Mi,nodefs.available<5%"
  - "container-log-max-size=20Mi"
  - "container-log-max-files=3"

# Node labels
node-label:
  - "device-type=raspberry-pi-4"
  - "tier=edge"
EOF
```

## Step 6: Install K3s

```bash
# Install K3s server
curl -sfL https://get.k3s.io | sudo sh -

# Monitor startup
sudo journalctl -u k3s -f

# Wait for node to be Ready
sudo k3s kubectl wait --for=condition=Ready node --all --timeout=120s
```

## Step 7: Set Up kubectl Access

```bash
# Set up local kubectl access
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config

# Test access
kubectl get nodes -o wide
kubectl get pods --all-namespaces
```

## Step 8: Adding Additional Pi 4 Nodes

```bash
# Reuse the same token configured on the server
SERVER_IP="192.168.1.100"

# On each additional Pi 4 agent node, configure and install
sudo mkdir -p /etc/rancher/k3s
sudo tee /etc/rancher/k3s/config.yaml > /dev/null <<EOF
server: "https://${SERVER_IP}:6443"
token: "PiClusterToken123"
kubelet-arg:
  - "max-pods=110"
  - "kube-reserved=cpu=200m,memory=256Mi"
  - "system-reserved=cpu=200m,memory=256Mi"
node-label:
  - "device-type=raspberry-pi-4"
  - "tier=worker"
EOF

# Install K3s agent
curl -sfL https://get.k3s.io | sudo sh -s - agent
```

## Step 9: Enable GPU Access (Raspberry Pi 4 VideoCore)

```bash
# For workloads that need GPU/VideoCore access
# Add your login user to the video group
sudo usermod -aG video k3sadmin

# Mount the GPU device in pods
# Add device plugin or use privileged containers for GPU access
```

## Deploying a Home Lab Application

```yaml
# home-lab-app.yaml
# Requires an existing PersistentVolumeClaim named pihole-data
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pihole
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: pihole
  template:
    metadata:
      labels:
        app: pihole
    spec:
      nodeSelector:
        device-type: raspberry-pi-4
      containers:
        - name: pihole
          image: pihole/pihole:latest
          env:
            - name: TZ
              value: "America/New_York"
            - name: WEBPASSWORD
              value: "changeme"
          ports:
            - containerPort: 80
              name: web
            - containerPort: 53
              name: dns-tcp
              protocol: TCP
            - containerPort: 53
              name: dns-udp
              protocol: UDP
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "256Mi"
          volumeMounts:
            - name: pihole-data
              mountPath: /etc/pihole
      volumes:
        - name: pihole-data
          persistentVolumeClaim:
            claimName: pihole-data
```

## Performance Tips

```bash
# Enable the CPU governor for performance
echo performance | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# Make it persistent
sudo tee /etc/rc.local > /dev/null <<EOF
#!/bin/bash
echo performance > /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor
exit 0
EOF
sudo chmod +x /etc/rc.local

# Check CPU temperature (watch for throttling)
vcgencmd measure_temp
```

## Conclusion

The Raspberry Pi 4 is an excellent platform for running K3s, capable of serving as both server and agent nodes in a home lab or edge cluster. The 8GB model with a USB SSD can run a K3s server node reliably and serve as the foundation for a multi-Pi Kubernetes cluster. Key preparations include using the 64-bit OS, enabling cgroup memory, disabling swap, and using a SSD for storage. With these steps, your Pi 4 becomes a capable ARM64 Kubernetes node ready for real workloads.
