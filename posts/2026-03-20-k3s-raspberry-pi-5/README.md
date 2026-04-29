# How to Install K3s on Raspberry Pi 5

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Raspberry Pi, ARM64, Edge Computing

Description: Complete guide to setting up K3s on the Raspberry Pi 5, taking advantage of its faster Cortex-A76 CPU and PCIe support for enterprise-grade edge Kubernetes.

## Introduction

The Raspberry Pi 5 is a significant upgrade over its predecessor, featuring a quad-core Cortex-A76 CPU (approximately 3x faster than Pi 4), up to 16GB of RAM, PCIe 2.0 interface (for NVMe SSDs), and a dedicated power management IC. These improvements make the Pi 5 a serious platform for K3s deployments that require real performance.

## Pi 5 Key Improvements Over Pi 4

| Feature | Pi 4 | Pi 5 |
|---------|------|------|
| CPU | Cortex-A72 (1.8GHz) | Cortex-A76 (2.4GHz) |
| PCIe | None | PCIe 2.0 x1 |
| Storage | USB 3.0 SSD | NVMe via M.2 HAT+ |
| Power | 5V/3A | 5V/5A |
| GPU | VideoCore VI | VideoCore VII |

## Step 1: Prepare Raspberry Pi OS

Use the official 64-bit Raspberry Pi OS Lite for the Pi 5:

1. Open Raspberry Pi Imager
2. Select "Raspberry Pi 5" as the device
3. Select "Raspberry Pi OS Lite (64-bit)" as the OS
4. Configure hostname, username/password, SSH, and WiFi in advanced settings
5. Flash to MicroSD or (preferably) an NVMe SSD via a Pi 5 M.2 HAT+

## Step 2: Initial Configuration

```bash
# SSH into the Pi 5

ssh <your-username>@<your-hostname>.local

# Update the system
sudo apt-get update && sudo apt-get full-upgrade -y

# Install useful utilities
sudo apt-get install -y htop iotop vim git parted

# Confirm ARM64
uname -m
# Expected: aarch64
```

## Step 3: Enable cgroup Memory

Current Raspberry Pi OS releases on Pi 5 use `/boot/firmware/` instead of `/boot/`:

```bash
# Pi 5 uses a different config location
# Check which path exists
ls /boot/firmware/cmdline.txt || ls /boot/cmdline.txt

# Edit the cmdline.txt (Pi 5 uses /boot/firmware/)
sudo nano /boot/firmware/cmdline.txt

# Add to the END of the single line:
# cgroup_memory=1 cgroup_enable=memory

# Reboot
sudo reboot
```

After reboot:

```bash
# Verify cgroups are enabled
cat /proc/cgroups | grep memory
# Should show 1 in the last column
```

## Step 4: Disable Swap

```bash
# Check swap status
free -h

# Disable swap file
sudo dphys-swapfile swapoff
sudo dphys-swapfile uninstall
sudo update-rc.d dphys-swapfile disable

# Verify swap is disabled
free -h
```

## Step 5: Configure NVMe Storage (Pi 5 Feature)

If you have the Raspberry Pi M.2 HAT+ with a secondary NVMe SSD and Raspberry Pi OS is booting from MicroSD:

```bash
# Verify the NVMe drive is detected
lsblk
# Should show: nvme0n1

# Create a dedicated partition, then format and mount it
sudo parted -s /dev/nvme0n1 mklabel gpt
sudo parted -s /dev/nvme0n1 mkpart primary ext4 1MiB 100%
sudo mkfs.ext4 /dev/nvme0n1p1
sudo mkdir -p /var/lib/rancher
echo "/dev/nvme0n1p1  /var/lib/rancher  ext4  defaults,noatime  0  2" | sudo tee -a /etc/fstab
sudo mount -a

# Verify the mount
df -h /var/lib/rancher
```

## Step 6: Install K3s

```bash
# Create configuration directory
sudo mkdir -p /etc/rancher/k3s

# Create optimized config for Pi 5
sudo tee /etc/rancher/k3s/config.yaml > /dev/null <<EOF
# Cluster authentication token
token: "Pi5ClusterToken"

# TLS Subject Alternative Names
tls-san:
  - 192.168.1.100
  - pi5.local
  - k3s.home.lab

# Kubelet configuration optimized for Pi 5
kubelet-arg:
  - "max-pods=150"
  - "kube-reserved=cpu=300m,memory=512Mi"
  - "system-reserved=cpu=200m,memory=256Mi"
  - "eviction-hard=memory.available<128Mi,nodefs.available<5%"
  - "container-log-max-size=50Mi"
  - "container-log-max-files=5"

# Node identification labels
node-label:
  - "device-type=raspberry-pi-5"
  - "tier=edge"
  - "storage=nvme"
EOF

# Install K3s
curl -sfL https://get.k3s.io | sudo sh -

# Check service status
sudo systemctl status k3s
```

## Step 7: Configure kubectl

```bash
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config

# Verify the cluster is up
kubectl get nodes -o wide
kubectl get pods --all-namespaces
```

## Step 8: Configure Power Supply

The Pi 5 can boot from a good-quality 5V/3A USB-C power supply, but Raspberry Pi recommends the official 27W USB-C Power Supply for peak workloads and high-power peripherals:

```bash
# Check power supply status
vcgencmd get_throttled
# 0x0 means no throttling

# Check CPU frequency
vcgencmd measure_clock arm
# Under load at full speed: ~2400000000 (2.4GHz)

# Enable performance CPU governor
echo performance | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor
```

## Step 9: Benchmark Improvement vs Pi 4

```bash
# Install sysbench to compare performance
sudo apt-get install -y sysbench

# CPU benchmark
sysbench cpu --cpu-max-prime=20000 run

# Memory benchmark
sysbench memory --memory-total-size=1G run

# Expect a significant uplift vs Pi 4; official Raspberry Pi figures describe Pi 5 as up to 3x faster depending on the workload
```

## Step 10: Deploy a Workload

```yaml
# pi5-workload.yaml - A workload that benefits from Pi 5's CPU
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      nodeSelector:
        device-type: raspberry-pi-5
      containers:
        - name: web-app
          image: nginx:alpine
          ports:
            - containerPort: 80
          resources:
            requests:
              cpu: "100m"
              memory: "64Mi"
            limits:
              cpu: "500m"
              memory: "128Mi"
```

## Comparing Pi 4 and Pi 5 for K3s

```bash
# Check your node's CPU performance with a simple hashing workload
kubectl run cpu-test \
    --image=busybox \
    --restart=Never \
    --overrides='{"spec":{"nodeSelector":{"device-type":"raspberry-pi-5"}}}' \
    -- sh -c 'start=$(date +%s); dd if=/dev/zero bs=1M count=512 2>/dev/null | md5sum; end=$(date +%s); echo "elapsed=$((end-start))s"'

kubectl logs cpu-test
```

## Conclusion

The Raspberry Pi 5 is a compelling upgrade for K3s deployments. Its faster CPU, PCIe/NVMe storage capability, and improved power management make it suitable for production edge workloads that would overwhelm a Pi 4. The key setup steps are the same as Pi 4 - enable cgroup memory, disable swap, and configure appropriate resource limits - but you'll find the Pi 5 handles Kubernetes workloads with much more headroom. Paired with an NVMe SSD via the M.2 HAT+, it becomes a genuine small-form-factor Kubernetes server.
