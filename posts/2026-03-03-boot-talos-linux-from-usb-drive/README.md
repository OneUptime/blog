# How to Boot Talos Linux from USB Drive

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, USB Boot, Bare Metal, Kubernetes, Installation

Description: A practical guide to creating bootable USB drives for Talos Linux and using them to deploy Kubernetes on bare metal machines.

---

Booting from a USB drive is the most straightforward way to get Talos Linux running on bare metal hardware. You download the image, flash it to a USB stick, plug it into your machine, and boot. No network infrastructure, no PXE servers, no complex setup. It is the method most people start with, and it works reliably across a wide range of hardware.

This guide covers everything from creating the bootable USB to transitioning from USB boot to a permanent installation on local storage.

## Choosing the Right USB Drive

Not all USB drives are created equal, and the one you pick can affect your experience:

- **Capacity**: Talos Linux images are small (under 1GB), so even a 4GB drive works. However, a 16GB or 32GB drive gives you room for the persistent state partition if you plan to run directly from USB.
- **Speed**: USB 3.0 drives are noticeably faster than USB 2.0 for both boot time and runtime I/O. If your machine has USB 3.0 ports, use a USB 3.0 drive.
- **Reliability**: For production use, enterprise-grade USB drives or industrial flash drives handle the constant read/write cycles better than consumer drives.

## Step 1: Download the Talos Linux Image

Talos Linux provides ISO images for USB booting:

```bash
# Download the ISO for x86_64 systems
wget https://github.com/siderolabs/talos/releases/download/v1.9.0/metal-amd64.iso

# For ARM64 systems (like Raspberry Pi or ARM servers)
wget https://github.com/siderolabs/talos/releases/download/v1.9.0/metal-arm64.raw.xz
```

You can also download a raw disk image instead of an ISO if you prefer:

```bash
# Raw disk image for x86_64
wget https://github.com/siderolabs/talos/releases/download/v1.9.0/metal-amd64.raw.xz
xz -d metal-amd64.raw.xz
```

## Step 2: Flash the USB Drive

### On Linux

```bash
# Identify your USB device
lsblk

# CRITICAL: Make sure you identify the correct device!
# Writing to the wrong device will destroy data

# Flash the ISO
sudo dd if=metal-amd64.iso of=/dev/sdX bs=4M status=progress conv=fsync

# Flush the write cache
sync
```

### On macOS

```bash
# List disks to find your USB drive
diskutil list

# Unmount the USB drive (replace diskN with your device)
diskutil unmountDisk /dev/diskN

# Write the image using the raw device for better speed
sudo dd if=metal-amd64.iso of=/dev/rdiskN bs=4m

# Flush and eject
sync
diskutil eject /dev/diskN
```

### On Windows

If you are on Windows, use a tool like Rufus or balenaEtcher:

