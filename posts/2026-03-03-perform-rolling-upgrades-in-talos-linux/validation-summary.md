# Validation Summary: How to Perform Rolling Upgrades in Talos Linux

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- Talos Linux (v1.7.0)
- talosctl CLI (upgrade, health, etcd status/members, get hostname, version)
- Kubernetes (kubectl drain, uncordon, get nodes/pods)
- Pod Disruption Budgets (policy/v1)
- etcd
- Bash scripting (arrays, functions, parallel batches)
- Prometheus / Grafana monitoring metrics

## Sources Consulted
- Talos v1.7 Upgrading Talos Linux: https://docs.siderolabs.com/talos/v1.7/configure-your-talos-cluster/lifecycle-management/upgrading-talos
- Talos v1.7 CLI Reference: https://docs.siderolabs.com/talos/v1.7/reference/cli/
- kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes "Safely Drain a Node" task: https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/
- kubectl `--disable-eviction` flag (PR #85571, K8s 1.18): https://github.com/kubernetes/kubernetes/pull/85571
- kubectl `--delete-local-data` deprecation (PR #95076): https://github.com/kubernetes/kubernetes/pull/95076
- Talos v1.7.0 release notes: https://github.com/siderolabs/talos/releases/tag/v1.7.0

## Issues Found
No technical issues found. Each verified item checks out:

- `talosctl upgrade --nodes <ip> --image ghcr.io/siderolabs/installer:v1.7.0` — correct syntax and image path. The `--preserve` flag is only required for single-node control planes; the post targets a 3-node HA control plane where the default behavior (leave etcd, upgrade, rejoin) is correct.
- `talosctl health --wait-timeout` — correct flag name (confirmed in CLI reference, default `20m0s`).
- `talosctl etcd status` and `talosctl etcd members` — both are valid documented subcommands.
- `talosctl get hostname --nodes <ip> -o json` with `.spec.hostname` — matches the HostnameSpec resource structure.
- `talosctl version` output containing `Tag:` lines — correct; the script's use of `tail -1` to grab the Server tag is valid.
- `kubectl drain --delete-emptydir-data` — correct current flag (replaces the deprecated `--delete-local-data`).
- `kubectl drain --disable-eviction` — valid flag added in K8s 1.18 that does bypass PDBs as described.
- Drain blocking on PDBs — the post correctly describes drain as waiting for PDBs to permit eviction rather than failing.
- A/B boot rollback — accurately described as "may have already kicked in" (which appropriately reflects that bootloader-level rollback handles boot failures but not post-boot service failures).
- PDB manifest (`policy/v1`, `minAvailable`, `selector.matchLabels`) — valid v1 schema.

## Review Notes
- Talos v1.7 reached end-of-life and v1.8/v1.9 are current at time of review (2026-05-16). The procedures and CLI flags shown remain valid against current Talos releases, but readers should substitute a current installer tag when running the commands.
- The automatic rollback note ("Option 1") could be expanded in the future to mention that boot-level A/B rollback does not cover post-boot service failures (kubelet/etcd/CNI not starting); in such cases manual `talosctl rollback` is needed. The current wording is not incorrect, just brief.
- The downgrade example (`talosctl upgrade ... :v1.6.0`) works for adjacent minor versions but Talos does not officially support arbitrary version downgrades across major boundaries; a future revision could add a short caveat.
- The script's `talosctl version | grep "Tag:" | tail -1` pattern depends on the Server section appearing after the Client section in `talosctl version` output, which has been stable but is implicit — using `--short` or parsing JSON would be more robust. Not incorrect as written.
