# Validation Summary: How to Configure Talos Linux for ARM64 Devices

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Talos Linux (v1.7+, current stable v1.12+)
- ARM64 / AArch64 architecture
- Kubernetes
- Talos Image Factory
- talosctl CLI
- JSON Patch (RFC 6902) for machine config patches
- Linux kernel parameters and sysctls
- CPU frequency governors / cpufreq
- Device tree overlays for SBCs (Raspberry Pi, Jetson, Rock, Pine64)
- crane (container registry CLI)

## Sources Consulted
- Talos Linux docs (v1.12): https://docs.siderolabs.com/talos/v1.12/
- Talos SBC installation guide: https://docs.siderolabs.com/talos/v1.12/platform-specific-installations/single-board-computers/
- Talos boot assets / Image Factory guide: https://docs.siderolabs.com/talos/v1.12/platform-specific-installations/boot-assets
- Talos Image Factory: https://factory.talos.dev
- Image Factory API reference: https://github.com/siderolabs/image-factory/blob/main/docs/api.md
- sbc-raspberrypi overlay repo: https://github.com/siderolabs/sbc-raspberrypi
- Talos v1.12 latest GitHub release assets (verified via `gh release view`)
- Talos config patching docs: https://www.talos.dev/v1.6/talos-guides/configuration/patching/
- Talos machine config reference for `machine.kernel.modules`

## Issues Found

1. **Deprecated SBC image variant** — The post referenced `metal-rpi_generic-arm64.raw.xz` as a downloadable release asset. Starting with Talos v1.7, board-specific image variants were deprecated; SBC images are now produced exclusively through the Talos Image Factory by combining the generic `metal-arm64` image with a board-specific overlay. The latest Talos release no longer ships an `metal-rpi_generic-arm64.raw.xz` asset.
   - **Fix**: Removed the stale `curl` command and the `metal-rpi_generic-arm64` bullet, added a sentence explaining the v1.7 deprecation, and corrected the secondary download to `metal-arm64.raw.zst` (the current raw image format; the project switched from xz to zstd compression). Updated the device/image table to point Pi/Jetson/Pine64 rows at the Image Factory + overlay approach.

2. **Incorrect overlay image reference** — The Image Factory POST example listed `siderolabs/sbc-rpi`, which is not a valid overlay image. The actual repository and overlay image is `siderolabs/sbc-raspberrypi` (confirmed against the siderolabs org repo listing and the Image Factory documentation).
   - **Fix**: Changed `siderolabs/sbc-rpi` to `siderolabs/sbc-raspberrypi` in the `curl -X POST .../schematics` example.

3. **Misleading CPU governor claim** — The post claimed the sysctl `kernel.sched_energy_aware: "0"` would "Force performance governor". That sysctl controls the kernel's Energy-Aware Scheduler (EAS) and influences task placement on big.LITTLE systems; it does not change the cpufreq governor. The CPU frequency governor is set via the cpufreq sysfs interface (`/sys/devices/system/cpu/cpu*/cpufreq/scaling_governor`), not via sysctl, and Talos does not expose direct configuration for it in the machine config.
   - **Fix**: Rewrote the section to accurately describe that Talos does not expose direct cpufreq governor configuration, that the governor is controlled by the kernel cpufreq subsystem, and corrected the sysctl comment to describe what `sched_energy_aware` actually does (disabling energy-aware scheduling, which is a separate concern from governor selection).

## Review Notes
- The JSON Patch examples (`op: add`, `path: /machine/install/disk`) are syntactically valid and use the documented YAML form Talos accepts. Readers should be aware that `op: add` against a path whose parent does not yet exist in the generated config may fail in stricter JSON Patch implementations; in practice Talos's patching tolerates the common cases shown.
- The `talosctl` subcommands used in the post (`gen config`, `get links`, `get addresses`, `stats`, `memory`) were verified against the v1.12 CLI reference and are valid.
- The `machine.kernel.modules` structure with `name` (and optional `parameters`) is correct per the v1alpha1 config reference.
- The Image Factory `schematic` JSON structure (`customization.systemExtensions.officialExtensions` and top-level `overlay` with `name` / `image`) matches the documented API. Note the API also supports an `overlay.options` field (e.g., `configTxt`, `configTxtAppend` for Raspberry Pi) that the post does not cover — fine to omit for a general overview.
- The post mentions `cma=128M` and `transparent_hugepage=never` as kernel args — both are standard upstream Linux parameters and are accurate.
- The `earlycon=uart8250,mmio32,0xfe215040` example address is specific to the Raspberry Pi 4 BCM2711 UART. Readers should adjust for other boards; the post correctly frames these as examples.
- Container image registry references (`ghcr.io/siderolabs/iscsi-tools`, `tailscale`, `gvisor`, `usb-modem-drivers`) are real published Talos system extensions.
