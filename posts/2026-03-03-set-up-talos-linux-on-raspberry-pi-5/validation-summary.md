# Validation Summary: How to Set Up Talos Linux on Raspberry Pi 5

## Status
validated

## Post Type
Tutorial / setup guide

## Technologies Covered
- Talos Linux
- Raspberry Pi 5
- Raspberry Pi EEPROM bootloader
- Talos Image Factory
- Kubernetes
- ARM64 single-board computers
- NVMe and USB boot media

## Sources Consulted
- Sidero Labs Talos v1.13 Raspberry Pi Series documentation: https://docs.siderolabs.com/talos/v1.13/platform-specific-installations/single-board-computers/rpi_generic
- Sidero Labs Talos v1.13 CLI reference: https://docs.siderolabs.com/talos/v1.13/reference/cli
- Sidero Labs Talos v1.13 MachineConfig reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/v1alpha1/config
- Sidero Labs Talos v1.13 insecure mode documentation: https://docs.siderolabs.com/talos/v1.13/configure-your-talos-cluster/system-configuration/insecure
- Raspberry Pi hardware and bootloader documentation: https://www.raspberrypi.com/documentation/computers/raspberry-pi.html
- Raspberry Pi getting started and power supply documentation: https://www.raspberrypi.com/documentation/computers/getting-started.html
- Sidero Labs Talos GitHub releases API, latest release assets: https://api.github.com/repos/siderolabs/talos/releases/latest

## Issues Found
- The post claimed Talos Linux "runs well" on Raspberry Pi 5 as if it were an officially tested platform. Current Talos documentation states the generic Raspberry Pi image is officially tested on Raspberry Pi 4 and community-tested on one Compute Module 4 variant, so the wording was changed to describe Raspberry Pi 5 support as community-tested rather than officially tested.
- The download URL `https://github.com/siderolabs/talos/releases/latest/download/metal-rpi_generic-arm64.raw.xz` no longer exists in current Talos releases. It was replaced with the Talos Image Factory URL for the vanilla `rpi_generic` schematic and `metal-arm64.raw.xz`, and the decompression and `dd` commands were updated to use `metal-arm64.raw`.
- The NVMe boot instructions omitted `PCIE_PROBE=1` for non-HAT+ PCIe adapters. A note was added because Raspberry Pi documentation requires this setting for non-HAT+ devices.
- The post implied the `machine.install.disk` patch controls installation after flashing the raw SBC image. Talos documentation says `machine.install` is ignored by pre-installed images, so a clarification was added.
- The apply-config section said the node would install Talos to the target disk. Since the raw SBC image is already written to the target disk, this was corrected to say the node writes the machine configuration and reboots into the configured role.
- The Raspberry Pi MAC prefix note was too absolute. It was softened to describe `D8:3A:DD` as an example Raspberry Pi prefix.
- The thermal section said Talos cannot control fans directly. Current Talos Raspberry Pi documentation describes GPIO/PWM fan control through overlays, so the text now distinguishes official active cooler firmware control from GPIO/PWM fan overlay configuration through Image Factory.

## Review Notes
- The `talosctl gen config`, `apply-config --insecure`, `bootstrap`, `health --wait-timeout`, `kubeconfig`, and `config endpoint/node/merge` examples match current Talos CLI documentation.
- The `machine.sysctls` YAML shape is valid according to the Talos MachineConfig reference.
- Performance numbers are presented as practical testing results, but no benchmark source is cited in the post; future revisions should either cite test conditions or make those numbers explicitly illustrative.
