# Validation Summary: How to Configure SecureBoot with Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (v1.5+, v1.9 examples)
- UEFI SecureBoot (PK / KEK / db / dbx hierarchy)
- systemd-boot and Unified Kernel Image (UKI)
- Talos Image Factory (factory.talos.dev) and the `imager` container
- `talosctl` (gen secureboot, get securitystate, apply-config, upgrade, dmesg, read)
- TPM 2.0 measured boot with LUKS2 disk encryption

## Sources Consulted
- Talos SecureBoot guide: https://docs.siderolabs.com/talos/v1.9/platform-specific-installations/bare-metal-platforms/secureboot/
- Talos Boot Assets guide: https://docs.siderolabs.com/talos/v1.9/platform-specific-installations/boot-assets/
- Talos v1alpha1 config reference: https://docs.siderolabs.com/talos/v1.9/reference/configuration/v1alpha1/config/
- talosctl CLI reference (gen secureboot subcommands): https://docs.siderolabs.com/talos/v1.9/reference/cli/
- Image Factory API and schematic schema: https://github.com/siderolabs/image-factory/blob/main/docs/api.md and pkg/schematic/schematic.go

## Issues Found
1. **Wrong claim that Talos SecureBoot images use the Microsoft UEFI CA chain.** Image Factory builds are signed with a per-schematic Talos-generated key, not Microsoft's CA. Rewrote the Option 1 introduction to describe the real Image Factory key model and noted that `customization.secureboot.includeWellKnownCertificates: true` is the way to additionally trust the Microsoft UEFI CA.
2. **Non-existent `machine.secureboot.enrollKeys: true` field.** Talos's machine configuration has no `machine.secureboot` block. Removed it and replaced with a description of how `systemd-boot` auto-enrolls the bundled keys when the firmware is in Setup Mode.
3. **Non-existent `machine.features.secureboot: true` field.** Verified against the v1alpha1 reference — `machine.features` has no `secureboot` field. Removed it from both the "Configuring Talos for SecureBoot" section and the TPM 2.0 example, and added a note that SecureBoot is selected by the installer image alone.
4. **Non-existent `install.bootloader: true` field.** Not present in `machine.install`; removed.
5. **Fictional Image Factory schematic with custom PK/KEK/db keys.** The schematic schema only exposes `customization.secureboot.includeWellKnownCertificates`. Replaced the made-up YAML and rewrote Option 2 to use the actual custom-key workflow: `talosctl gen secureboot uki|pcr|database` plus the `imager` container to build signed assets locally (or via a self-hosted Image Factory).
6. **Incorrect "sign bootloader and kernel separately" workflow.** Talos packages kernel + initramfs + cmdline into a single UKI; both `systemd-boot` and the UKI are signed with the UKI signing certificate. Replaced the `openssl` / `sbsign` / `sbverify` / `cert-to-efi-sig-list` / `sign-efi-sig-list` instructions with the supported `talosctl gen secureboot` + `imager` flow.
7. **Glob in `talosctl read /sys/firmware/efi/efivars/SecureBoot-*`.** `talosctl read` does not expand shell globs. Replaced with `talosctl get securitystate`, which is the documented way to inspect SecureBoot status on Talos.

## Review Notes
- The Image Factory URL pattern (`/image/SCHEMATIC_ID/v1.9.0/metal-amd64-secureboot.iso`) and the installer image reference (`factory.talos.dev/installer-secureboot/SCHEMATIC_ID:v1.9.0`) match the documented API; left as-is.
- `talosctl read /sys/firmware/efi/fw_platform_size` and `talosctl dmesg` calls are valid and were left untouched.
- The post still references Talos v1.5 as the introduction of SecureBoot support, which is correct (SecureBoot/UKI support landed in the 1.5 release line); examples use v1.9.0/v1.9.1, which are still current at the time of review.
- The TPM 2.0 section's machine config snippet is now technically valid, but readers should be aware that TPM PCR sealing also requires the matching PCR signing key used when assets were built — worth expanding in a future revision.
- `talosctl gen secureboot uki` accepts `--common-name`; the rest of the defaults (output dir `_out`, key/cert filenames) are upstream defaults and may shift between minor releases.
