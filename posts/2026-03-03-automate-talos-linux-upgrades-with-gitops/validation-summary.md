# Validation Summary: How to Automate Talos Linux Upgrades with GitOps

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (v1.6.x)
- talosctl
- Kubernetes (v1.29.x)
- Kubernetes CronJob (batch/v1)
- Kubernetes RBAC (ClusterRole / ClusterRoleBinding)
- Flux CD (GitOps controller)
- Rancher system-upgrade-controller
- kubectl (drain/uncordon, label selectors, wait)
- jq (JSON processing in shell)

## Sources Consulted
- Talos Linux v1.6 upgrade docs: https://www.talos.dev/v1.6/talos-guides/upgrading-talos/
- Talos Linux v1.6 talosctl CLI reference: https://www.talos.dev/v1.6/reference/cli/
- Sidero Labs Talos Cloud Controller Manager repo: https://github.com/siderolabs/talos-cloud-controller-manager
- Rancher system-upgrade-controller repo: https://github.com/rancher/system-upgrade-controller
- talosctl `version` command source: https://github.com/siderolabs/talos/blob/v1.6.7/cmd/talosctl/cmd/talos/version.go
- Kubernetes docs on control-plane node label and `kubectl drain` (`--delete-emptydir-data`, `--ignore-daemonsets`)
- Kubernetes CronJob API (batch/v1, GA since 1.21)

## Issues Found

1. **Option 1 referenced the wrong image as a "system upgrade controller".** The post used `ghcr.io/siderolabs/talos-cloud-controller-manager:latest`, but that image is the Talos Cloud Controller Manager (handles node metadata, pod CIDR allocation, kubelet certificate approval) — not an upgrade controller. The Talos docs recommend Rancher's `system-upgrade-controller` for declarative upgrade orchestration. Replaced the image with `docker.io/rancher/system-upgrade-controller:v0.13.4` and renamed the Deployment/ServiceAccount/namespace to `system-upgrade-controller` / `system-upgrade` to match the upstream project's conventions. Updated the section heading and intro accordingly.

2. **`talosctl version` used the wrong JSON output flag.** The post used `-o json`, but `talosctl version` exposes JSON output via the `--json` boolean flag (per the talosctl source in v1.6). `-o` is a kubectl convention, not a talosctl one. Changed all three occurrences to `--json`. The downstream jq path `.messages[0].version.tag` matches the actual `VersionResponse` protobuf structure and was left unchanged.

## Review Notes

- `talosctl health --nodes ${node}` works (since `--nodes` is a global talosctl flag for choosing the API endpoint), but `talosctl health` reports overall cluster health rather than per-node health. If a future revision wants strict per-node validation, `kubectl wait --for=condition=Ready node/...` (already present) is a better check; or `talosctl service` and `talosctl get members` for node-local state. The current flow is functionally fine, just slightly broader than the surrounding comments suggest.
- `talosctl upgrade --timeout 10m` relies on the global `--timeout` flag, which defaults to 1m. Using it here is valid but easy to misread; an inline note in the future would help readers.
- The `ghcr.io/siderolabs/talosctl:v1.6.1` image is a real GHCR-published artifact, but readers picking up this guide should pin to a tag that actually matches their target Talos release rather than copying `v1.6.1` verbatim.
- The `kubectl get nodes -l node-role.kubernetes.io/control-plane=""` selector is correct for Kubernetes 1.24+ where the control-plane label is set with an empty value.
- The `kubectl drain` flags (`--ignore-daemonsets`, `--delete-emptydir-data`) are current — `--delete-local-data` was deprecated and removed in favor of `--delete-emptydir-data`.
- `apiVersion: batch/v1` for CronJob is correct (GA since Kubernetes 1.21); the older `batch/v1beta1` was removed in 1.25.
- The "Option 1" Deployment skeleton is intentionally minimal and is not a complete install of the system-upgrade-controller (no Plans CRD, no extra RBAC); this is acceptable for an illustrative comparison since the post immediately pivots to Option 2 as the recommended path.
