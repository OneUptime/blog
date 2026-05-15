# Validation Summary: How to Use Talos Image Factory for Custom Images

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Talos Image Factory
- Talos system extensions
- `talosctl`
- Kubernetes node installation and upgrades

## Sources Consulted
- Talos Image Factory documentation: https://docs.siderolabs.com/talos/v1.10/learn-more/image-factory
- Talos boot assets documentation: https://docs.siderolabs.com/talos/v1.12/platform-specific-installations/boot-assets
- Talos `talosctl` CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Image Factory API reference: https://github.com/siderolabs/image-factory/blob/main/docs/api.md
- Public Image Factory API endpoints: https://factory.talos.dev/versions and https://factory.talos.dev/version/v1.7.0/extensions/official

## Issues Found
- The example `POST /schematics` response used `376567988ad370138ad8b2698212367b8edcb69b5fd68c80be1f2ec7d603b4ba`, which is the well-known vanilla schematic ID, not the ID for the shown custom schematic. Updated it to the verified ID returned by Image Factory for the example schematic: `921c54c7a76452ab05e34ffcf36f1248145dd97c9d558b957ef57cc7b6becee1`.
- The installer image examples used the legacy `factory.talos.dev/installer/...` repository. Updated examples to the current platform-specific `factory.talos.dev/metal-installer/...` form documented by Image Factory.
- The post implied kernel arguments were included in installer images. Added a short clarification that installer images include system extensions, while kernel arguments apply to ISO, PXE, or disk-image boot assets.
- The platform requirements bullet referred to `cloud-init` providers. Talos uses platform metadata rather than cloud-init in the usual Linux distribution sense, so this was corrected to `platform metadata`.

## Review Notes
The listed v1.7.0 extensions are available from the official Image Factory extension API. The specific Talos versions used in examples are older, but the examples remain valid because Image Factory still serves those versions.
