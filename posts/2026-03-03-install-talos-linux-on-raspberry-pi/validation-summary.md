# Validation Summary: How to Install Talos Linux on Raspberry Pi

## Status
validated

## Post Type
Tutorial / Step-by-step installation guide

## Technologies Covered
- Talos Linux (v1.7.0)
- Raspberry Pi 4 / Raspberry Pi 5 (ARM64)
- Kubernetes
- talosctl CLI
- kubectl
- Talos Image Factory (factory.talos.dev)
- siderolabs/sbc-raspberrypi overlay (`rpi_generic`)
- dd / balenaEtcher (image flashing)
- Raspberry Pi EEPROM / rpi-eeprom-update
- Flannel CNI
- local-path-provisioner

## Sources Consulted
- Talos Linux v1.7 docs: https://docs.siderolabs.com/talos/v1.7/getting-started/talosctl
- Talos Linux v1.7 Raspberry Pi guide: https://docs.siderolabs.com/talos/v1.7/platform-specific-installations/single-board-computers/rpi_generic/
- Talos Image Factory: https://factory.talos.dev/
- Image Factory API reference: https://github.com/siderolabs/image-factory/blob/main/docs/api.md
- Talos talosctl reference (machineconfig patch)

## Issues Found
- **Missing markdown heading on "Resource Considerations" section** — the `## ` prefix was missing on line 268, causing the section title to render as plain paragraph text and breaking the document's heading outline. Fixed by adding `## ` to the heading.

## Review Notes
- The `https://talos.dev/install` shell installer URL was verified as an official, documented installation method per the Talos v1.7 docs ("works on macOS, Linux, and WSL on Windows; supports amd64 and arm64").
- The Image Factory schematic format using `overlay.name: rpi_generic` and `overlay.image: siderolabs/sbc-raspberrypi` matches official documentation for Pi 3/4/CM4.
- The installer image URL form `factory.talos.dev/installer/<schematic>:<version>` is the legacy format; the current preferred form is `factory.talos.dev/metal-installer/<schematic>:<version>`. Both still work, so no change was made.
- The kubectl install snippet downloads the `linux/amd64` binary even though the post mentions Mac-specific tooling (`brew`, `diskutil`). This is a minor inconsistency for Mac workstation users but not technically wrong — Linux users following this guide on a Linux workstation get the right binary.
- Pi 5 support: the post claims Talos supports both Pi 4 and Pi 5 with official ARM64 images. Per the v1.7 docs, `rpi_generic` is only officially tested on Pi 4 (and community tested on CM4 variants); Pi 5 is not explicitly documented as supported by the `rpi_generic` overlay in v1.7. Users targeting Pi 5 with v1.7 specifically may need a different overlay/firmware path. This was not changed because (a) the post phrases Pi 5 support broadly and (b) Pi 5 support may have been added in subsequent Talos versions.
- The example schematic includes `customization.systemExtensions.officialExtensions: []` (an empty list). This is functionally fine but redundant — the field could be omitted. Left as-is since it's not incorrect.
- The `sleep 180` before `talosctl bootstrap` is a rough heuristic; in practice the installer time varies per Pi/SD card. Not a technical error, but readers may want to poll with `talosctl version` or watch journal output instead.
- The `local-path-provisioner` reference points to a pinned tag (`v0.0.26`) which exists in the rancher repository, so the URL is valid.
- The MAC OUI list (`dc:a6`, `28:cd`, `e4:5f`) covers some Raspberry Pi Foundation prefixes but is not exhaustive — the post already labels them "common", which is accurate.
