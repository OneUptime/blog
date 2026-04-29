# Validation Summary: How to Install K3s on Raspberry Pi 5

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes
- Raspberry Pi 5
- Raspberry Pi OS
- `kubectl`
- BusyBox
- `sysbench`

## Sources Consulted
- K3s Requirements: https://docs.k3s.io/installation/requirements
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- K3s Cluster Access: https://docs.k3s.io/cluster-access
- K3s CLI Tools: https://docs.k3s.io/cli
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes node assignment documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes kubelet reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/
- Raspberry Pi 5 product page: https://www.raspberrypi.com/products/raspberry-pi-5/
- Raspberry Pi 5 product brief: https://datasheets.raspberrypi.com/rpi5/raspberry-pi-5-product-brief.pdf
- Raspberry Pi getting started and Imager customization docs: https://www.raspberrypi.com/documentation/computers/getting-started.html
- Raspberry Pi configuration docs (`cmdline.txt` / boot partition): https://www.raspberrypi.com/documentation/computers/configuration.html
- Raspberry Pi power supply and NVMe boot documentation: https://www.raspberrypi.com/documentation/computers/raspberry-pi.html
- Raspberry Pi M.2 HAT+ documentation: https://www.raspberrypi.com/documentation/accessories/m2-hat-plus.html
- Raspberry Pi OS Bullseye update removing the default `pi` user: https://www.raspberrypi.com/news/raspberry-pi-bullseye-update-april-2022/
- Debian `dphys-swapfile` manpage: https://manpages.debian.org/testing/dphys-swapfile/dphys-swapfile.8.en.html
- Debian `update-rc.d` manpage: https://manpages.debian.org/bullseye/init-system-helpers/update-rc.d.8.en.html
- BusyBox command reference: https://busybox.net/downloads/BusyBox.html

## Issues Found
- The introduction said Raspberry Pi 5 supports “up to 8GB of RAM”. Current official Raspberry Pi documentation lists models up to 16GB, so this was updated.
- The setup assumed SSH login with `pi@raspberrypi5.local`, but current Raspberry Pi OS no longer creates a default `pi` user. The post was updated to require setting a username in Imager and to use `<your-username>@<your-hostname>.local`.
- The cgroup example included `cgroup_enable=cpuset`, while current K3s Raspberry Pi requirements document only `cgroup_memory=1 cgroup_enable=memory`. The snippet was aligned with the current K3s requirement.
- The swap-disable sequence used `update-rc.d dphys-swapfile remove`, which Debian documents for removing links after the init script itself has been removed. This was corrected to `update-rc.d dphys-swapfile disable`.
- The NVMe section referred to the old “M.2 HAT” name and formatted `/dev/nvme0n1p1` directly, which could overwrite the boot partition if Raspberry Pi OS was already installed on NVMe. The section was corrected to the current “M.2 HAT+” name and rewritten for the secondary-disk case, including an explicit partition-creation step before formatting.
- The power-supply section incorrectly stated that the official adapter is required to unlock full CPU frequency. Raspberry Pi’s current guidance is that 3A at 5V is sufficient to boot, while the official 27W supply is recommended for peak workloads and high-power peripherals. The text was updated accordingly.
- The benchmark note claimed the Pi 5 “should show ~3x improvement” in CPU benchmarks. Official Raspberry Pi guidance describes the Pi 5 as up to 3x faster depending on workload, so the claim was softened to match the official wording.
- The `kubectl run` example used `bc -l` inside a `busybox` container. The post was updated to use a BusyBox-compatible hashing workload instead.

## Review Notes
- K3s still supports `kubelet-arg`, but current K3s documentation recommends kubelet config files or drop-in config for more advanced tuning on newer releases.
- If Raspberry Pi OS is installed directly on the NVMe drive, Step 5 is not needed because K3s data will already live on NVMe-backed storage by default.
