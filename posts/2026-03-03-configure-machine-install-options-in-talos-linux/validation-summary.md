# Validation Summary: How to Configure Machine Install Options in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux v1.6
- `talosctl` CLI (apply-config, upgrade, validate)
- Talos machine configuration (`machine.install` section, YAML)
- Talos Image Factory (custom installer images, system extensions)
- Linux block devices and `/dev/disk/by-id/` stable identifiers
- Bootloaders (GRUB, systemd-boot)
- Kubernetes (Talos as the underlying OS)

## Sources Consulted
- [Talos v1.6 v1alpha1 Configuration Reference](https://docs.siderolabs.com/talos/v1.6/reference/configuration/v1alpha1/config/) — authoritative `InstallConfig` field list
- [Talos v1.6 Bare-Metal Bootloader docs](https://docs.siderolabs.com/talos/v1.6/platform-specific-installations/bare-metal-platforms/bootloader)
- [Talos v1.6 Image Factory docs](https://docs.siderolabs.com/talos/v1.6/learn-more/image-factory)
- [Talos v1.6 `talosctl` CLI reference](https://docs.siderolabs.com/talos/v1.6/reference/cli/)
- [siderolabs/image-factory API docs](https://github.com/siderolabs/image-factory/blob/main/docs/api.md) — installer image URL format
- [siderolabs/talos issue #9224](https://github.com/siderolabs/talos/issues/9224) — deprecation context for `.machine.install.extensions`

## Issues Found
1. **Non-existent `bootloader` field.** The post claimed `machine.install` accepts a boolean `bootloader` field and dedicated a whole section ("Bootloader Configuration") to it. The v1alpha1 `InstallConfig` schema has no such field — Talos always installs a bootloader; there is no toggle. Fixed by:
   - Removing `bootloader: true` from the introductory basic-install YAML example and the corresponding field description.
   - Replacing the "Bootloader Configuration" section with a "Legacy BIOS Support" section that documents the real `legacyBIOSSupport` boolean field, with a corrected note that Talos v1.6 defaults to GRUB (systemd-boot is used for SecureBoot images, and only became the default on v1.10+).
2. **Wrong field name for kernel arguments.** The post used `kernelArgs:` under `machine.install`, but the actual schema field is `extraKernelArgs:`. A config using `kernelArgs` would fail validation. Renamed in both the YAML example and the surrounding prose.

## Review Notes
- `machine.install.extensions` is technically still accepted in v1.6 but is deprecated in favor of building extensions into a custom installer image via the Image Factory. The post already steers readers toward the Image Factory approach (mentioning schematics and custom images), so the `extensions:` example was left intact — it works on v1.6 and the post is clear about the modern alternative. A future revision could explicitly call out the deprecation warning.
- The Image Factory URL example uses the `factory.talos.dev/installer/<schematic>:<version>` form. That is correct for the v1.6 era; the platform-specific `metal-installer/` path became the documented convention later. No change needed for a v1.6-targeted post.
- The `talosctl validate --mode metal` command and the `--insecure` flag on initial `apply-config` were verified against the v1.6 CLI reference and are correct.
- The post does not mention `diskSelector`, which is a more robust alternative to hard-coding `/dev/...` paths. Out of scope for a correction-only review, but worth adding in a future revision.
