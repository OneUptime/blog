# Validation Summary: How to Set Up Talos Linux on Raspberry Pi 4

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Talos Linux
- Raspberry Pi 4
- Talos Image Factory
- Raspberry Pi EEPROM bootloader
- Kubernetes
- `talosctl`
- `kubectl`
- Linux/macOS disk flashing tools

## Sources Consulted
- Sidero Labs Talos Raspberry Pi Series documentation: https://docs.siderolabs.com/talos/v1.13/platform-specific-installations/single-board-computers/rpi_generic
- Sidero Labs Talos system requirements: https://docs.siderolabs.com/talos/v1.13/getting-started/system-requirements
- Sidero Labs Talos configuration patching documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/patching
- Sidero Labs Talos logging documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/logging-and-telemetry/logging
- Sidero Labs Talos CLI reference: https://docs.siderolabs.com/talos/v1.13/reference/cli
- Raspberry Pi boot EEPROM and BOOT_ORDER documentation: https://www.raspberrypi.com/documentation/computers/raspberry-pi.html
- Sidero Labs `sbc-raspberrypi` overlay repository: https://github.com/siderolabs/sbc-raspberrypi

## Issues Found
- The boot-order example claimed `BOOT_ORDER=0xf14` meant SD card first, then USB. Raspberry Pi documentation defines BOOT_ORDER values from right to left, so `0xf14` tries USB first and then SD. Changed the SD-first example to `BOOT_ORDER=0xf41`.
- The Talos image download URL referenced a GitHub release asset name that is no longer present in current releases. Updated the command to use the officially documented Talos Image Factory Raspberry Pi generic schematic and the verified current Talos version `v1.13.2`.
- The flash commands still referenced the old image filename. Updated them to use the decompressed `metal-arm64.raw` filename from the Image Factory download.
- The post stated that the default `rpi_generic` image includes support for the Broadcom WiFi/Bluetooth chip and VideoCore GPU. The current Raspberry Pi generic overlay disables WiFi and Bluetooth by default, and Sidero documents VideoCore acceleration as requiring a custom image with the `vc4` system extension. Updated the explanation accordingly.
- The SD-card wear section said the logging snippet reduced log verbosity. The Talos logging configuration shown sends service logs to a remote receiver; it does not reduce verbosity. Updated the wording to describe the behavior accurately.

## Review Notes
The core Talos workflow, including `talosctl gen config`, JSON config patching, first-time `apply-config --insecure`, `talosctl bootstrap`, `talosctl kubeconfig`, and worker-node application, matches current Talos documentation. The post now pins the image download to the current validated Talos release; future updates should refresh that version if a newer Talos release is desired.
