# Validation Summary: How to Access Files on a Talos Linux Node (No SSH/Shell)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (immutable Kubernetes OS)
- talosctl CLI (read, list, copy, get subcommands)
- Kubernetes (kubectl debug node)
- YAML machine configuration
- ConfigMaps

## Sources Consulted
- [talosctl CLI reference (Sidero Labs docs)](https://docs.siderolabs.com/talos/v1.12/reference/cli)
- [talosctl v1.7 CLI reference](https://docs.siderolabs.com/talos/v1.7/reference/cli)
- [Talos v1.13 MachineConfig schema](https://docs.siderolabs.com/talos/v1.13/reference/configuration/v1alpha1/config)
- [Talos GitHub issue #8016 — Structured /var](https://github.com/siderolabs/talos/issues/8016)
- [Kubernetes kubectl debug docs](https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/)

## Issues Found

1. **Machine config example used a non-writable path.** The `machine.files` example specified `path: /etc/custom-file`. Talos's immutable filesystem only permits machine-config file writes to writable paths (notably under `/var/`, conventionally `/var/etc/`). Writing to a path directly under `/etc/` would be rejected by Talos's config validation. **Fix:** Changed `path: /etc/custom-file` to `path: /var/etc/custom-file`.

2. **Permissions format aligned with official Talos docs.** The example used `permissions: 0644`, the YAML 1.1 octal form. Talos's official MachineConfig reference documents permissions using the Go-style octal literal `0o644`, which is unambiguous under YAML 1.2. **Fix:** Changed `permissions: 0644` to `permissions: 0o644`. (The `0644` form often still parses correctly in practice depending on the YAML library, but `0o644` is the canonical, version-safe format.)

## Review Notes

- All `talosctl` subcommands and flags shown in the post are verified accurate against the v1.7+ CLI reference: `talosctl read` (no special flags), `talosctl list` with `-l` (long), `-r` (recurse), and `talosctl copy <src-path> <local-path>` which streams a tar.gz of the source directory and extracts to the local path.
- The path `/system/state/config.yaml` for the applied machine configuration is correct.
- `talosctl get machineconfig --nodes <ip> -o yaml` is correct and is indeed the recommended way to view the effective configuration (it includes defaults/transformations the raw file does not).
- The `kubectl debug node/<name>` workflow and `/host` mount path inside the debug pod are correct for Kubernetes 1.18+.
- The `op` field on `machine.files` accepts `create`, `append`, or `overwrite` — the example's use of `create` is valid.
- Minor stylistic note (not changed): the post does not mention the `-H` (humanize) or `-d` (depth) flags on `talosctl list`, which are commonly useful. These are omissions, not errors.
