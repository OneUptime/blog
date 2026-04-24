# Validation Summary: How to Install Portainer on Raspberry Pi 5

## Status
validated

## Post Type
Guide

## Technologies Covered
- Raspberry Pi 5
- Raspberry Pi OS
- Docker Engine
- Portainer CE
- NVMe SSD storage over PCIe

## Sources Consulted
- Raspberry Pi OS downloads: https://www.raspberrypi.com/software/operating-systems/
- Raspberry Pi getting started and Imager customisation: https://www.raspberrypi.com/documentation/computers/getting-started.html
- Raspberry Pi remote access over SSH: https://www.raspberrypi.com/documentation/computers/remote-access.html
- Raspberry Pi NVMe SSD documentation: https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#nvme-ssd-boot
- Raspberry Pi 5 product brief: https://datasheets.raspberrypi.com/rpi5/raspberry-pi-5-product-brief.pdf
- Raspberry Pi 4 Model B specifications: https://www.raspberrypi.com/products/raspberry-pi-4-model-b/specifications/
- Introducing Raspberry Pi 5: https://www.raspberrypi.com/news/introducing-raspberry-pi-5/
- Docker Engine post-installation steps: https://docs.docker.com/engine/install/linux-postinstall/
- Docker daemon configuration: https://docs.docker.com/engine/daemon/
- Install Portainer CE with Docker on Linux: https://docs.portainer.io/sts/start/install-ce/server/docker/linux

## Issues Found
- The post hardcoded the `pi` username in `ssh pi@raspberrypi.local` and `sudo usermod -aG docker pi`. Current Raspberry Pi Imager guidance expects you to configure a username during image customisation, so I changed these to `<username>` and `$USER`.
- The post explicitly targeted Raspberry Pi OS Bookworm. Raspberry Pi’s current supported 64-bit release is Trixie, with Bookworm now listed as Legacy, so I updated the post to refer to `Raspberry Pi OS (64-bit)` instead of an outdated release name.
- The `cat > /etc/docker/daemon.json << 'EOF'` example would fail because the shell redirection was not running with elevated privileges. I replaced it with `sudo tee /etc/docker/daemon.json > /dev/null << 'EOF'`.
- The NVMe section implied that setting Docker `data-root` fully moves Docker storage to the SSD. Docker’s current daemon documentation notes that on Docker Engine 29.0+ fresh installs, `data-root` does not move the containerd image store, so I added that caveat.
- The Portainer deployment used `portainer/portainer-ce:latest`. Current Portainer CE install documentation uses the `:sts` tag, so I aligned the post with the official install command.
- The prerequisites and thermal section said Raspberry Pi 5 runs hotter than Raspberry Pi 4 and requires active cooling. Raspberry Pi’s official documentation says Raspberry Pi 5 handles typical uncased workloads without active cooling and runs cooler than Raspberry Pi 4 for the same workload, so I corrected that wording to recommend active cooling for sustained heavy loads instead.
- The comparison table listed Raspberry Pi 4 memory as `LPDDR4X`, which is incorrect according to the official Raspberry Pi 4 specifications. I corrected the memory row and replaced the unsourced Portainer/container timing rows with documented hardware-level performance differences from Raspberry Pi’s official material.

## Review Notes
- Portainer port `8000` is optional and primarily used for Edge Agent features. The post’s command is still valid as written.
- The `/etc/fstab` example uses the device path `/dev/nvme0n1p1`. This works, but a UUID-based mount entry would be more resilient if device naming changes.
