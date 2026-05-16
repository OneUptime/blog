# Validation Summary: How to Stage an Upgrade in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- talosctl
- Kubernetes node maintenance
- Kubernetes kubectl drain/uncordon
- etcd status checks

## Sources Consulted
- Talos Linux upgrade documentation: https://docs.siderolabs.com/talos/v1.13/configure-your-talos-cluster/lifecycle-management/upgrading-talos
- Talos CLI reference: https://docs.siderolabs.com/talos/v1.13/reference/cli
- Talos v1.7 CLI reference for historical `--stage` flag behavior: https://docs.siderolabs.com/talos/v1.7/reference/cli
- Talos hostname and nodename resource documentation: https://docs.siderolabs.com/talos/v1.12/networking/configuration/hostname
- Kubernetes `kubectl drain` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/

## Issues Found
- The post incorrectly described `talosctl upgrade --stage` as a way to preload an upgrade and wait for a later manual reboot. Talos documentation says `--stage` records upgrade artifacts/metadata, reboots the node, applies the upgrade early in boot, and reboots again into the upgraded version. I rewrote the explanation and examples to reflect the actual reboot-driven behavior.
- The examples claimed staged upgrades could be run during business hours with no workload disruption. Because the staged upgrade flow reboots the node, I changed the guidance to treat it as disruptive and run it during a controlled upgrade window.
- The post included a separate "apply staged upgrade" reboot workflow. Talos does not have a separate apply-later step for this staged upgrade behavior, so I replaced that section with a rolling upgrade script that runs `talosctl upgrade --stage` one node at a time.
- The post described canceling a staged upgrade by staging the current version again. That is not the documented workflow for the reboot-driven staged upgrade path. I replaced it with the documented `talosctl rollback` command for reverting a completed Talos OS upgrade.
- The post referenced `talosctl get machinestatus` as a way to verify a pending staged upgrade. I removed that verification path and used documented checks: `talosctl version`, `talosctl health`, and `talosctl etcd status`.
- The worker-node script used `talosctl get hostname` for the Kubernetes node name. Talos documents a distinct `nodename` resource for the Kubernetes node name, so I changed the script to use `talosctl get nodename`.
- The post omitted the current deprecation caveat. Talos v1.13 documentation marks legacy upgrade flags including `--stage` as deprecated and scheduled for removal in Talos v1.18, so I added that version-specific note.

## Review Notes
- The installer image examples still use `ghcr.io/siderolabs/installer:v1.7.0` as an illustrative version. Readers should use the installer image for their target Talos version and follow Talos' adjacent-minor upgrade path guidance.
- The current Talos upgrade flow can drain and uncordon nodes itself; the worker script keeps explicit `kubectl drain`/`uncordon` steps to match the original operational style, but operators should align this with their Talos version and local maintenance procedure.
