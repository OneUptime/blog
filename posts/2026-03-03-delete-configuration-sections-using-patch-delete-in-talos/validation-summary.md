# Validation Summary: How to Delete Configuration Sections Using patch delete in Talos

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Talos Linux (machine configuration)
- talosctl CLI (apply-config, get machineconfig, machineconfig patch, gen config, validate)
- JSON Patch (RFC 6902): remove, test, replace operations
- JSON Pointer (RFC 6901): path syntax with `~1` / `~0` escaping
- YAML / JSON patch document formats
- yq (YAML query tool used in examples)
- Bash scripting for cluster-wide operations

## Sources Consulted
- Talos Linux v1.10 v1alpha1 configuration reference: https://docs.siderolabs.com/talos/v1.10/reference/configuration/v1alpha1/config/
- Talos Linux patching docs: https://docs.siderolabs.com/talos/v1.8/configure-your-talos-cluster/system-configuration/patching
- Talos Linux editing machine configuration: https://docs.siderolabs.com/talos/v1.8/configure-your-talos-cluster/system-configuration/editing-machine-configuration
- RFC 6902 (JSON Patch): https://datatracker.ietf.org/doc/html/rfc6902
- RFC 6901 (JSON Pointer): https://datatracker.ietf.org/doc/html/rfc6901

## Issues Found

1. **Incorrect path for node labels (multiple occurrences).** The post used `/machine/kubelet/nodeLabels/<label>`, but per the Talos v1alpha1 config reference, `nodeLabels` is defined directly on `machine`, not under `machine.kubelet`. Fixed to `/machine/nodeLabels/<label>` in all examples: single-field removal, multi-field removal, safe-deletion pattern, the "path not found" error message, the bash safe-remove script, and the post-migration cleanup patch.

2. **Incorrect yq query against `talosctl get machineconfig -o yaml`.** The output of `talosctl get machineconfig -o yaml` is a COSI resource document with `metadata` and `spec`, where the actual machine config sits under `spec`. The query `.machine.network.interfaces[] | .interface` would return nothing. Fixed to `.spec.machine.network.interfaces[] | .interface`. Same fix applied to the `yq ".machine.kubelet.nodeLabels..."` check in the bash script (now `.spec.machine.nodeLabels...`).

3. **`talosctl machineconfig patch` fed a COSI resource instead of a raw config.** In the "Previewing Deletions" section, the post wrote `talosctl get machineconfig --nodes 10.0.1.10 -o yaml > before.yaml` and then piped that file to `talosctl machineconfig patch`. The offline patch command expects a raw machine config file, not a wrapped resource. Fixed by piping through `yq '.spec'` to extract the spec before saving to `before.yaml`.

## Review Notes

- **Reboot-mode caveat.** The post uses `--mode no-reboot` consistently. This is correct for fields on the kubelet/labels allow-list (e.g., `nodeLabels`), but several other examples in the post would actually require a reboot in practice:
  - `/machine/install/extraKernelArgs/*` — kernel args are processed at boot; removing one with `--mode no-reboot` will be rejected.
  - `/machine/network/interfaces/*` — interface removal generally requires a reboot.
  Readers should fall back to `--mode auto` or `--mode reboot` for these. Not changed in the post since the author may have intended these as illustrative patch shapes rather than fully runnable examples.
- **`talosctl apply-config --patch` accepts both inline JSON and `@file` references**, in either JSON or YAML format — the post's examples of both forms are correct.
- **JSON Pointer escaping** (`beta.kubernetes.io~1arch` for `beta.kubernetes.io/arch`) is correct per RFC 6901.
- **Atomicity claim** ("All operations in a JSON Patch are atomic...") is correct per RFC 6902 §5.
- All other config paths verified against the v1alpha1 reference: `/machine/sysctls/<name>`, `/machine/registries/mirrors/<registry>`, `/machine/certSANs/<i>`, `/cluster/extraManifests/<i>`, `/machine/network/interfaces/<i>/vlans/<j>/vlanId`, `/machine/network/nameservers`, `/machine/kubelet/extraArgs`.
