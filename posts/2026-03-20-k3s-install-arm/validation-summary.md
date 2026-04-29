# Validation Summary: How to Install K3s on ARM Devices

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- K3s
- Kubernetes
- Raspberry Pi
- NVIDIA Jetson
- ARM64 / AArch64
- ARMv7 / armhf
- Linux systemd services

## Sources Consulted
- K3s Requirements: https://docs.k3s.io/installation/requirements
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- K3s Server CLI reference: https://docs.k3s.io/cli/server
- K3s Agent CLI reference: https://docs.k3s.io/cli/agent
- K3s install script source: https://raw.githubusercontent.com/k3s-io/k3s/master/install.sh
- Raspberry Pi `config.txt` documentation: https://www.raspberrypi.com/documentation/computers/config_txt.html
- Raspberry Pi configuration documentation (`cmdline.txt`): https://www.raspberrypi.com/documentation/computers/configuration.html
- Raspberry Pi Zero 2 W product page: https://www.raspberrypi.com/products/raspberry-pi-zero-2-w/
- Kubernetes swap behavior reference: https://kubernetes.io/docs/reference/node/swap-behavior/
- Installing kubeadm (`swap` behavior note): https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/
- NVIDIA Jetson Linux bootloader documentation (`/boot/extlinux/extlinux.conf`): https://docs.nvidia.com/jetson/archives/l4t-archived/l4t-3276/Tegra%20Linux%20Driver%20Package%20Development%20Guide/uboot_guide.html

## Issues Found
- The post claimed ARMv6 support and listed a nonexistent `k3s-armv6l` binary. Updated the post to reflect current K3s support for `armhf` and `arm64/aarch64` only, and replaced the Raspberry Pi Zero / Pi 1 install instructions with an explicit unsupported note.
- The introduction and architecture table implied that original Raspberry Pi Zero hardware is a supported K3s target and listed Apple M1 Macs as a typical device. Updated the device examples so they match current K3s Linux ARM targets.
- The Raspberry Pi cgroup instructions used outdated Raspberry Pi OS boot file paths and included `cgroup_enable=cpuset`, which is not part of the current K3s Raspberry Pi guidance. Updated the path to `/boot/firmware/cmdline.txt` for current Raspberry Pi OS, kept the older `/boot/cmdline.txt` path as a note, and corrected the kernel parameters.
- The Raspberry Pi 4 64-bit-mode note used the pre-Bookworm config path. Updated it to `/boot/firmware/config.txt` and preserved `/boot/config.txt` as the older-path fallback.
- The Raspberry Pi 3 section implied a default 32-bit OS image rather than the real 32-bit/64-bit split that determines whether K3s uses `armhf` or `arm64`. Reworded the section to make that distinction explicit.
- The storage example said it was mounting `/var/lib/rancher` to SSD but actually mounted `/mnt/ssd`, and it pointed `data-dir` at a subdirectory that would not exist after the mount. Corrected the commands to mount the SSD, create the K3s data directory on the mounted filesystem, and point `data-dir` at that real path.
- The verification section only checked the `k3s` service and used a custom-columns expression that did not reliably reflect node readiness. Updated it to show both `k3s` and `k3s-agent`, added a separate `kubectl get nodes` status check, and kept the architecture output focused on the relevant fields.
- The binary verification step assumed K3s was installed in `/usr/local/bin`. Updated it to use `file "$(command -v k3s)"` so it works even when the installer chooses a different binary directory.
- The memory-tuning snippet included undocumented per-component memory-savings numbers. Removed those numeric claims while keeping the valid `disable` configuration.

## Review Notes
- Kubernetes can now be configured to tolerate or use swap on Linux nodes, but the default kubelet behavior still treats swap-free nodes as the simplest baseline. The post’s remaining "Disable Swap (Recommended)" guidance is still reasonable for a general K3s installation guide.
- Jetson systems are Ubuntu-based and typically already have cgroups enabled. The post now keeps the Jetson note narrowly focused on where kernel arguments are configured on platforms that need adjustment.
