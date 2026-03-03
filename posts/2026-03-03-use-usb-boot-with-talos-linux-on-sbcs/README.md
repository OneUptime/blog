# How to Use USB Boot with Talos Linux on SBCs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, USB Boot, Single Board Computer, ARM64, Kubernetes

Description: Learn how to configure USB boot for Talos Linux on popular single-board computers, improving performance and reliability over SD card-based installations.

---

SD cards are the default boot medium for most single-board computers, but they are not ideal for running Kubernetes. They wear out, they are slow for random I/O, and a corrupted SD card can take your entire node offline. USB boot solves these problems by letting you run Talos Linux from a USB SSD or flash drive, which offers dramatically better performance and durability.

This guide covers how to set up USB boot for Talos Linux across several popular SBC platforms, including configuration specifics for each board.

## Why USB Boot Matters

The difference between SD card and USB SSD performance is substantial:

| Metric | SD Card (A2) | USB 3.0 SSD |
|--------|-------------|-------------|
| Sequential Read | 100 MB/s | 400+ MB/s |
| Sequential Write | 60 MB/s | 350+ MB/s |
| Random 4K Read | 4,000 IOPS | 30,000+ IOPS |
| Random 4K Write | 2,000 IOPS | 25,000+ IOPS |
| Write Endurance | ~30 TB | ~300 TB |

Random I/O performance is what matters most for Kubernetes. Container image layers, etcd operations, and pod log writes are all random I/O patterns. A USB SSD can be 5-10x faster for these operations.

## Choosing a USB Drive

Not all USB drives are equal for running an OS:

- **USB SSDs** (Samsung T7, WD My Passport SSD) - Best performance, most reliable
- **USB flash drives** - Cheaper but slower and less durable. Only use high-quality drives like SanDisk Extreme Pro.
- **USB-to-SATA adapters** with a 2.5" SSD - Good performance, cost-effective for larger storage

Avoid cheap USB flash drives. Their random I/O performance is often worse than a good SD card, defeating the purpose of switching.

## USB Boot on Raspberry Pi 4

The Raspberry Pi 4 supports USB boot natively, but it needs to be enabled in the bootloader EEPROM.

### Enable USB Boot

If you have not already enabled USB boot, you need to do this once using Raspberry Pi OS:

```bash
# Boot the Pi with Raspberry Pi OS on an SD card
sudo apt update
sudo apt install rpi-eeprom

# Update the EEPROM to the latest version
sudo rpi-eeprom-update -a

# Edit the EEPROM config
sudo rpi-eeprom-config --edit

# Change the BOOT_ORDER line to:
# BOOT_ORDER=0xf14
# This means: USB (4), SD (1), restart (f)
# Save and exit

# Reboot to apply
sudo reboot
```

After the EEPROM is updated, the Pi will try USB boot before SD card boot.

### Flash Talos to USB

```bash
# Download the Talos Pi image
curl -LO https://github.com/siderolabs/talos/releases/latest/download/metal-rpi_generic-arm64.raw.xz
xz -d metal-rpi_generic-arm64.raw.xz

# Identify your USB drive
lsblk

# Flash the image to the USB drive
sudo dd if=metal-rpi_generic-arm64.raw of=/dev/sdX bs=4M status=progress conv=fsync
sync
```

Remove the SD card, plug in the USB drive, and power on the Pi. It should boot directly from USB.

### Generate Configuration for USB Disk

When generating the Talos configuration, make sure the install disk points to the USB device:

```bash
# Generate configs with USB disk target
talosctl gen config pi-cluster https://<PI_IP>:6443 \
  --config-patch '[{"op": "add", "path": "/machine/install/disk", "value": "/dev/sda"}]'
```

The USB drive typically shows up as `/dev/sda` on Raspberry Pi.

## USB Boot on Raspberry Pi 5

The Pi 5 supports USB boot out of the box with its updated bootloader. The process is similar to the Pi 4 but the bootloader configuration is slightly different:

```bash
# On Pi 5, USB boot is enabled by default
# Just verify the boot order
sudo rpi-eeprom-config --edit

# Recommended boot order for Pi 5:
# BOOT_ORDER=0xf416
# NVMe (6), USB (4), SD (1), restart (f)
```

Flash Talos to a USB drive and boot. The Pi 5's USB 3.0 controller provides better throughput than the Pi 4.

## USB Boot on Rock Pi and Pine64 Boards

Many Rockchip-based SBCs (Rock Pi 4, Pine64 boards) require different steps because they use U-Boot instead of the Pi's proprietary bootloader.

