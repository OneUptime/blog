# Validation Summary: How to Create Custom Installer Images with Image Factory

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Talos Linux (v1.7.0 referenced)
- Sidero Image Factory (factory.talos.dev)
- talosctl CLI
- Talos system extensions (siderolabs/iscsi-tools, util-linux-tools, intel-ucode, i915)
- Container registries (ghcr.io, private mirroring)
- Kubernetes cluster provisioning (PXE, ISO boot workflows)
- Bash scripting (curl, jq, yq, docker)

## Sources Consulted
- Image Factory: https://factory.talos.dev/
- Sidero Labs extensions catalog: https://github.com/siderolabs/extensions
- Talos Linux v1.7 documentation: https://www.talos.dev/v1.7/
- Talos talosctl CLI reference (gen config, apply-config, upgrade, health, patch, get, read, version subcommands)
- Talos COSI resources: MachineStatus, ExtensionStatus
- Default installer image at ghcr.io/siderolabs/installer

## Issues Found
1. **Invalid extension name `siderolabs/i915-ucode`** in the schematic YAML example. There is no such extension in the siderolabs/extensions catalog. The correct name is `siderolabs/i915`, which is a single combined extension providing both Intel GPU microcode and i915 kernel modules (image: `ghcr.io/siderolabs/i915`, path: `drm/i915`). Fixed by replacing `siderolabs/i915-ucode` with `siderolabs/i915` in the `installer-schematic.yaml` example.

2. **Non-existent yq field path `.spec.status.installedVersion`** on the `machinestatus` resource. The MachineStatus spec exposes `stage` and `status` (with subfields like `ready`, `unmetConditions`) but does not contain an `installedVersion` field. The canonical way to retrieve the installed Talos version is via `talosctl version --nodes <ip>`. Fixed the "Verifying the Installed Extensions" section to use `talosctl version --nodes 10.0.0.50` instead.

## Review Notes
- The post pins all examples to Talos v1.7.0; current Talos releases are in the v1.9.x/v1.10.x range as of mid-2026. The general workflow and APIs in the post remain valid for newer versions, but readers using the latest Talos should substitute the appropriate version tag in image references.
- The Image Factory POST `/schematics` response actually returns both `id` and `schematic` fields; the post extracts only `.id`, which is the only field needed and is correct.
- `talosctl read /proc/modules` is syntactically valid, but whether the `iscsi_tcp` module appears in `/proc/modules` depends on whether iSCSI sessions have been initiated (modules may be loaded on-demand). The check is a reasonable smoke test but not a guarantee of extension functionality on its own.
- The `talosctl patch machineconfig --patch @file.yaml` pattern is valid — the `--patch` flag accepts a literal patch string or a file reference with `@` prefix.
- The default installer image `ghcr.io/siderolabs/installer:v1.7.0` is correctly identified.
