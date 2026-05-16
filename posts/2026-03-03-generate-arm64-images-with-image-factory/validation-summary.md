# Validation Summary: How to Generate ARM64 Images with Image Factory

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (v1.7.0 used as example)
- Sidero Labs Image Factory (factory.talos.dev)
- Talos schematic format (`customization.systemExtensions`, `overlay`)
- Raspberry Pi (sbc-raspberrypi / rpi_generic overlay, U-Boot)
- AWS Graviton (t4g, m6g, c6g, r6g instance families; EC2 import-image / run-instances)
- Oracle Cloud Ampere A1 (ARM64)
- Kubernetes (`nodeSelector`, `kubernetes.io/arch` label, multi-arch deployments)
- talosctl (`apply-config`, `gen config`)
- QEMU (`qemu-system-aarch64`, cortex-a72)
- xz / dd for image flashing

## Sources Consulted
- Image Factory landing page — https://factory.talos.dev
- Image Factory API reference — https://github.com/siderolabs/image-factory/blob/main/docs/api.md
- Talos single-board computer / rpi_generic docs — https://docs.siderolabs.com/talos/v1.11/platform-specific-installations/single-board-computers/rpi_generic
- siderolabs/sbc-raspberrypi overlay repo — https://github.com/siderolabs/sbc-raspberrypi
- Live extensions endpoint for v1.7.0 — https://factory.talos.dev/version/v1.7.0/extensions/official
- Talos Oracle Cloud install docs — https://www.talos.dev/v1.10/talos-guides/install/cloud-platforms/oracle/

## Issues Found

1. **Raspberry Pi schematic was missing the required `overlay` section.** The post's original `rpi-schematic.yaml` only defined `customization.systemExtensions`, which would produce a generic ARM64 metal image lacking the Pi's U-Boot bootloader, device tree, and firmware — that image will not boot on a Raspberry Pi. Fixed by adding the canonical overlay block:
   ```yaml
   overlay:
     name: rpi_generic
     image: siderolabs/sbc-raspberrypi
   ```
   and updating the surrounding prose to explain why the overlay is required. Verified against the official Talos `rpi_generic` install guide and the `siderolabs/sbc-raspberrypi` repo.

2. **The "Pi 4 supports UEFI through the EEPROM firmware" bullet was inaccurate.** The Pi 4's EEPROM holds the boot/firmware loader, not a UEFI implementation; UEFI on a Pi requires installing third-party TianoCore/EDK2 firmware and is not the path the Talos `rpi_generic` overlay uses (which sets up U-Boot). Rewrote the bullet to describe the actual U-Boot setup and recommend `rpi-eeprom-update` to keep the bootloader EEPROM current.

3. **The `jq` extension-availability check used a non-existent `targets` field.** I queried `https://factory.talos.dev/version/v1.7.0/extensions/official` directly: each entry only has `name`, `ref`, `digest`, `author`, and `description` — there is no `targets` array, so `select(.targets | contains(["arm64"]))` always returns empty. Replaced with a correct `jq` projection that lists the actual fields, and rewrote the explanation: official extensions are multi-arch images, so Image Factory picks the right architecture automatically; only inherently x86-only extensions (e.g. `intel-ucode`, `amd-ucode`, x86-specific firmware) will fail to build an ARM64 image.

## Review Notes
- The post pins `TALOS_VERSION="v1.7.0"` as an example. v1.7.0 was released April 2024 and is well behind current stable (Talos v1.11+ at time of review). The Image Factory URL patterns, schematic format, and overlay structure used in the post still work on current versions, but a reader pulling 1.7.0 today will be running an old release; this is acceptable as illustrative version pinning.
- Starting around Talos v1.10, the Image Factory also exposes platform-specific installer images (e.g. `factory.talos.dev/metal-installer/<id>:<ver>`) alongside the generic `installer/` path used in the post. The generic `installer/<id>:<ver>` reference shown here is still valid for v1.7.0 and remains supported on current versions for backward compatibility.
- The QEMU example uses `cortex-a72`, which matches the Pi 4 CPU. For testing images intended for Pi 5 hardware, `cortex-a76` would be a closer match — not wrong, just worth noting.
- The `aws ec2 import-image` flow shown is correct; readers should remember the EC2 VM Import/Export service requires the `vmimport` IAM role to be set up in the account before the first import.
