# Validation Summary: How to Use USB Boot with Talos Linux on SBCs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Talos Linux
- Talos Image Factory
- talosctl
- Raspberry Pi EEPROM bootloader
- USB mass storage boot
- U-Boot on ARM64 single-board computers
- Talos storage and user volume configuration
- Kubernetes local storage

## Sources Consulted
- Talos v1.13 Raspberry Pi Series documentation: https://docs.siderolabs.com/talos/v1.13/platform-specific-installations/single-board-computers/rpi_generic
- Talos v1.13 Radxa ROCK PI 4 documentation: https://docs.siderolabs.com/talos/v1.13/platform-specific-installations/single-board-computers/rockpi_4
- Talos v1.13 Pine64 documentation: https://docs.siderolabs.com/talos/v1.13/platform-specific-installations/single-board-computers/pine64
- Talos v1.13 Jetson Nano documentation: https://docs.siderolabs.com/talos/v1.13/platform-specific-installations/single-board-computers/jetson_nano
- Talos v1.13 UserVolumeConfig reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/block/uservolumeconfig
- Talos v1.13 disk management documentation: https://docs.siderolabs.com/talos/v1.13/configure-your-talos-cluster/storage-and-disk-management/disk-management
- Talos v1.13 talosctl CLI reference: https://docs.siderolabs.com/talos/v1.13/reference/cli
- Raspberry Pi bootloader and BOOT_ORDER documentation: https://www.raspberrypi.com/documentation/computers/raspberry-pi.html
- Sidero Labs overlays repository: https://github.com/siderolabs/overlays

## Issues Found
- The Raspberry Pi Talos image download used an older GitHub release asset name. Updated it to the current Talos Image Factory URL pattern and the Raspberry Pi generic default schematic ID.
- The Raspberry Pi 5 boot-order example used `BOOT_ORDER=0xf416` while describing the order as NVMe, USB, SD. Raspberry Pi EEPROM boot order is evaluated right-to-left, so the value was corrected to `0xf146` for that order.
- The Raspberry Pi 5 section implied Talos support was equivalent to Raspberry Pi 4 support. Added the official caveat that the Raspberry Pi generic image is documented as officially tested on Raspberry Pi 4 and community tested on Compute Module 4.
- The Pine64 section implied a generic SPI/U-Boot USB boot flow for Pine64 boards. Updated it to reflect that Talos documents Pine64/Pine64 Rock64 flows as SD-card based and USB boot depends on board firmware.
- The Talos block device discovery command used `get blockdevices`; updated it to the current `talosctl get disks` resource.
- The file listing command used `talosctl ls`; updated it to `talosctl list`.
- The second USB drive example used an obsolete `machine.disks` configuration shape. Replaced it with a current `UserVolumeConfig` example that mounts under `/var/mnt/storage`.
- The performance tuning comments incorrectly described dirty writeback sysctls as readahead and scheduler tuning. Reworded the comments to describe writeback behavior.
- The monitoring example used `talosctl stats` for disk I/O, but the CLI reference describes it as container stats. Replaced it with `talosctl usage` for disk usage inspection.
- The TRIM section said to enable TRIM without showing a valid Talos mechanism. Reworded it as verifying TRIM support.

## Review Notes
The post remains a high-level SBC guide. Board-specific USB boot behavior varies significantly by firmware, bootloader version, enclosure, and power delivery, so future revisions should consider adding tested board/firmware combinations instead of relying on generic SBC guidance.
