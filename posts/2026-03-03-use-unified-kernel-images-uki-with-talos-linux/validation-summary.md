# Validation Summary: How to Use Unified Kernel Images (UKI) with Talos Linux

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Talos Linux
- Unified Kernel Images (UKI)
- UEFI Secure Boot
- systemd-boot and systemd-stub
- Talos Image Factory and imager
- TPM measured boot and PCRs
- talosctl

## Sources Consulted
- Talos Boot Loader documentation: https://docs.siderolabs.com/talos/v1.11/platform-specific-installations/bare-metal-platforms/bootloader
- Talos Boot Assets documentation: https://docs.siderolabs.com/talos/v1.12/platform-specific-installations/boot-assets
- Talos SecureBoot documentation: https://docs.siderolabs.com/talos/v1.12/platform-specific-installations/bare-metal-platforms/secureboot
- Talos CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos Image Factory documentation: https://github.com/siderolabs/image-factory
- UAPI Unified Kernel Image specification: https://uapi-group.org/specifications/specs/unified_kernel_image/
- UAPI Linux TPM PCR Registry: https://uapi-group.org/specifications/specs/linux_tpm_pcr_registry/
- systemd-stub documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd-stub.html
- Local imager CLI help output from `ghcr.io/siderolabs/imager:v1.9.0` and `ghcr.io/siderolabs/imager:v1.11.0`

## Issues Found
- The post implied UKI was generally the Talos UEFI default without a version caveat. Updated the text to specify that new UEFI installations use `systemd-boot` with UKIs by default starting in Talos 1.10.
- The post used `talosctl ls`, but the documented command is `talosctl list`. Updated all directory listing examples.
- The measured boot PCR summary incorrectly implied embedded kernel command line and system extensions were direct UKI component measurements in PCR 12 and PCR 13. Updated the summary to distinguish PCR 11 UKI sections and Talos boot phases from PCR 12 overrides/configuration extensions and PCR 13 initrd system extensions.
- The imager examples used Talos 1.9 while claiming default UKI behavior for UEFI. Updated examples to Talos 1.11 and added the Talos 1.10+ caveat.
- The disk image imager examples omitted `/dev` and `--privileged`, which the official Talos docs require for disk image generation. Added the required Docker mount and flag.
- The Secure Boot default-key instructions referenced a non-documented release certificate download and manual enrollment flow. Replaced it with the documented Sidero Labs Secure Boot Image Factory flow.
- The custom signing example used unsupported `imager` flags (`--uki-signing-key-path` and `--uki-signing-cert-path`). Replaced it with the documented `talosctl gen secureboot ...` commands and `secureboot-metal` imager profile.

## Review Notes
The exact names and layout of Talos UKI files on the EFI System Partition are implementation details not fully enumerated in the public documentation. The post now aligns with the documented Talos 1.10+ bootloader behavior, Secure Boot flow, and CLI surfaces.
