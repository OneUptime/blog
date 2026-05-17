# Validation Summary: How to Create Custom Talos Linux Boot Media

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Talos Linux (v1.9.x)
- Talos Image Factory (factory.talos.dev)
- Talos `imager` tool (`ghcr.io/siderolabs/imager`)
- `talosctl` CLI
- Docker (used to run the imager)
- System extensions (iscsi-tools, intel-ucode, nonfree-kmod-nvidia)
- SBC overlays (`sbc-raspberrypi`, `sbc-rockchip`)
- PXE / iPXE network boot
- `dd` and `xz` for writing USB media

## Sources Consulted
- Talos v1.9 "Boot Assets" guide — https://www.talos.dev/v1.9/talos-guides/install/boot-assets/ (redirects to https://docs.siderolabs.com/talos/v1.9/platform-specific-installations/boot-assets/)
- Talos v1.9 "Kernel parameters" reference — https://docs.siderolabs.com/talos/v1.9/reference/kernel/
- Image Factory API reference — https://github.com/siderolabs/image-factory/blob/main/docs/api.md
- Image Factory homepage — https://factory.talos.dev/
- Sidero Labs `siderolabs/extensions` and `siderolabs/sbc-*` repositories

## Issues Found

1. **Invalid `--board-overlay` flag (ARM64 / Raspberry Pi example).** The imager has no `--board-overlay` flag. The supported flags are `--overlay-image` (the container image) and `--overlay-name` (which overlay inside the image to use). Additionally, when building for an SBC the first positional argument is the platform/profile name (e.g. `rpi_generic`), not `metal`. Fixed the example to use `rpi_generic` with `--overlay-image` + `--overlay-name`.

2. **Incorrect `talos.config=/local/path` usage (Embedding Machine Configuration section).** The `talos.config` kernel argument only accepts a URL or one of the special values (`metal-iso`, etc.) — it cannot point at a path inside the running image. Mounting `controlplane.yaml` into the imager container with `-v` does not embed it into the produced ISO either. Rewrote the section to (a) bake a URL into the kernel command line (with the supported `${uuid}` / `${serial}` / `${mac}` / `${hostname}` placeholders), and (b) describe `talos.config=metal-iso` plus a separately-labeled config ISO for air-gapped use. Also retitled "Embedding Machine Configuration" → "Pointing Boot Media at a Machine Configuration" to match what the kernel argument actually does.

3. **Wrong profile for PXE assets.** The PXE example invoked `imager:v1.9.0 metal --output-kind kernel|initramfs`. The documented profile for producing PXE kernel / initramfs is `iso` (the official Sidero Labs example uses `iso --output-kind kernel` and `iso --output-kind initramfs`). Fixed both invocations to use `iso`.

4. **Non-existent generic `--overlay` flag (Building Images with Custom Overlays section).** The imager has no generic `--overlay /path` flag for bind-mounting arbitrary firmware/DTB trees into an image. Overlays in Talos are specifically the SBC bootloader/U-Boot/DTB bundles, distributed as container images and consumed via `--overlay-image` + `--overlay-name`. Custom x86 firmware (microcode, NIC firmware) is delivered through system extensions, not overlays. Rewrote the section to describe what overlays actually are (using a Rockchip Rock 4 example) and to point firmware users at system extensions like `intel-ucode`, `amd-ucode`, and the `nonfree-kmod-*` family.

## Review Notes

- The post pins the imager to `v1.9.0` throughout. v1.9.x is fine for the syntax shown, but readers on newer minor releases (Talos v1.10+) should consult the corresponding docs — overlay image digests in particular are routinely updated and the official examples now pin overlays/extensions by `@sha256:...` digest for reproducibility. Adding digests here would be a future improvement but is not strictly required.
- The `--system-extension-image` versions used as examples (`iscsi-tools:v0.1.4`, `intel-ucode:20231114`, `nonfree-kmod-nvidia:535.129.03-v1.9.0`) are plausible tags from `siderolabs/extensions` for the v1.9 line; readers should still pick the tag matching the exact Talos version they are building.
- The Image Factory download URL pattern shown (`https://factory.talos.dev/image/<schematic>/<version>/<asset>`) matches the official API reference.
- The `xz -d` + `dd` workflow for writing raw images is correct, though `dd if=<image.raw.xz>` piped through `xz -dc` would avoid leaving a decompressed file on disk; not changed because the post's two-step form is also correct.
- The "Verifying Custom Images" section's `mount -o loop` works for hybrid ISOs but extracting the initramfs (a zstd-compressed cpio) is non-trivial; the post acknowledges this with a parenthetical comment, which is fair.
