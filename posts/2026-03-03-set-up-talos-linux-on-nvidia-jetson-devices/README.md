# How to Set Up Talos Linux on NVIDIA Jetson Devices

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, NVIDIA Jetson Nano, ARM64, Edge Computing, Kubernetes

Description: A walkthrough for installing Talos Linux on the NVIDIA Jetson Nano for edge Kubernetes. Only the Jetson Nano is supported via the jetson_nano overlay.

---

NVIDIA Jetson devices are purpose-built for AI and GPU computing at the edge. The Jetson Nano packs an NVIDIA GPU, ARM64 CPU, and hardware video codecs into a compact, power-efficient module. Running Talos Linux on the Jetson Nano gives you a secure, immutable Kubernetes platform for edge workloads - suitable for lightweight inference serving, computer vision, and other AI workloads that need to run close to the data source.

This guide covers the installation and configuration of Talos Linux on the NVIDIA Jetson Nano, from device preparation through to verifying an ARM64 Kubernetes workload.

## Supported Jetson Platforms

As of Talos v1.9, the only officially supported Jetson device is the Jetson Nano, via the `jetson_nano` overlay in the [sbc-jetson](https://github.com/siderolabs/sbc-jetson) repository. Other Jetson devices (Xavier, Orin) are not currently supported by Talos Linux.

| Device | SoC | GPU | RAM | Talos Support |
|--------|-----|-----|-----|---------------|
| Jetson Nano | Tegra X1 | 128 CUDA cores | 4 GB | Official overlay (`jetson_nano`) |
| Jetson Xavier NX | Xavier | 384 CUDA cores | 8 GB | Not supported |
| Jetson AGX Xavier | Xavier | 512 CUDA cores | 32 GB | Not supported |
| Jetson Orin Nano | Orin | 1024 CUDA cores | 8 GB | Not supported |
| Jetson AGX Orin | Orin | 2048 CUDA cores | 32/64 GB | Not supported |

## Prerequisites

You will need:

- An NVIDIA Jetson Nano (4 GB model recommended)
- A Linux host computer for firmware flashing with NVIDIA L4T tools
- Micro-USB cable for flashing
- microSD card (32 GB or larger) for boot media
- Ethernet connection for the Jetson Nano
- USB-to-serial adapter (optional, for console access)
- `talosctl`, `kubectl`, and `crane` on your workstation

## Step 1: Flash the Jetson Nano Firmware

Before installing Talos, flash the Jetson Nano with the patched u-boot firmware. This only needs to be done once.

1. Download the Jetson Nano L4T R32.7.2 release from NVIDIA's developer site.
2. Extract the L4T archive and replace the bundled u-boot with the patched u-boot provided by Siderolabs.
3. Put the Jetson Nano into Force Recovery Mode by placing a jumper on the recovery header pins, then connecting power. On board revision A02, these are pins 3 and 4 of header J40. On board revision B01, these are pins 9 and 10 of header J50.
4. Flash the firmware to the SPI flash:

```bash
# Download and extract the L4T release
curl -SLO https://developer.nvidia.com/embedded/l4t/r32_release_v7.1/t210/jetson-210_linux_r32.7.2_aarch64.tbz2
tar xf jetson-210_linux_r32.7.2_aarch64.tbz2
cd Linux_for_Tegra

# Replace the default u-boot with the patched version
crane --platform=linux/arm64 export ghcr.io/siderolabs/sbc-jetson:v0.1.0 - \
  | tar xf - --strip-components=4 -C bootloader/t210ref/p3450-0000/ \
    artifacts/arm64/u-boot/jetson_nano/u-boot.bin

# Confirm the board is in Force Recovery Mode
lsusb | grep -i "nvidia"

# Flash the firmware
sudo ./flash.sh p3448-0000-max-spi external
```

After flashing, remove the jumper and reboot the device.

## Step 2: Download the Talos Image

Talos provides a Jetson Nano-specific image through the Image Factory using the `jetson_nano` overlay. The default schematic ID for the vanilla Jetson Nano is `c7d6f36c6bdfb45fd63178b202a67cff0dd270262269c64886b43f76880ecf1e`:

```bash
# Download the Talos image for Jetson Nano from the Image Factory
curl -LO "https://factory.talos.dev/image/c7d6f36c6bdfb45fd63178b202a67cff0dd270262269c64886b43f76880ecf1e/v1.9.0/metal-arm64.raw.xz"

# Decompress
xz -d metal-arm64.raw.xz
```

If you need to customize the image (e.g. add system extensions), create a schematic and use the Image Factory. The overlay configuration uses:

```yaml
overlay:
  name: jetson_nano
  image: siderolabs/sbc-jetson
```

## Step 3: Flash Talos to the Boot Media

The Jetson Nano boots from a microSD card or USB storage.

### For SD Card Boot

```bash
# Flash to SD card (replace /dev/sdX with your SD card device)
sudo dd if=metal-arm64.raw of=/dev/sdX bs=4M status=progress conv=fsync
```

### For USB Boot

```bash
# Flash to USB drive (replace /dev/sdX with your USB device)
sudo dd if=metal-arm64.raw of=/dev/sdX bs=4M status=progress conv=fsync
```

## Step 4: First Boot and Network Configuration

Power on the Jetson with the boot media installed. Connect it to your network via ethernet. The device will obtain an IP address through DHCP.

Find the device's IP:

```bash
# Scan your network
nmap -sn 192.168.1.0/24

# Or check your DHCP server's lease table
```

## Step 5: Apply Talos Configuration

Insert the SD card or USB storage into the Jetson Nano, power it on, and wait for the console to show the Talos maintenance-mode instructions. Apply the initial configuration with the interactive installer:

```bash
talosctl apply-config --insecure --mode=interactive --nodes <JETSON_IP>
```

## Step 6: Bootstrap and Verify

```bash
# Configure talosctl if you generated a local talosconfig
talosctl config endpoint <JETSON_IP>
talosctl config node <JETSON_IP>
talosctl config merge talosconfig

# Bootstrap the first control plane node if the interactive flow did not do it for you
talosctl bootstrap

# Check health
talosctl health --wait-timeout 10m

# Get kubeconfig
talosctl kubeconfig .

# Verify nodes
kubectl get nodes
```

## Step 7: Verify GPU Access

Check that the Tegra GPU is detected:

```bash
# Check for Tegra GPU detection in kernel messages
talosctl -n <JETSON_IP> dmesg | grep -i "tegra\|gpu"

# You should see messages about the Tegra GPU being initialized
```

## Step 8: Verify the Cluster is Operational

Once the node is bootstrapped, verify the cluster is healthy:

```bash
# Check node status
kubectl get nodes -o wide

# Verify the node is ARM64
kubectl describe node <JETSON_NODE> | grep "Architecture"
```

## Step 9: Run an ARM64 Workload

Test with a simple ARM64 workload to verify the cluster is operational:

```yaml
# arm64-test.yaml
apiVersion: v1
kind: Pod
metadata:
  name: arm64-test
spec:
  containers:
    - name: test
      image: arm64v8/alpine:latest
      command: ["uname", "-a"]
  restartPolicy: Never
```

```bash
kubectl apply -f arm64-test.yaml
kubectl logs arm64-test

# You should see the ARM64 architecture confirmed in the output
```

Note: GPU-accelerated container workloads on the Jetson Nano through Kubernetes require additional configuration beyond the standard NVIDIA GPU Operator and device plugin, since the Jetson Nano uses an integrated Tegra GPU rather than a discrete PCIe GPU. The `nvidia-container-toolkit` extension can be part of that runtime setup, but it is not sufficient by itself to make Kubernetes advertise `nvidia.com/gpu` resources on Jetson.

## Power Management

The Jetson Nano supports two power modes: 10W (MaxN) and 5W mode. In Talos Linux, the power mode is set at the firmware level. The 10W mode is recommended for Kubernetes workloads as it provides full CPU and GPU performance. The 5W mode can be useful for power-constrained deployments but significantly limits compute throughput.

## Multi-Jetson Cluster

For a multi-node Jetson cluster, designate one device as the control plane and the rest as GPU workers:

```bash
# Generate cluster config once and reuse the same talosconfig for every node
talosctl gen config jetson-cluster https://<JETSON_1_IP>:6443

# Apply control plane config to first Jetson
talosctl apply-config --insecure --nodes <JETSON_1_IP> --file controlplane.yaml

# Apply worker config to additional Jetsons
talosctl apply-config --insecure --nodes <JETSON_2_IP> --file worker.yaml
talosctl apply-config --insecure --nodes <JETSON_3_IP> --file worker.yaml
```

Each worker node will join the cluster, and you can distribute workloads across multiple Jetson Nanos.

## Troubleshooting

If the GPU is not detected after boot, verify the Tegra-related kernel messages:

```bash
talosctl -n <JETSON_IP> dmesg | grep -i "nvidia\|nouveau\|tegra"
```

If you do not see Tegra GPU messages, confirm that the Jetson-specific overlay image was used and that the patched u-boot was flashed correctly. The standard Talos NVIDIA proprietary-driver extensions are intended for supported discrete NVIDIA GPUs, not Jetson's integrated Tegra GPU.

If the device does not boot at all, verify the firmware version. Make sure you flashed the patched u-boot from the Siderolabs `sbc-jetson` image. The Talos Jetson Nano instructions use L4T R32.7.2.

If container images fail to pull, remember that Jetson requires ARM64 container images. Many popular ML images are available for ARM64 through NVIDIA's NGC catalog (nvcr.io).

## Wrapping Up

The NVIDIA Jetson Nano running Talos Linux creates a compact platform for edge Kubernetes workloads. You get an immutable, secure operating system managed through the same Kubernetes tools you use everywhere else. The immutable nature of Talos adds security and reliability to edge deployments where physical access makes traditional Linux distributions vulnerable to tampering. Keep in mind that Talos currently only supports the Jetson Nano via the `jetson_nano` overlay - if you need support for Xavier or Orin devices, check the [sbc-jetson repository](https://github.com/siderolabs/sbc-jetson) for updates as support may expand in the future.