### Rock Pi 4

The Rock Pi 4 needs SPI flash to be programmed with a USB-boot-capable bootloader:

```bash
# First, flash U-Boot to SPI
# This typically requires a working SD card boot first

# Download the SPI U-Boot image for your board
# Flash it to SPI using the board-specific tools

# Once SPI has a bootable U-Boot, flash Talos to USB
sudo dd if=metal-arm64.raw of=/dev/sdX bs=4M status=progress conv=fsync
```

The exact process varies by board revision. Check the board manufacturer's documentation for SPI flash instructions.

### Pine64 Boards

Pine64 boards like the ROCKPro64 follow a similar pattern:

```bash
# Write U-Boot to SPI flash (board-specific process)
# Then flash Talos to USB
sudo dd if=metal-arm64.raw of=/dev/sdX bs=4M status=progress conv=fsync
```

## USB Boot on NVIDIA Jetson

NVIDIA Jetson devices (Nano, Xavier, Orin) support USB boot through their UEFI firmware:

```bash
# Update Jetson firmware to support USB boot
# This is done through NVIDIA's SDK Manager or L4T tools

# Flash Talos to USB
sudo dd if=metal-arm64.raw of=/dev/sdX bs=4M status=progress conv=fsync
```

On Jetson Orin devices with UEFI firmware, USB boot works similarly to standard UEFI x86 systems.

## Handling Device Naming

One challenge with USB boot is that device names can change between reboots if you have multiple USB devices. Talos handles this through persistent device naming, but you should be aware of it.

```bash
# Check block device names on a running Talos node
talosctl -n <NODE_IP> get blockdevices

# Use /dev/disk/by-id/ for stable naming in configs
talosctl -n <NODE_IP> ls /dev/disk/by-id/
```

In the Talos machine configuration, you can use the disk ID for more reliable device identification:

```yaml
machine:
  install:
    disk: /dev/disk/by-id/usb-Samsung_T7_1234567890-0:0
```

## Adding a Second USB Drive

You can use a second USB drive for additional storage while booting from the first:

```yaml
# Machine config for two USB drives
machine:
  install:
    disk: /dev/sda  # Boot drive

  disks:
    - device: /dev/sdb  # Second USB drive
      partitions:
        - mountpoint: /var/mnt/storage
          size: 0  # Use all space
```

This second drive can then be used by Kubernetes through a local path provisioner or CSI driver.

## Performance Tuning for USB Storage

Optimize the USB storage performance in Talos:

```yaml
machine:
  sysctls:
    # USB storage I/O scheduling
    # deadline or mq-deadline works best for USB SSDs
    # This is set per-device, so we use a general approach

    # Increase readahead for better sequential performance
    vm.dirty_ratio: "20"
    vm.dirty_background_ratio: "5"

    # Reduce commit interval for better write-back behavior
    vm.dirty_writeback_centisecs: "500"
```

For USB SSDs, you can also enable TRIM support if the drive supports it:

```bash
# Check if TRIM is supported
talosctl -n <NODE_IP> dmesg | grep -i trim

# TRIM support depends on the USB-SATA bridge chip
# Not all USB enclosures pass through TRIM commands
```

## Monitoring USB Drive Health

Keep an eye on your USB storage health:

```bash
# Check for USB errors in kernel logs
talosctl -n <NODE_IP> dmesg | grep -i "usb\|error\|reset"

# Monitor disk I/O
talosctl -n <NODE_IP> stats
```

Watch for USB reset messages in the kernel log. Frequent resets indicate a failing drive, a bad cable, or insufficient power delivery.

## Troubleshooting

If the SBC does not boot from USB, the most common causes are:

1. The bootloader does not support USB boot - Update the EEPROM/firmware
2. The USB drive is on a USB 2.0 port - Some boards have both USB 2.0 and 3.0 ports, and boot may only work from specific ports
3. The USB enclosure is not compatible - Some USB-to-SATA bridges are not recognized by the bootloader. Try a different enclosure.
4. Power issues - USB SSDs can draw enough power to cause instability. Use a powered USB hub if needed.

If Talos boots but cannot find the install disk, check the device name. It might be `/dev/sda`, `/dev/sdb`, or something else depending on the number of USB devices connected.

## Wrapping Up

Switching from SD card to USB boot is one of the single biggest improvements you can make to a Talos Linux SBC cluster. The performance and reliability gains are substantial, and the configuration process is straightforward once the bootloader is set up. For any SBC cluster that runs real workloads, USB SSD boot is worth the small additional cost.
