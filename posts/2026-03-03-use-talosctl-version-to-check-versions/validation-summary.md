# Validation Summary: How to Use talosctl version to Check Versions

## Status
validated

## Post Type
Tutorial / CLI guide

## Technologies Covered
- Talos Linux
- talosctl
- Kubernetes
- kubectl
- jq
- Bash scripting

## Sources Consulted
- Sidero Labs Talos v1.7 CLI reference: https://docs.siderolabs.com/talos/v1.7/reference/cli
- Sidero Labs Talos latest CLI reference: https://docs.siderolabs.com/talos/latest/reference/cli
- Sidero Labs talosctl installation/version matching guidance: https://docs.siderolabs.com/talos/latest/talos-guides/install/talosctl
- Sidero Labs Talos support matrix: https://docs.siderolabs.com/talos/latest/introduction/support-matrix
- Sidero Labs Talos v1.7.0 `version` command source: https://github.com/siderolabs/talos/blob/v1.7.0/cmd/talosctl/cmd/talos/version.go
- Sidero Labs Talos v1.13.0 `version` command source: https://github.com/siderolabs/talos/blob/v1.13.0/cmd/talosctl/cmd/talos/version.go
- Local verification with official `talosctl` v1.7.0 and v1.13.0 release binaries from https://github.com/siderolabs/talos/releases
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- `talosctl version -o json` was incorrect. Official `talosctl` v1.7.0 and v1.13.0 binaries reject `-o json` for the `version` command. Updated examples to use the command's hidden `--json` flag for server version output.
- JSON parsing paths were incorrect. The hidden `--json` output emits version response objects with the tag at `.version.tag`, not `.server[0].version.tag` or `.server[].version.tag`. Updated all `jq` examples accordingly.
- The client-version JSON example was incorrect. `talosctl version --client --json` does not print client JSON and still attempts to construct a node client. Updated the mismatch script to parse `talosctl version --client --short` instead.
- The Kubernetes-version section said each Talos Linux release ships with a specific Kubernetes version. Talos documentation publishes supported Kubernetes version ranges per Talos release. Updated the wording to say each release supports a specific set of Kubernetes versions.
- The kubelet-version example used `talosctl services --nodes ... | grep kubelet`, which reports service state rather than Kubernetes node/kubelet version. Updated the example to `kubectl get nodes -o wide`.

## Review Notes
The post now uses `--json` because the Talos source exposes it for `talosctl version` server responses, but the flag is hidden and not shown in the public CLI reference. Future revisions should prefer a documented output mode if Sidero Labs adds one for this command.
