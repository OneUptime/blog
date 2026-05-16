# Validation Summary: How to Use Image Factory for Talos Linux Upgrades

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Talos Image Factory
- Talos system extensions
- talosctl
- Kubernetes node upgrades
- crane
- curl and jq

## Sources Consulted
- Talos Image Factory documentation: https://docs.siderolabs.com/talos/v1.9/learn-more/image-factory
- Talos Boot Assets documentation: https://docs.siderolabs.com/talos/v1.12/platform-specific-installations/boot-assets
- Talos talosctl CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Image Factory API documentation: https://github.com/siderolabs/image-factory/blob/main/docs/api.md
- Image Factory versions API: https://factory.talos.dev/versions
- Image Factory official extensions API for v1.7.0: https://factory.talos.dev/version/v1.7.0/extensions/official

## Issues Found
- The post used `factory.talos.dev/installer/<schematic-id>:<version>` for upgrade examples. Current Image Factory documentation labels that as the legacy installer image path and recommends platform-specific installer repositories such as `factory.talos.dev/metal-installer/<schematic-id>:<version>`. Updated the upgrade examples to use `metal-installer`.
- The post implied that installer images used by `talosctl upgrade` include kernel arguments. Official Image Factory documentation states that `installer` and `initramfs` images only support system extensions, while kernel arguments and META are ignored for those models. Updated the wording to clarify that kernel arguments apply to boot assets such as ISOs, disk images, and PXE boot scripts.
- The generated image examples labeled `aws-amd64.raw.xz` as an "AWS AMI". The Image Factory API documents this as a raw disk image that can be imported as an AMI. Updated the label to "AWS raw disk image for AMI import."

## Review Notes
- The schematic YAML structure, `POST /schematics` API usage, content-addressable schematic ID behavior, Talos v1.6.7 and v1.7.0 version examples, listed extension names, `talosctl upgrade --image`, `talosctl get extensions`, and HTTP image URL patterns were checked against official documentation or Image Factory API responses.
- The examples focus on the `metal-installer` path. For cloud or VM-specific upgrades, users should select the matching platform installer repository where applicable, such as `aws-installer`.
