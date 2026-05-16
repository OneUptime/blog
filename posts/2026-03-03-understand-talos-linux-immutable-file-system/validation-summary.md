# Validation Summary: How to Understand Talos Linux Immutable File System

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Talos Linux
- SquashFS
- Talos machine configuration
- Talos disk volumes and mounts
- Talos system extensions
- Talos Image Factory
- Secure Boot
- Kubernetes node operations

## Sources Consulted
- Talos Linux Architecture documentation: https://docs.siderolabs.com/talos/v1.6/learn-more/architecture
- Talos Linux Disk Layout documentation: https://docs.siderolabs.com/talos/v1.11/configure-your-talos-cluster/storage-and-disk-management/disk-management/layout
- Talos Linux Disk Management Resources documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/storage-and-disk-management/disk-management/resources
- Talos Linux Disk Encryption documentation: https://docs.siderolabs.com/talos/v1.13/configure-your-talos-cluster/storage-and-disk-management/disk-encryption
- Talos Linux Editing Machine Configuration documentation: https://docs.siderolabs.com/talos/v1.8/configure-your-talos-cluster/system-configuration/editing-machine-configuration
- Talos Linux Image Factory documentation: https://docs.siderolabs.com/talos/v1.11/learn-more/image-factory
- Talos Linux System Extensions documentation: https://docs.siderolabs.com/talos/v1.7/build-and-extend-talos/custom-images-and-development/system-extensions
- Talos Linux Kernel Module documentation: https://docs.siderolabs.com/talos/v1.11/build-and-extend-talos/custom-images-and-development/kernel-module
- Talos Linux SecureBoot documentation: https://docs.siderolabs.com/talos/v1.12/platform-specific-installations/bare-metal-platforms/secureboot
- Talos Linux CLI reference: https://docs.siderolabs.com/talos/latest/reference/cli

## Issues Found
- The post described `/var` as a partition. Updated it to say `/var` is backed by the `EPHEMERAL` volume, which matches current Talos disk management documentation.
- The post described `/system/state` as a partition that is encrypted. Updated it to describe `STATE` as the volume mounted at `/system/state`, and clarified that encryption depends on disk encryption configuration.
- The mount example listed `/var` and `/system/state` as `ext4`, and listed `/etc/cni` and `/etc/kubernetes` as `tmpfs`. Updated the example to use `xfs` for the Talos volumes and to describe the `/etc` paths as managed mounts.
- The post said Talos uses the SquashFS checksum for Secure Boot verification. Updated this to describe signed boot assets and UKI-based Secure Boot verification on supported platforms.
- The configuration section said Kubernetes component files are provided through `tmpfs` mounts. Updated it to describe managed mounts and generated runtime files instead of implying all such paths are tmpfs.
- The `talosctl get machineconfig` example omitted the output format needed to retrieve the full resource clearly. Updated it to `talosctl -n 10.0.0.11 get machineconfig -o yaml`.
- The Image Factory example pinned an old `v1.6.0` installer tag. Replaced it with `<talos-version>` so the example remains version-appropriate.
- The system extensions example used `.machine.install.extensions`, which is deprecated and has no effect starting with Talos 1.10. Replaced it with an Image Factory schematic using `customization.systemExtensions.officialExtensions`.

## Review Notes
The local environment did not have `talosctl` installed, so CLI validation was performed against the official Talos CLI reference and configuration documentation rather than local `--help` output.