1. Download and install Rufus (https://rufus.ie) or balenaEtcher
2. Select the Talos Linux ISO
3. Select your USB drive
4. Click Start/Flash

Both tools handle the flashing process safely and verify the write.

## Step 3: Configure Your Machine's BIOS

Before booting from the USB drive, you may need to adjust BIOS settings:

1. Power on your machine and enter BIOS (usually F2, Del, or F12)
2. Set the USB drive as the first boot device, or use the one-time boot menu
3. Disable Secure Boot if it causes issues (Talos supports UEFI but some Secure Boot configurations may not work)
4. Enable UEFI boot mode (recommended over Legacy/BIOS mode)
5. Save and exit

## Step 4: Boot from USB

Insert the USB drive and power on your machine. You should see the Talos Linux boot screen within a few seconds. The boot process will:

1. Load the kernel and initramfs from the USB drive
2. Start the Talos Linux init process
3. Configure network interfaces via DHCP
4. Display the node's IP address on the console

Once you see the IP address on the console, your machine is running Talos Linux and waiting for configuration.

## Step 5: Install talosctl

On your workstation (not the machine running Talos), install `talosctl`:

```bash
# Install talosctl
curl -sL https://talos.dev/install | sh

# Verify
talosctl version --client
```

## Step 6: Generate and Apply Configuration

Now configure the node and optionally install Talos to local storage:

```bash
# Generate cluster configuration
talosctl gen config my-cluster https://<NODE_IP>:6443

# Apply the control plane configuration
talosctl apply-config --insecure \
  --nodes <NODE_IP> \
  --file controlplane.yaml
```

When you apply the configuration, Talos Linux will install itself to the local disk specified in the config and reboot. After the reboot, you can remove the USB drive - the machine will boot from its local storage.

```yaml
# The install section in your config determines where Talos installs
machine:
  install:
    disk: /dev/sda  # Or /dev/nvme0n1 for NVMe
    image: ghcr.io/siderolabs/installer:v1.9.0
    wipe: true  # Clean the target disk before installing
```

## Running Talos Directly from USB

If you do not want to install to local storage, you can run Talos Linux entirely from the USB drive. This is useful for testing, temporary clusters, or machines where you do not want to modify the existing disk contents.

To run from USB permanently, you need to adjust the configuration to not trigger an install:

```yaml
# Remove or comment out the install section
# Talos will continue running from the USB drive
machine:
  # install:  # Omit this section to skip disk installation
  network:
    interfaces:
      - interface: eth0
        dhcp: true
```

Keep in mind that running from USB has some limitations:

- USB drives have limited write endurance compared to SSDs
- I/O performance is lower, especially for etcd which is write-heavy
- If the USB drive fails, the node goes down completely

## Step 7: Bootstrap the Cluster

Whether running from USB or local storage, bootstrap the cluster:

```bash
# Set up talosctl
talosctl config endpoint <NODE_IP>
talosctl config node <NODE_IP>

# Bootstrap
talosctl bootstrap

# Monitor health
talosctl health

# Get kubeconfig
talosctl kubeconfig ./kubeconfig
kubectl --kubeconfig=./kubeconfig get nodes
```

## Creating Multiple USB Drives

If you are setting up multiple machines, create several USB drives at once:

```bash
# Flash multiple USB drives
# List all USB devices
lsblk | grep sd

# Flash each one (be careful to use the right devices!)
for device in /dev/sdb /dev/sdc /dev/sdd; do
  echo "Flashing $device..."
  sudo dd if=metal-amd64.iso of=$device bs=4M status=progress conv=fsync &
done

# Wait for all flashing operations to complete
wait
sync
echo "All drives flashed."
```

## USB Boot with Custom Images

If you need a custom Talos image with additional drivers or extensions, create one using the Talos Image Factory or the local imager tool:

```bash
# Build a custom image with additional extensions
docker run --rm -v $(pwd)/_out:/out \
  ghcr.io/siderolabs/imager:v1.9.0 metal \
  --arch amd64 \
  --system-extension-image ghcr.io/siderolabs/iscsi-tools:v0.1.4

# Flash the custom ISO to USB
sudo dd if=_out/metal-amd64.iso of=/dev/sdX bs=4M status=progress conv=fsync
```

## Verifying the USB Drive

After flashing, verify that the drive was written correctly:

```bash
# Check the ISO size
ls -la metal-amd64.iso

# Verify the USB drive content matches
sudo cmp metal-amd64.iso /dev/sdX

# Or check the partition table
sudo fdisk -l /dev/sdX
```

## Troubleshooting

**Machine does not boot from USB**: Check the BIOS boot order. Some machines require you to explicitly select USB boot from a one-time boot menu (usually F10, F11, or F12). Also try a different USB port - some machines only boot from specific ports.

**Boot is extremely slow**: This usually means the USB drive is slow. Try a USB 3.0 drive in a USB 3.0 port. Also check that the BIOS is not falling back to USB 1.1 mode.

**Talos boots but no network**: Check that your Ethernet cable is connected. Talos Linux does not configure WiFi by default. If your machine only has WiFi, you will need a USB Ethernet adapter.

**Error writing to USB**: Make sure the drive is not write-protected. Some USB drives have physical write-protect switches. Also ensure you have sufficient permissions (use sudo on Linux/macOS).

## Conclusion

Booting Talos Linux from USB is the simplest way to get started with bare metal Kubernetes. There is no infrastructure to set up, no network boot configuration, and no dependencies. Flash a USB drive, boot a machine, apply a config, and you have a Kubernetes node. For permanent installations, Talos will install itself to local storage and you can reuse the USB drive for the next machine. For temporary or test setups, running directly from USB keeps your hardware clean.
