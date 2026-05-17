# Validation Summary: How to Create Maintenance Runbooks for Talos Linux

## Status
validated

## Post Type
Guide / Tutorial (operational best practices with example runbooks)

## Technologies Covered
- Talos Linux
- talosctl CLI
- Kubernetes (kubectl)
- etcd
- Bash scripting

## Sources Consulted
- Talosctl CLI Reference v1.9 — https://docs.siderolabs.com/talos/v1.9/reference/cli/
- Talos CA Rotation guide — https://www.talos.dev/v1.9/advanced/ca-rotation/
- Talos Upgrading guide — https://docs.siderolabs.com/talos/v1.8/configure-your-talos-cluster/lifecycle-management/upgrading-talos
- kubectl drain documentation — https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#drain

## Issues Found
- **`talosctl config rotate-certs` does not exist.** The runbook's Certificate Renewal section instructed readers to run `talosctl config rotate-certs -n 10.0.0.1`, but there is no such subcommand under `talosctl config`. The correct command is the top-level `talosctl rotate-ca`, which defaults to dry-run mode and requires `--dry-run=false` to actually rotate, along with `--talos=true`/`--kubernetes=true` flags to select which CA to rotate. Fixed by replacing the line with `talosctl -n 10.0.0.1 rotate-ca --dry-run=false --talos=true --kubernetes=false` and a comment noting that the output contains the new CA material and must be captured.

## Review Notes
- All other talosctl commands referenced (`version`, `etcd members`, `etcd snapshot`, `etcd status`, `etcd defrag`, `upgrade --image`, `health --wait-timeout`, `dmesg`, `rollback`, `apply-config --insecure`, `get certificate`, `config merge`) were verified against the v1.9 CLI reference and are correct.
- `kubectl drain --delete-emptydir-data` is the current flag (the older `--delete-local-data` was deprecated).
- The runbook is broadly conceptual and version-agnostic, but uses `v1.9.1` as a concrete upgrade target — readers will need to substitute the current version when applying.
- The example "ghcr.io/siderolabs/installer" image is the correct image registry/repository for Talos installer images.
