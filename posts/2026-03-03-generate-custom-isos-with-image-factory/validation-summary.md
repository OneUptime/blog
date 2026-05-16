# Validation Summary: How to Generate Custom ISOs with Image Factory

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (v1.7.0 / v1.8.0)
- Talos Image Factory (factory.talos.dev)
- Talos system extensions (siderolabs/extensions)
- talosctl CLI
- YAML schematic format
- curl + jq for Image Factory API automation
- dd (Linux/macOS) for writing ISO images to USB
- UEFI / BIOS / SecureBoot

## Sources Consulted
- Talos Image Factory documentation and API: https://factory.talos.dev
- Image Factory schematic upload endpoint: `POST https://factory.talos.dev/schematics`
- Image download URL pattern: `https://factory.talos.dev/image/{schematic-id}/{version}/{image-type}`
- siderolabs/extensions catalog: https://github.com/siderolabs/extensions
- Talos Linux documentation: https://www.talos.dev/v1.7/ (https://docs.siderolabs.com/talos/v1.7/)
- talosctl reference for `gen config`, `apply-config`, and `get extensions` (ExtensionStatus resource)
- Cross-referenced with the sibling validated post `2026-03-03-include-system-extensions-via-image-factory` which audited the same extension catalog and resource model

## Issues Found
1. **`talosctl get extensions` example output used the wrong column shape.** The example showed columns `NODE NAMESPACE TYPE ID VERSION` with `Extension` as the TYPE and the extension name (e.g. `intel-ucode`) placed in the ID column. The real `ExtensionStatus` resource is keyed by a numeric `ID` (0, 1, 2 ...), the TYPE is `ExtensionStatus`, and the extension's human name is in a separate `NAME` column with its own `VERSION`. Replaced the sample output with the correct seven-column layout and realistic extension versions.

## Review Notes
- All four official extensions referenced in the bare-metal schematic — `siderolabs/intel-ucode`, `siderolabs/i915-ucode`, `siderolabs/iscsi-tools`, `siderolabs/nut-client` — exist in the official Image Factory catalog.
- The schematic structure (`customization.systemExtensions.officialExtensions`, `customization.extraKernelArgs`) is correct for Image Factory.
- The image download URL pattern, including `metal-amd64.iso`, `metal-arm64.iso`, and `metal-amd64-secureboot.iso`, is accurate.
- The installer image reference `factory.talos.dev/installer/<schematic-id>:<talos-version>` paired with `talosctl gen config --install-image` is correct for the Talos versions cited (v1.7.0 / v1.8.0). Note: newer Talos releases (1.10+) introduced an alternative `factory.talos.dev/metal-installer/...` path, so readers on much newer versions should consult the Image Factory homepage for the current installer image name for their release.
- The macOS `dd ... bs=4m` example correctly uses BSD `dd`'s lowercase suffix.
- Kernel arg examples (`console=ttyS0,115200n8`, `net.ifnames=0`) are valid Linux boot parameters.
- Version-specific caveat: the post pins Talos v1.7.0 and v1.8.0 throughout. Readers using newer Talos releases should substitute the appropriate version in both the download URLs and the installer image tag.
