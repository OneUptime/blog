# Validation Summary: How to Install Ubuntu Core on Raspberry Pi

## Status
validated

## Post Type
Tutorial / Step-by-step installation guide

## Technologies Covered
- Ubuntu Core 22
- Raspberry Pi (4, 3B+, CM4)
- snapd / snap packages
- Ubuntu One (SSO)
- console-conf (first-boot setup)
- pi gadget snap (hardware configuration)
- netplan (network configuration)
- Docker (snap)
- Landscape (Canonical device management)

## Sources Consulted
- Ubuntu Core documentation: https://ubuntu.com/core/docs
- Ubuntu Core install guide for Raspberry Pi: https://ubuntu.com/core/docs/install-rpi-fundamentals
- Ubuntu Core image downloads: https://ubuntu.com/download/raspberry-pi-core
- Snapcraft documentation for `snap` CLI: https://snapcraft.io/docs
- `snap hold` / `snap unhold` reference (snapd 2.58+): https://snapcraft.io/docs/managing-updates
- Pi gadget snap repository: https://github.com/snapcore/pi-gadget
- Docker snap on Ubuntu Core: https://snapcraft.io/docker
- Landscape API endpoint: https://landscape.canonical.com/

## Issues Found
- **Step 4 (First Boot and Configuration)**: The original text claimed the first-boot setup wizard appears "the first time you SSH in" and showed a setup prompt as if it ran inside an SSH session. This is technically incorrect — Ubuntu Core's `console-conf` runs on the local system console (HDMI/keyboard or serial UART) before SSH is available. SSH access is only enabled *after* `console-conf` finishes importing the SSH keys from Ubuntu One. Rewrote the section to describe the correct flow: connect a display/keyboard or serial console, complete `console-conf` locally, then SSH in over the network.

## Review Notes
- The `wget` URL pattern (`https://cdimage.ubuntu.com/ubuntu-core/22/stable/current/ubuntu-core-22-arm64+raspi.img.xz`) matches the official Ubuntu cdimage layout for Ubuntu Core 22.
- The `snap set pi <option>=<value>` examples (uart, gpu-mem, i2c, spi, camera) reflect the historical pi-config/pi gadget snap pattern. Exact key names and accepted values (e.g. `1` vs `true`) can vary slightly across gadget snap revisions — these examples are illustrative and users should consult `sudo snap get pi` on their device to see exactly what their gadget supports.
- The Docker post-install sequence (`addgroup` → `adduser` → `snap disable docker` → `snap enable docker`) is unusual but is the documented procedure on the Docker snap page for picking up new group membership without a reboot. Left as-is.
- `snap hold` / `snap unhold` require snapd 2.58 or later (which is comfortably below the snapd version shipped with Ubuntu Core 22). No concern.
- The disk footprint comparison (~500MB vs ~2-4GB) is a rough approximation; actual sizes vary with installed snaps and Ubuntu Server flavour, but the order-of-magnitude comparison is reasonable.
- Ubuntu Core 22's "managed" first-boot flow (where a system-user assertion or cloud-init file pre-seeds the device) is not covered. This is a more advanced workflow and outside the scope of a beginner tutorial.
