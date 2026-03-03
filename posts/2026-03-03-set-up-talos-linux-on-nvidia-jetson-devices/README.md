# How to Set Up Talos Linux on NVIDIA Jetson Devices

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, NVIDIA Jetson, ARM64, GPU Computing, Edge AI

Description: A detailed walkthrough for installing and configuring Talos Linux on NVIDIA Jetson devices for GPU-accelerated Kubernetes workloads at the edge.

---

NVIDIA Jetson devices are purpose-built for AI and GPU computing at the edge. The Jetson Nano, Xavier, and Orin series pack NVIDIA GPUs, ARM64 CPUs, and hardware video codecs into compact, power-efficient modules. Running Talos Linux on these devices gives you a secure, immutable Kubernetes platform with direct GPU access - perfect for inference serving, computer vision, and other AI workloads that need to run close to the data source.

This guide covers the installation and configuration of Talos Linux on NVIDIA Jetson hardware, from device preparation through to running GPU-accelerated pods.

## Supported Jetson Platforms

Talos Linux support varies by Jetson generation:

| Device | SoC | GPU | RAM | Talos Support |
|--------|-----|-----|-----|---------------|
| Jetson Nano | Tegra X1 | 128 CUDA cores | 4 GB | Community |
| Jetson Xavier NX | Xavier | 384 CUDA cores | 8 GB | Official overlay |
| Jetson AGX Xavier | Xavier | 512 CUDA cores | 32 GB | Official overlay |
| Jetson Orin Nano | Orin | 1024 CUDA cores | 8 GB | Official overlay |
| Jetson AGX Orin | Orin | 2048 CUDA cores | 32/64 GB | Official overlay |

The newer Orin-based devices have the best Talos support because they use standard UEFI boot, which aligns with how Talos expects to boot on ARM64 hardware.

## Prerequisites

You will need:

- An NVIDIA Jetson device (Orin series recommended)
- A host computer with the NVIDIA SDK Manager installed (for firmware updates)
- USB cable for flashing (micro-USB or USB-C depending on model)
- Ethernet connection for the Jetson
- `talosctl` and `kubectl` on your workstation

## Step 1: Update the Jetson Firmware

Before installing Talos, make sure the Jetson is running the latest firmware. The firmware includes the UEFI bootloader that Talos needs.

For Orin-based devices:

```bash
# On your host computer, use NVIDIA SDK Manager
# or the L4T flash tools
# Download JetPack SDK from NVIDIA's developer site

# Flash the firmware only (not the full OS)
sudo ./flash.sh --no-rootfs jetson-agx-orin-devkit internal
```

For Xavier-based devices:

```bash
# Similar process with L4T tools
sudo ./flash.sh --no-rootfs jetson-agx-xavier-devkit internal
```

After flashing the firmware, the device will boot to a UEFI shell or PXE boot screen.

## Step 2: Download the Talos Image

Talos provides Jetson-specific images through the Image Factory with the appropriate overlay:

```bash
# For Jetson Orin Nano
# Use the Talos Image Factory to get an image with the Jetson overlay

# Generate the image URL from the factory
# The overlay includes Jetson-specific kernel modules and firmware
curl -LO "https://factory.talos.dev/image/<SCHEMATIC_ID>/v1.7.0/metal-arm64.raw.xz"

# Decompress
xz -d metal-arm64.raw.xz
```

Alternatively, build the image with `talosctl`:

```bash
# Create a custom image with Jetson support
cat <<EOF > jetson-profile.yaml
arch: arm64
platform: metal
secureboot: false
version: v1.7.0
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/nvidia-container-toolkit
      - siderolabs/nvidia-open-gpu-kernel-modules
overlay:
  name: jetson-orin
  image: siderolabs/sbc-jetson
EOF
```

## Step 3: Flash Talos to the Boot Media

Jetson devices can boot from eMMC, NVMe, SD card, or USB depending on the model.

### For NVMe Boot (Orin series)

```bash
# Connect the NVMe SSD to the Jetson
# Flash from your host computer via USB
sudo dd if=metal-arm64.raw of=/dev/sdX bs=4M status=progress conv=fsync
# Then insert the NVMe SSD into the Jetson
```

### For SD Card Boot (Nano)

```bash
# Flash to SD card
sudo dd if=metal-arm64.raw of=/dev/sdX bs=4M status=progress conv=fsync
```

### For eMMC Boot

If booting from the internal eMMC, you can flash it using NVIDIA's flash tools:

```bash
# Use the NVIDIA flash script with the Talos image
sudo ./flash.sh -r -k APP -G talos.img jetson-agx-orin-devkit internal
```

## Step 4: First Boot and Network Configuration

Power on the Jetson with the boot media installed. Connect it to your network via ethernet. The device will obtain an IP address through DHCP.

Find the device's IP:

```bash
# Scan your network
nmap -sn 192.168.1.0/24

# Or check your DHCP server's lease table
```

## Step 5: Generate and Apply Talos Configuration

Generate the machine configuration with Jetson-specific settings:

