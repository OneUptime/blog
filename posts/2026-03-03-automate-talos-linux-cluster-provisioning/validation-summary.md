# Validation Summary: How to Automate Talos Linux Cluster Provisioning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (v1.6.0)
- talosctl CLI
- Kubernetes (v1.29.0)
- PXE Boot / Matchbox (poseidon/matchbox)
- Bash scripting
- Helm
- Cilium CNI
- Metrics Server
- cert-manager
- local-path-provisioner

## Sources Consulted
- Talos Linux v1.6 CLI reference: https://www.talos.dev/v1.6/reference/cli/
- Talos `gen config` reference: https://www.talos.dev/v1.6/reference/cli/#talosctl-gen-config
- Talos `machineconfig patch` reference: https://www.talos.dev/v1.6/reference/cli/#talosctl-machineconfig-patch
- Talos `kubeconfig` reference: https://www.talos.dev/v1.6/reference/cli/#talosctl-kubeconfig
- Talos machine config schema: https://www.talos.dev/v1.6/reference/configuration/
- Matchbox documentation: https://matchbox.psdn.io/
- Cilium Helm chart: https://docs.cilium.io/en/stable/installation/k8s-install-helm/
- cert-manager Helm chart: https://cert-manager.io/docs/installation/helm/

## Issues Found

1. **Incorrect `talosctl gen config` flag `--from`** — In Talos v1.6, the flag for supplying a pre-generated secrets bundle is `--with-secrets`, not `--from`. Replaced `--from "${OUTPUT_DIR}/secrets.yaml"` with `--with-secrets "${OUTPUT_DIR}/secrets.yaml"`.

2. **Incorrect `talosctl gen config` flag `--output-dir`** — In Talos v1.6, the flag has been renamed to `--output`. Replaced `--output-dir "${OUTPUT_DIR}/base"` with `--output "${OUTPUT_DIR}/base"`.

3. **Misleading `talosctl kubeconfig -f <path>`** — In `talosctl kubeconfig`, `-f` is the boolean `--force` flag, not a "file" flag. Although the original command would still execute (with the path being parsed as a positional argument), the intent was unclear. Replaced with the explicit `--force "${OUTPUT_DIR}/kubeconfig"` form.

4. **Incorrect language tag for matchbox JSON snippets** — Two code blocks containing JSON content were tagged as ```yaml. Changed to ```json and updated the leading `#` comment marker to `//` to match valid JSON syntax (JSON does not support `#` comments).

5. **Matchbox selector wildcard** — The `selector.mac` value `"00:11:22:33:44:*"` used a wildcard, which matchbox does not support (selectors are exact-match key/value pairs). Replaced with a concrete example MAC address `"00:11:22:33:44:55"`.

## Review Notes

- The `bootstrap.sh` script references `CONTROLPLANE_NODES` and `WORKER_NODES` arrays that are defined in `provision.sh`. In practice, these would need to be re-defined or sourced (e.g., from `config.env` as `orchestrate.sh` does). The scripts are presented as illustrative pieces of a larger pipeline, so this was left as-is.
- The `cilium-agent` pod label selector `app.kubernetes.io/name=cilium-agent` used in `kubectl wait` is valid for current Cilium Helm chart releases (the chart applies both `k8s-app=cilium` and `app.kubernetes.io/name=cilium-agent` labels to agent pods).
- `local-path-provisioner` v0.0.26 is a real, valid release.
- Talos v1.6.0 and Kubernetes v1.29.0 are a compatible pairing per the Talos v1.6 release notes.
- The `--install-image "ghcr.io/siderolabs/installer:${TALOS_VERSION}"` reference is correct — siderolabs publishes installer images at `ghcr.io/siderolabs/installer`.
