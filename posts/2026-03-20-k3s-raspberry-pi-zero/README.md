# How to Install K3s on Raspberry Pi Zero

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Raspberry Pi, ARM, Edge Computing, IoT

Description: A detailed guide to installing K3s on the Raspberry Pi Zero, optimizing for its 512MB RAM and ARMv6 CPU.

## Introduction

The Raspberry Pi Zero is the most constrained device in the Raspberry Pi family - a single-core ARMv6 CPU running at 1GHz and only 512MB of RAM. Running Kubernetes on such hardware sounds impractical, but K3s was specifically designed for exactly this use case. This guide covers how to install K3s as an agent on a Pi Zero, joining it to a cluster managed by more capable hardware.

## Hardware Specifications

| Component | Raspberry Pi Zero W |
|-----------|---------------------|
| CPU | 1GHz single-core ARMv6 |
| RAM | 512MB |
| Storage | MicroSD card |
| Networking | 802.11n WiFi (Zero W) |

**Recommendation**: The Pi Zero is best used as a **K3s agent** (worker node). Run the K3s server on a Pi 4, Pi 5, or another more capable system.

## Step 1: Prepare the SD Card

Use Raspberry Pi OS Lite (32-bit) for the Pi Zero:

1. Download Raspberry Pi Imager
2. Select "Raspberry Pi OS Lite (32-bit)"
3. Configure a username, WiFi credentials, and SSH in the customisation settings
4. Flash to a MicroSD card (use a high-endurance card like Samsung Endurance Pro)

## Step 2: First Boot Configuration

```bash
# SSH into the Pi Zero (may take 2-3 minutes to boot)

ssh <your-username>@raspberrypi.local

# Update the system
sudo apt-get update && sudo apt-get upgrade -y

# Set a static hostname
sudo hostnamectl set-hostname pi-zero-01

# Disable Bluetooth to save resources
sudo systemctl disable bluetooth
sudo systemctl mask bluetooth
```

## Step 3: Enable Required cgroup Settings

This is the most important step - without it, K3s will not start:

```bash
# Edit the kernel boot parameters
# On older Raspberry Pi OS releases, use /boot/cmdline.txt instead.
sudo nano /boot/firmware/cmdline.txt

# The current content looks like:
# console=serial0,115200 console=tty1 root=PARTUUID=xxxx rootfstype=ext4 elevator=deadline fsck.repair=yes rootwait

# Add the cgroup parameters at the END of the SAME LINE (no newline)
# Add: cgroup_memory=1 cgroup_enable=memory

# Final line should look like:
# console=serial0,115200 console=tty1 root=PARTUUID=xxxx rootfstype=ext4 elevator=deadline fsck.repair=yes rootwait cgroup_memory=1 cgroup_enable=memory
```

```bash
# Reboot to apply the cgroup settings
sudo reboot
```

After reboot, verify the settings took effect:

```bash
# Reconnect and check
cat /proc/cgroups | grep memory
# Should show: memory  0  xx  1  (the last column should be 1)
```

## Step 4: Disable Swap

```bash
# Disable the swap file to free memory for K3s
sudo dphys-swapfile swapoff
sudo dphys-swapfile uninstall
sudo update-rc.d dphys-swapfile remove

# Verify swap is off
free -h
# Swap should show 0B
```

## Step 5: Configure the K3s Agent

```bash
# Create the K3s configuration directory
sudo mkdir -p /etc/rancher/k3s

# Configure K3s agent to be as lightweight as possible
sudo tee /etc/rancher/k3s/config.yaml > /dev/null <<EOF
# Connect to the K3s server
server: "https://192.168.1.100:6443"
token: "<contents of /var/lib/rancher/k3s/server/agent-token>"

# Reduce node resource overhead
kubelet-arg:
  - "max-pods=20"
  - "kube-reserved=cpu=50m,memory=64Mi"
  - "system-reserved=cpu=50m,memory=64Mi"
  - "eviction-hard=memory.available<50Mi,nodefs.available<5%"
  - "image-gc-high-threshold=85"
  - "image-gc-low-threshold=70"
  - "container-log-max-size=10Mi"
  - "container-log-max-files=2"

# Label this node as an IoT/edge device
node-label:
  - "device-type=raspberry-pi-zero"
  - "tier=edge"
EOF
```

## Step 6: Install K3s as an Agent

```bash
# Install K3s agent (the ARM hard-float build will be auto-selected)
curl -sfL https://get.k3s.io | \
    INSTALL_K3S_EXEC="agent" \
    sh -s -

# Monitor the installation
sudo journalctl -u k3s-agent -f
```

The installation automatically downloads the `k3s-armhf` binary for the Pi Zero's 32-bit ARM environment.

## Step 7: Verify the Agent Joined

```bash
# On the Pi Zero
sudo systemctl status k3s-agent

# On the K3s server node
kubectl get nodes -o wide

# The Pi Zero should appear as a Ready node
# NAME           STATUS   ROLES    AGE   VERSION        INTERNAL-IP
# pi-zero-01     Ready    <none>   5m    v1.35.4+k3s1   192.168.1.50
```

## Step 8: Deploy a Minimal Workload to the Pi Zero

Force a lightweight workload to run on the Pi Zero:

```yaml
# pi-zero-workload.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: edge-sensor
  namespace: default
spec:
  selector:
    matchLabels:
      app: edge-sensor
  template:
    metadata:
      labels:
        app: edge-sensor
    spec:
      # Target Pi Zero nodes only
      nodeSelector:
        device-type: raspberry-pi-zero
      containers:
        - name: sensor-app
          image: alpine:3.18
          command: ["/bin/sh", "-c", "while true; do echo 'Sensor reading: '$(cat /dev/urandom | head -c 4 | od -An -tu4); sleep 30; done"]
          resources:
            # Very conservative resource limits for Pi Zero
            requests:
              cpu: "10m"
              memory: "16Mi"
            limits:
              cpu: "100m"
              memory: "32Mi"
```

```bash
kubectl apply -f pi-zero-workload.yaml
kubectl get pods -o wide | grep pi-zero
```

## Monitoring Resource Usage

The Pi Zero has very limited RAM. Monitor usage to avoid OOM conditions:

```bash
# On the Pi Zero, watch memory usage
watch -n 5 free -h

# Monitor K3s agent memory
ps aux | grep k3s

# Check overall resource usage via Kubernetes
kubectl top node pi-zero-01
```

## Optimizing SD Card Longevity

SD cards have limited write cycles. Reduce writes to extend the card's life:

```bash
# Use a tmpfs for logs (stores in RAM)
sudo tee -a /etc/fstab > /dev/null <<EOF
tmpfs   /var/log    tmpfs   defaults,noatime,mode=0755,size=20m  0   0
tmpfs   /tmp        tmpfs   defaults,noatime,mode=1777,size=32m  0   0
EOF

# Disable journald to flash (write to RAM instead)
sudo mkdir -p /etc/systemd/journald.conf.d
sudo tee /etc/systemd/journald.conf.d/no-persist.conf > /dev/null <<EOF
[Journal]
Storage=volatile
RuntimeMaxUse=20M
EOF

sudo systemctl restart systemd-journald
```

## Conclusion

The Raspberry Pi Zero can run as a K3s agent with careful configuration. The critical steps are enabling cgroup memory in the boot parameters, disabling swap, and configuring conservative resource limits. Always run Pi Zero as an agent rather than a server, and deploy only lightweight workloads with strict memory limits. With high-endurance SD cards and tmpfs mounts for logs, a Pi Zero K3s agent can run reliably for years as an edge IoT node.
