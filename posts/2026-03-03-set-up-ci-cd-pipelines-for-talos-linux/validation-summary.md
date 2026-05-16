# Validation Summary: How to Set Up CI/CD Pipelines for Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (`talosctl`)
- GitHub Actions (workflow YAML, triggers, environments, concurrency, OIDC)
- Kubernetes (`kubectl`, drain/uncordon, deployments, rollouts)
- Docker (`docker/build-push-action`, `docker/setup-buildx-action`, `docker/login-action`, `docker/metadata-action`)
- GitHub Container Registry (`ghcr.io`)
- `jq` for JSON parsing
- `yq` for YAML parsing
- `yamllint`
- AWS IAM (OIDC role assumption via `aws-actions/configure-aws-credentials`)

## Sources Consulted
- Talos Linux `talosctl` reference: https://www.talos.dev/latest/reference/cli/
- `talosctl validate` (modes: metal, cloud, container): https://www.talos.dev/latest/reference/cli/#talosctl-validate
- `talosctl apply-config` (`--dry-run`, `--nodes`, `--file`): https://www.talos.dev/latest/reference/cli/#talosctl-apply-config
- `talosctl health` (`--wait-timeout`, `--nodes`): https://www.talos.dev/latest/reference/cli/#talosctl-health
- `talosctl upgrade` (`--image`, `--wait`): https://www.talos.dev/latest/reference/cli/#talosctl-upgrade
- `talosctl get members` resource (spec fields: `hostname`, `addresses`, `machineType`): https://www.talos.dev/latest/talos-guides/discovery/
- `siderolabs/installer` container image: https://github.com/siderolabs/talos/pkgs/container/installer
- jq manual (`select`, pipelines): https://jqlang.github.io/jq/manual/
- GitHub Actions documentation (workflow syntax, `workflow_dispatch` inputs, environments, concurrency, OIDC): https://docs.github.com/en/actions
- `actions/checkout@v4`, `docker/setup-buildx-action@v3`, `docker/login-action@v3`, `docker/metadata-action@v5`, `docker/build-push-action@v5`, `aws-actions/configure-aws-credentials@v4` — all current major versions on GitHub Marketplace
- `kubectl drain` flags (`--delete-emptydir-data`, `--ignore-daemonsets`): https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/

## Issues Found
1. **Broken `jq` filters in the upgrade workflow (two occurrences).** The original filter was:
   ```
   jq -r '.spec.machineType == "controlplane" | select(.) | .spec.addresses[0]'
   ```
   This evaluates `.spec.machineType == "controlplane"` first (producing a boolean), then pipes the boolean into `select(.)`, then tries to index `.spec.addresses[0]` on the boolean, which fails with `Cannot index boolean with string "spec"`. The correct pattern wraps the comparison inside `select(...)` so the original object continues down the pipeline:
   ```
   jq -r 'select(.spec.machineType == "controlplane") | .spec.addresses[0]'
   ```
   The same issue and fix applies to the worker-node filter. Both were corrected in the README.

## Review Notes
- `kubectl drain "${node}"` in the worker-upgrade step passes a node IP, but `kubectl drain` expects a Kubernetes node name. In many Talos setups the Kubernetes node name is the hostname, not the IP. Users with hostname-based node names will need to map the IP from `talosctl get members` to the corresponding Kubernetes node name (e.g. via `.spec.hostname` from the same resource). Not changed because the assumption depends on the user's kubelet configuration, and altering it would change the structure of the example.
- `image-tag: ${{ steps.meta.outputs.tags }}` from `docker/metadata-action@v5` is a newline-separated string when multiple tags are produced. With the two `type=sha,prefix=` and `type=ref,event=branch` entries shown here, `kubectl set image deployment/my-app my-app=${IMAGE_TAG}` would receive both tags concatenated and fail. In practice users should pin to a single tag (e.g. `type=sha`) or use `steps.meta.outputs.version` for a single value. Left as-is since the post explicitly shows two tag rules, and reworking it would change the author's example structure.
- The `https://talos.dev/install` install script URL is the official Sidero Labs one-line installer and is current.
- `--mode cloud` for `talosctl validate` is a valid mode (alongside `metal` and `container`).
- `kubectl drain --delete-emptydir-data` is the correct flag (replacing the deprecated `--delete-local-data`).
- `--wait-timeout` is the correct flag name for both `talosctl health` and other talosctl commands that support waiting.
- All referenced GitHub Action major versions (`checkout@v4`, `setup-buildx-action@v3`, `login-action@v3`, `metadata-action@v5`, `build-push-action@v5`, `configure-aws-credentials@v4`) are current.
