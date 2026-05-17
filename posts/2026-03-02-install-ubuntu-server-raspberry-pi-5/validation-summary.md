# Validation Summary: How to Install Ubuntu Server on a Raspberry Pi 5

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Raspberry Pi 5 (BCM2712, Cortex-A76)
- Ubuntu Server 24.04 LTS (arm64, preinstalled Pi image)
- Raspberry Pi Imager
- `dd` / `xzcat` image flashing
- cloud-init (user-data, ssh_authorized_keys, runcmd, packages)
- Netplan
- UFW
- Raspberry Pi EEPROM / `rpi-eeprom-config` (NVMe boot via PCIe FPC HAT)
- CPU frequency scaling (`cpufreq`, `cpufrequtils`)
- Thermal sysfs / `vcgencmd`
- `growpart` / `resize2fs`

## Sources Consulted
- Raspberry Pi 5 product brief and datasheet (https://www.raspberrypi.com/products/raspberry-pi-5/)
- Raspberry Pi documentation — `config.txt` reference (https://www.raspberrypi.com/documentation/computers/config_txt.html) — confirms that `gpu_mem` does not apply to Pi 5 (dynamic firmware-managed allocation)
- Raspberry Pi documentation — bootloader configuration / `BOOT_ORDER` encoding (https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#BOOT_ORDER) — boot-device digit table including `0x6 NVMe`, `0x1 SD CARD`, `0x4 USB-MSD`, `0xf RESTART`
- Ubuntu for Raspberry Pi documentation and cdimage release tree (https://ubuntu.com/download/raspberry-pi, https://cdimage.ubuntu.com/releases/24.04/release/)
- cloud-init reference for modules (`users`, `ssh_pwauth`, `runcmd`, `packages`, `manage_etc_hosts`) (https://cloudinit.readthedocs.io/)
- Netplan reference for `routes` syntax replacing the deprecated `gateway4` (https://netplan.readthedocs.io/)
- Homebrew Cask catalog entry for `raspberry-pi-imager` (https://formulae.brew.sh/cask/raspberry-pi-imager)
- UFW manpage / Ubuntu Server guide for the `OpenSSH` application profile

## Issues Found
1. **macOS install command for Raspberry Pi Imager** — the post used `brew install raspberry-pi-imager`. The official distribution on Homebrew is a Cask (GUI application). Updated to `brew install --cask raspberry-pi-imager` so the command works reliably across recent Homebrew versions and matches the published cask.
2. **`BOOT_ORDER=0xf416` description** — the post stated the bootloader would try "NVMe first, then SD, then USB, then network". The hex digits are read least-significant-first; the leading `f` digit means `RESTART` (loop the boot sequence), not network (`0x2`). Rewrote the explanation to correctly describe the fourth digit as a sequence restart.
3. **`gpu_mem=16` in `/boot/firmware/config.txt`** — on the Raspberry Pi 5 the firmware allocates GPU memory dynamically, and `gpu_mem` has no effect. Recommending users append it and reboot is misleading. Replaced the "Memory Split" subsection with a "Memory Allocation" note explaining that the Pi 5 manages this dynamically and the legacy knob no longer applies.

## Review Notes
- The Ubuntu image URL `https://cdimage.ubuntu.com/releases/24.04/release/ubuntu-24.04-preinstalled-server-arm64+raspi.img.xz` is a stable, generic path that Canonical maintains alongside point-release filenames (e.g. `ubuntu-24.04.2-preinstalled-server-arm64+raspi.img.xz`). Either filename works; left as written.
- The `nmap -sn` example for finding the Pi relies on MAC-vendor lookup output, which generally requires running with `sudo` so nmap performs an ARP scan and resolves the Raspberry Pi Trading OUI. Not changed — the example is still useful — but worth noting as a future improvement.
- `vcgencmd` on Ubuntu Server for Pi is provided by the `libraspberrypi-bin` package, which is not installed by default. The post already qualifies the command with "if installed".
- The Netplan example uses the modern `routes:` block (with `to: default`) instead of the deprecated `gateway4` — correct for Netplan shipped with 24.04.
- The Pi 5 RAM options listed (4 GB / 8 GB) match the launch SKUs; Raspberry Pi has since added 2 GB and 16 GB variants, but the post's phrasing ("4 GB or 8 GB recommended") remains accurate as a recommendation for server workloads.
- The bootloader EEPROM that ships on a Pi 5 already supports NVMe boot in current production firmware, but very early units may need `sudo rpi-eeprom-update -a` before the new `BOOT_ORDER` will take effect. The post links the user to `rpi-eeprom-update` to inspect, which is sufficient.
