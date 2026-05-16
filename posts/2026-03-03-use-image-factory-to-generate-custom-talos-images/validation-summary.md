# Validation Summary: How to Use Image Factory to Generate Custom Talos Images

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Sidero Labs Image Factory
- Talos schematics
- Talos system extensions
- `talosctl`
- Docker / OCI installer images
- YAML configuration
- `curl`, `jq`, and `xz`

## Sources Consulted
- Sidero Labs Talos Image Factory documentation: https://docs.siderolabs.com/talos/v1.9/learn-more/image-factory
- Sidero Labs Talos Boot Assets documentation: https://docs.siderolabs.com/talos/v1.12/platform-specific-installations/boot-assets
- Sidero Labs Image Factory API documentation: https://github.com/siderolabs/image-factory/blob/main/docs/api.md
- Sidero Labs Image Factory configuration documentation: https://github.com/siderolabs/image-factory/blob/main/docs/configuration.md
- Sidero Labs Image Factory development documentation: https://github.com/siderolabs/image-factory/blob/main/docs/developing.md
- Sidero Labs on-prem Image Factory documentation: https://docs.siderolabs.com/omni/self-hosted/run-image-factory-on-prem
- Talos CLI reference for `talosctl upgrade`: https://www.talos.dev/latest/reference/cli/
- Live Image Factory API checks against `https://factory.talos.dev/schematics`, `https://factory.talos.dev/image/...`, and OCI manifest resolution for `factory.talos.dev/metal-installer/...`

## Issues Found
- The example response and later hard-coded schematic ID used `376567988ad370138ad8b2698212367b8edcb69b5fd68c80be1f2ec7d603b4ba`, which is the documented default schematic without customizations. Submitting the post's iSCSI plus QEMU guest agent schematic to Image Factory returned `dc7b152cb3ea99b821fcb7340ce7168313ce393d663740b791c36f6e95fc8586`, so the post was updated to use that ID.
- The installer examples used the legacy `factory.talos.dev/installer/<schematic>:<version>` repository. The current Image Factory API documents platform-specific installer repositories such as `factory.talos.dev/metal-installer/<schematic>:<version>`, so the post was updated to use `metal-installer` for the metal examples.
- The post implied kernel arguments are included in all generated assets, including installer images. Official Image Factory documentation states that installer images only support system extensions and ignore kernel arguments, so the wording was corrected to distinguish installer images from boot assets such as ISOs, disk images, and PXE assets.
- The self-hosted Image Factory example was too minimal to be correct: Image Factory requires configuration for schematic storage, cache storage, installer image storage, and a cache signing key. The example was replaced with a minimal connected-mode setup using a local registry, an ECDSA signing key, an `image-factory.yaml` config, and `--config /image-factory.yaml`.

## Review Notes
The post still uses Talos `v1.7.0` in examples. Those URLs and extensions were validated as available, but `v1.7.0` is an older release; future editorial updates could use a newer Talos version to better match current deployments.
