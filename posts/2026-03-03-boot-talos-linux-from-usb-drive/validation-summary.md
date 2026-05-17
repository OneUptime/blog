# Validation Summary: How to Boot Talos Linux from USB Drive

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (v1.9.0)
- talosctl CLI
- Kubernetes (bare metal)
- Linux `dd`, `lsblk`, `sync` utilities
- macOS `diskutil`
- Rufus / balenaEtcher (Windows)
- Talos Imager (`ghcr.io/siderolabs/imager`)
- Talos system extensions (e.g., `iscsi-tools`)
- UEFI / Secure Boot

## Sources Consulted
- Talos v1.9.0 GitHub release assets (verified via `gh release view v1.9.0 --repo siderolabs/talos`): https://github.com/siderolabs/talos/releases/tag/v1.9.0
- Talos talosctl installation docs: https://docs.siderolabs.com/talos/v1.9/getting-started/talosctl
- Talos boot assets / imager docs: https://docs.siderolabs.com/talos/v1.9/platform-specific-installations/boot-assets/
- Sidero Labs extensions registry (`ghcr.io/siderolabs/iscsi-tools`)

## Issues Found
1. **Incorrect raw image extension for ARM64 download.** The post used `metal-arm64.raw.xz`, but Talos v1.9.0 release assets do not include `.raw.xz` files — the raw images are now compressed with zstd (`metal-arm64.raw.zst`). Since this section is about USB booting and ARM64 ISOs are also available in v1.9.0, I changed the URL to `metal-arm64.iso` for consistency with the x86_64 example and removed the ambiguous Raspberry Pi reference (RPi requires board-specific images, not the generic metal one).
2. **Incorrect raw image extension and decompression command for x86_64.** The post referenced `metal-amd64.raw.xz` with `xz -d` decompression. The actual asset is `metal-amd64.raw.zst`, which must be decompressed with `zstd -d`. Updated both the URL and the decompression command.
3. **Imager command produced wrong file type for the subsequent `dd`.** The custom-image example invoked the imager with the `metal` profile, which produces `metal-amd64.raw.zst` (a disk image), not an ISO. The next step then attempted to flash `_out/metal-amd64.iso`, which would not exist. Changed the profile to `iso` (which does produce `metal-amd64.iso`) to match the author's intent of flashing a custom ISO. Also added the `-t` flag to the `docker run` command to match the documented invocation pattern.

## Review Notes
- The `https://talos.dev/install` URL used for installing `talosctl` is officially documented and valid (it does not auto-update, but works as a one-shot installer).
- The `iscsi-tools:v0.1.4` extension tag is illustrative; current releases have moved to `v0.2.0`. Left as-is since it does not affect technical correctness of the example syntax — readers should pick an extension version compatible with the Talos version they are running.
- `sudo cmp metal-amd64.iso /dev/sdX` will compare and likely report "EOF on metal-amd64.iso" at the end because the device is larger than the ISO — this is expected and not an error, but readers may find it surprising.
- For raw disk image generation via the imager, Sidero docs recommend additionally passing `--privileged` and `-v /dev:/dev`. The ISO profile does not strictly require these, so the simplified command in the post is acceptable.
- Talos v1.9.0 is a real, released version (released late 2024). The version-pinned references are accurate at the time of review.
