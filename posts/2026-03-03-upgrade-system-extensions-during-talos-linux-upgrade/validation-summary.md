# Validation Summary: How to Upgrade System Extensions During Talos Linux Upgrade

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Talos Linux
- Talos system extensions
- Talos Image Factory
- talosctl
- OCI container images and registries
- crane
- jq

## Sources Consulted
- Talos Linux System Extensions documentation: https://docs.siderolabs.com/talos/v1.12/build-and-extend-talos/custom-images-and-development/system-extensions
- Talos Linux v1.7 Image Factory documentation: https://docs.siderolabs.com/talos/v1.7/learn-more/image-factory
- Talos Linux Boot Assets documentation: https://docs.siderolabs.com/talos/v1.12/platform-specific-installations/boot-assets
- Talos Linux v1.7 Boot Assets documentation: https://docs.siderolabs.com/talos/v1.7/platform-specific-installations/boot-assets
- Talos Image Factory API documentation: https://github.com/siderolabs/image-factory/blob/main/docs/api.md
- Talos system extensions repository README: https://github.com/siderolabs/extensions
- Talos v1.7 talosctl CLI reference: https://docs.siderolabs.com/talos/v1.7/reference/cli
- Image Factory official extensions API for Talos v1.7.0: https://factory.talos.dev/version/v1.7.0/extensions/official

## Issues Found
- The post said extension images are tagged with the Talos version they support. This is only true for some extension images. Official documentation describes a per-Talos-release extension catalog (`ghcr.io/siderolabs/extensions:<talos-version>`) that maps extension names to exact image refs and digests. I updated the explanation and examples to use the catalog and Image Factory API.
- The post used the generic `factory.talos.dev/installer/<schematic-id>:<talos-version>` image path throughout. Current Image Factory API documentation marks that as the legacy installer path and documents platform-specific paths such as `factory.talos.dev/metal-installer/...`. I updated the examples to use `metal-installer` and noted that users should select the installer matching their platform.
- The image verification example suggested using image config labels to verify included extensions. Official documentation exposes schematic retrieval and per-version extension listing APIs, which are more direct and reliable for this check. I replaced that example with schematic inspection, release extension lookup, and manifest resolution.

## Review Notes
- The Talos v1.7 examples are syntactically valid for the version discussed, and the referenced extensions (`siderolabs/intel-ucode`, `siderolabs/iscsi-tools`, `siderolabs/qemu-guest-agent`, and `siderolabs/zfs`) are present in the Image Factory official extension list for Talos v1.7.0.
- The `talosctl get extensions`, `talosctl upgrade --image`, `talosctl health --wait-timeout`, `talosctl read`, `talosctl dmesg`, `talosctl logs controller-runtime`, and `talosctl version --nodes` commands were checked against Talos CLI documentation and troubleshooting documentation.
