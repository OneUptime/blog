# Validation Summary: How to Set Up Talos Linux on Old Desktop Hardware

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- Bare metal installation
- talosctl CLI
- Talos machine configuration
- etcd backups and maintenance

## Sources Consulted
- Talos Linux System Requirements: https://docs.siderolabs.com/talos/v1.13/getting-started/system-requirements
- Talos Linux Getting Started: https://docs.siderolabs.com/talos/v1.13/getting-started/getting-started
- Talos Linux ISO installation guide: https://docs.siderolabs.com/talos/v1.8/platform-specific-installations/bare-metal-platforms/iso
- Talos Linux v1.13 machine configuration reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/v1alpha1/config
- Talos Linux v1.13 network configuration documents: https://docs.siderolabs.com/talos/v1.13/reference/configuration/network/linkconfig
- Talos Linux v1.12 network configuration changes: https://docs.siderolabs.com/talos/v1.12/getting-started/what%27s-new-in-talos
- Talos Linux talosctl CLI reference: https://docs.siderolabs.com/talos/v1.13/reference/cli
- Talos Linux boot loader documentation: https://docs.siderolabs.com/talos/v1.13/platform-specific-installations/bare-metal-platforms/
- Talos Linux etcd maintenance documentation: https://docs.siderolabs.com/talos/v1.10/build-and-extend-talos/cluster-operations-and-maintenance/etcd-maintenance
- SideroLabs Talos GitHub releases: https://github.com/siderolabs/talos/releases

## Issues Found
- The post called `v1.6.0` the latest Talos version. Updated the examples to `v1.13.2`, the latest stable GitHub release available during review on 2026-05-16, and updated the installer image to match.
- The hardware requirements overstated Talos official minimum RAM requirements and omitted the 100GB recommended disk size. Updated the RAM and storage bullets to match Sidero documentation while preserving practical lab guidance.
- The `talosctl gen config` command used `--output-dir`, but the current CLI reference documents `--output` / `-o`. Updated the command to `--output ./desktop-lab-config`.
- The machine configuration example used legacy `.machine.network` fields that Talos v1.12 marks as deprecated for hostname, interfaces, and nameservers. Replaced that part of the example with `HostnameConfig`, `LinkConfig`, and `ResolverConfig` documents.
- The power-management example used `machine.install.extraKernelArgs` without noting that it is ignored on UEFI/systemd-boot installs. Added a short caveat in the snippet comments.
- The etcd quota example said 4GB was down from an 8GB default. Talos documentation says the default quota is 2 GiB and 8 GiB is the recommended maximum. Updated the value and comment.
- The cron-based etcd snapshot command depended on an interactive `TALOSCONFIG` environment variable. Updated it to include `TALOSCONFIG=/path/to/desktop-lab-config/talosconfig` in the cron entry.

## Review Notes
The post is technically relevant and remains a useful Talos home lab guide. `talosctl` was not installed in the local environment, so command verification was performed against the official CLI reference and Sidero documentation rather than local `--help` output.
