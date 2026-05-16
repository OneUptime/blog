# Validation Summary: How to Set Machine Install Disk in Talos Linux Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (v1.6)
- talosctl CLI
- Kubernetes (target platform for Talos)
- YAML machine configuration
- JSON Patch (RFC 6902) for live config patching
- Linux device naming (SCSI, SATA, NVMe, VirtIO, Xen, eMMC)

## Sources Consulted
- Talos v1.6 machine configuration reference: https://www.talos.dev/v1.6/reference/configuration/v1alpha1/config/
- Talos v1.6 talosctl CLI reference: https://www.talos.dev/v1.6/reference/cli/
- siderolabs/talos GitHub repo (release notes for v1.6.0 and deprecation notes for `talosctl disks`)
- Talos installer image registry: ghcr.io/siderolabs/installer

## Issues Found
Two minor inaccuracies in the `diskSelector` reference block were corrected:

1. **`type` field valid values** — The post listed only "hdd or ssd". Per the Talos v1.6 schema, valid values are `ssd`, `hdd`, `nvme`, and `sd`. Updated the comment to list all four.

2. **`model` field match semantics** — The post described `model` matching as "(substring match)". The Talos disk matcher actually evaluates `model` (and `busPath`) as a glob/wildcard pattern, not a substring. Updated the comment to "(glob/wildcard match)" and added a `*` to the example value so the example is consistent with glob semantics.

No other technical inaccuracies were found. All other YAML field names, talosctl commands, flags (`--install-disk`, `--config-patch`, `--patch`, `--image`, `--nodes`), the installer image path, and the JSON Patch payload structure verify against the official v1.6 documentation.

## Review Notes
- The post is written for Talos v1.6.0 and the commands/fields are valid for that version. Future readers on Talos v1.9+ should be aware that `talosctl disks` was deprecated in favor of `talosctl get disks` / `talosctl get blockdevices` / `talosctl get systemdisk`. This was not corrected because the post explicitly targets v1.6.0 where `talosctl disks` still works.
- The `diskSelector` block omits a few less-common sub-fields (`name`, `modalias`, `uuid`, `wwid`) that exist in the schema. The post does not claim to be exhaustive, so this is fine.
- The `wipe` behavior description (no effect on initial installs; only meaningful on reinstall/upgrade) is correct.
- The etcd quorum caveat for migrating a control-plane node's install disk is sound general advice.
