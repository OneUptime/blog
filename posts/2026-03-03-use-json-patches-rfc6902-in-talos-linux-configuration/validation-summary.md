# Validation Summary: How to Use JSON Patches (RFC6902) in Talos Linux Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux machine configuration
- talosctl configuration patching
- JSON Patch (RFC 6902)
- JSON Pointer (RFC 6901)
- YAML-formatted JSON Patch documents

## Sources Consulted
- Talos Linux configuration patching guide: https://www.talos.dev/latest/talos-guides/configuration/patching/
- Talos v1.13 talosctl CLI reference: https://docs.siderolabs.com/talos/v1.13/reference/cli
- Talos v1.13 MachineConfig reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/v1alpha1/config
- Talos v1.12 "What's New" network configuration deprecation notes: https://docs.siderolabs.com/talos/v1.12/getting-started/what%27s-new-in-talos
- Talos HostnameConfig documentation: https://docs.siderolabs.com/talos/v1.12/networking/configuration/hostname
- RFC 6902, JavaScript Object Notation (JSON) Patch: https://www.rfc-editor.org/rfc/rfc6902.html
- RFC 6901, JavaScript Object Notation (JSON) Pointer: https://www.rfc-editor.org/rfc/rfc6901.html

## Issues Found
- The post stated that strategic merge patches cannot express deletion. Talos strategic merge patches support `$patch: delete`, so the wording was changed to explain that JSON Patch is useful for exact path-based deletion.
- Several examples used `/machine/kubelet/nodeLabels/...`, but Talos node labels are configured at `/machine/nodeLabels/...`. These paths were corrected.
- Several examples used `/machine/network/...` fields. Talos v1.12+ deprecates most legacy `.machine.network` fields in favor of multi-document network configuration, and Talos JSON patches do not support multi-document machine configuration. The examples were changed to non-deprecated single-document fields where possible, and a note was added about multi-document configuration.
- The post described JSON Patch `add` as creating missing paths. RFC 6902 only allows the final object member to be new; the parent object or array must already exist. The explanation was corrected.
- The running-node command used `talosctl apply-config --patch`, but `apply-config` uses `--config-patch`; direct patching of current node machine configuration is done with `talosctl patch machineconfig --patch`. The affected examples were corrected.
- The combined patch example used `apply-config --patch`; it was corrected to use `--file` with `--config-patch`.
- The patch-format detection explanation only mentioned JSON arrays beginning with `[`, but Talos also accepts JSON Patch arrays written in YAML. The wording was corrected.
- Error-handling text said JSON patches fail atomically. RFC 6902 defines sequential evaluation until an error, and Talos rejects a failed patch. The text was adjusted to avoid overstating RFC-level atomicity.
- The extra manifest example used an append form that requires the array to already exist. It was changed to set the `extraManifests` field with an array.

## Review Notes
The guide is now accurate for current Talos configuration patching behavior at the main machine configuration level. For future updates, examples involving Talos network settings should use the newer multi-document network configuration model and strategic merge patches instead of JSON Patch.