```bash
# Generate base config
talosctl gen config jetson-cluster https://<JETSON_IP>:6443

# Create a Jetson-specific patch
cat <<EOF > jetson-patch.yaml
- op: add
  path: /machine/install/disk
  value: /dev/nvme0n1
- op: add
  path: /machine/install/extensions
  value:
    - image: ghcr.io/siderolabs/nvidia-container-toolkit:latest
    - image: ghcr.io/siderolabs/nvidia-open-gpu-kernel-modules:latest
- op: add
  path: /machine/kernel/modules
  value:
    - name: nvidia
    - name: nvidia_uvm
    - name: nvidia_drm
    - name: nvidia_modeset
EOF

# Apply with the Jetson patch
talosctl apply-config --insecure --nodes <JETSON_IP> \
  --file controlplane.yaml \
  --config-patch @jetson-patch.yaml
```

## Step 6: Bootstrap and Verify

```bash
# Configure talosctl
talosctl config endpoint <JETSON_IP>
talosctl config node <JETSON_IP>
talosctl config merge talosconfig

# Bootstrap
talosctl bootstrap

# Check health
talosctl health --wait-timeout 10m

# Get kubeconfig
talosctl kubeconfig .

# Verify nodes
kubectl get nodes
```

## Step 7: Verify GPU Access

Check that the NVIDIA GPU is detected and the drivers are loaded:

```bash
# Check for NVIDIA kernel modules
talosctl -n <JETSON_IP> dmesg | grep -i nvidia

# You should see messages about the GPU being detected
# and CUDA compute capability
```

## Step 8: Install the NVIDIA Device Plugin

Deploy the NVIDIA device plugin so Kubernetes can schedule GPU workloads:

```bash
# Deploy the device plugin
kubectl apply -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/main/deployments/static/nvidia-device-plugin.yml

# Verify GPU is available
kubectl describe node <JETSON_NODE> | grep nvidia.com/gpu
```

## Step 9: Run a GPU Workload

Test with an inference workload:

```yaml
# inference-test.yaml
apiVersion: v1
kind: Pod
metadata:
  name: jetson-inference
spec:
  containers:
    - name: inference
      image: nvcr.io/nvidia/l4t-tensorrt:r8.6.2-runtime
      command: ["nvidia-smi"]
      resources:
        limits:
          nvidia.com/gpu: 1
  restartPolicy: Never
```

```bash
kubectl apply -f inference-test.yaml
kubectl logs jetson-inference

# You should see the Jetson GPU listed in nvidia-smi output
```

For a more practical test, deploy a CUDA sample:

```yaml
# cuda-sample.yaml
apiVersion: v1
kind: Pod
metadata:
  name: cuda-vector-add
spec:
  containers:
    - name: cuda
      image: nvcr.io/nvidia/k8s/cuda-sample:vectoradd-cuda11.7.1-ubi8
      resources:
        limits:
          nvidia.com/gpu: 1
  restartPolicy: Never
```

## Power Management

Jetson devices support multiple power modes that trade performance for power consumption:

```bash
# Check current power mode from within the Jetson
# This is accessible through the kernel sysfs interface
talosctl -n <JETSON_IP> read /sys/bus/platform/drivers/tegra-bpmp/thermal/
```

For production edge deployments, you may want to lock the power mode to a consistent setting. The 15W or 30W modes on the AGX Orin provide a good balance of performance and thermal headroom.

## Multi-Jetson Cluster

For a multi-node Jetson cluster, designate one device as the control plane and the rest as GPU workers:

```bash
# Apply control plane config to first Jetson
talosctl apply-config --insecure --nodes <JETSON_1_IP> --file controlplane.yaml

# Apply worker config to additional Jetsons
talosctl apply-config --insecure --nodes <JETSON_2_IP> --file worker.yaml
talosctl apply-config --insecure --nodes <JETSON_3_IP> --file worker.yaml
```

Each worker node will advertise its GPU to the Kubernetes scheduler, and you can run distributed inference or training across multiple Jetsons.

## Troubleshooting

If the GPU is not detected after boot, verify that the NVIDIA kernel modules are loaded:

```bash
talosctl -n <JETSON_IP> dmesg | grep -i "nvidia\|nouveau\|tegra"
```

If you see "nouveau" driver messages instead of NVIDIA, the proprietary modules are not loading. Make sure the NVIDIA extensions are included in the Talos image.

If the device does not boot at all, verify the firmware version. Older Jetson firmware may not support the UEFI boot flow that Talos requires. Update to the latest JetPack version.

If container images fail to pull, remember that Jetson requires ARM64 container images. Many popular ML images are available for ARM64 through NVIDIA's NGC catalog (nvcr.io).

## Wrapping Up

NVIDIA Jetson devices running Talos Linux create a powerful platform for edge AI. You get GPU-accelerated computing in a compact, power-efficient package, managed through the same Kubernetes tools you use everywhere else. The immutable nature of Talos adds security and reliability to edge deployments where physical access makes traditional Linux distributions vulnerable to tampering. Whether you are running inference at the edge, processing video streams, or doing real-time data analysis, the Jetson plus Talos combination delivers the performance and manageability that production edge deployments demand.
