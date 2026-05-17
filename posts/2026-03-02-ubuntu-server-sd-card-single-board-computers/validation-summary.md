# Validation Summary: How to Flash Ubuntu Server to an SD Card for Single-Board Computers

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Ubuntu Server 24.04 LTS (Noble)
- Raspberry Pi (Pi 3, 4, 5, CM4, Zero 2 W)
- cloud-init / netplan (network-config v2)
- `dd`, `xzcat`, `growpart`, `resize2fs` CLI tools
- Raspberry Pi Imager and Balena Etcher (GUI flashers)
- `rpi-eeprom-config` and `raspi-config`
- `vcgencmd` (Raspberry Pi userland)

## Sources Consulted
- Ubuntu cdimage server listing: https://cdimage.ubuntu.com/ubuntu-server/noble/daily-preinstalled/current/ (confirmed filename `noble-preinstalled-server-arm64+raspi.img.xz` and supported boards)
- Ubuntu Raspberry Pi download page: https://ubuntu.com/download/raspberry-pi (verified supported Pi models)
- Ubuntu Server install on Raspberry Pi documentation
- Ubuntu packages search for `raspi-config` (confirmed availability in noble universe)
- Raspberry Pi bootloader documentation (BOOT_ORDER hex digit semantics)
- cloud-init / netplan documentation for `network-config` v2 syntax

## Issues Found
- **Supported boards list inaccurate**: The post listed "Raspberry Pi 2, 3, 4, 5 (arm64 and armhf)" as supported by Ubuntu Server's preinstalled images. The current cdimage listing and Ubuntu's official Pi download page do not include Pi 2; the daily-preinstalled image notes support for "Pi 3, 4, 5, CM4, and Zero 2 W" (arm64 only). Updated the list to match Canonical's currently supported boards and removed the armhf reference.

## Review Notes
- The image download URL (`https://cdimage.ubuntu.com/ubuntu-server/noble/daily-preinstalled/current/noble-preinstalled-server-arm64+raspi.img.xz`) is correct and currently resolves.
- The macOS `dd` snippet correctly uses lowercase `bs=4m` (BSD dd convention) and `/dev/rdiskN` for raw, unbuffered access.
- The `conv=fsync` flag on Linux `dd` is correctly used to flush writes before the command returns.
- The cloud-init `network-config` v2 examples (including the `routes: - to: default via:` style) match current netplan syntax, which has replaced the older `gateway4` key.
- Defining `users:` in `user-data` without `- default` does in fact suppress the default `ubuntu` user, so the inline comment is accurate.
- `BOOT_ORDER=0xf41` is correctly described: the value is read right-to-left, so `1` (SD CARD) is tried first, then `4` (USB-MSD), then `f` (RESTART/loop).
- `raspi-config` is available in Ubuntu noble's universe repo (`apt install raspi-config`), so the Pi-specific advice still works, but it is not preinstalled on Ubuntu Server — users may need to install it first. Not changed because the post does not claim it is preinstalled.
- `vcgencmd` requires the `libraspberrypi-bin` package, which is not installed by default on Ubuntu Server for Pi. Worth a follow-up note in a future revision but not technically incorrect as written.
- The auto-resize claim for the root filesystem is correct; Ubuntu's preinstalled cloud images include `cloud-initramfs-growroot` and run growpart/resize on first boot.
