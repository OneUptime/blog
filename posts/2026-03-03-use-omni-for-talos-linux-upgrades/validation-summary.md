# Validation Summary: How to Use Omni for Talos Linux Upgrades

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Sidero Omni
- Kubernetes
- omnictl
- talosctl
- etcd backups
- GitHub Actions

## Sources Consulted
- Sidero Omni documentation: Upgrade Omni Clusters, https://docs.siderolabs.com/omni/cluster-management/upgrading-clusters
- Sidero Omni documentation: omnictl CLI reference, https://docs.siderolabs.com/omni/reference/cli
- Sidero Omni documentation: Cluster Templates reference, https://docs.siderolabs.com/omni/reference/cluster-templates
- Sidero Omni documentation: Install and Configure Omnictl, https://docs.siderolabs.com/omni/getting-started/install-and-configure-omnictl
- Sidero Omni documentation: Create Etcd Backups, https://docs.siderolabs.com/omni/cluster-management/etcd-backups
- Talos Linux documentation: talosctl CLI reference, https://docs.siderolabs.com/talos/latest/reference/cli

## Issues Found
- The post used non-existent `omnictl cluster upgrade` examples with `--talos-version`, `--kubernetes-version`, and `--skip-node`. Replaced these with supported Omni flows: dashboard upgrades and cluster template export/diff/sync commands.
- The Kubernetes upgrade explanation did not match Omni's documented sequence. Updated it to mention image pre-pull, static pod rendering, API propagation, `kube-proxy` daemonset update, and kubelet updates.
- The pre-upgrade etcd backup example used a direct `talosctl etcd snapshot` workflow. Replaced it with Omni's documented etcd backup status and manual backup resource workflow.
- The failure handling section suggested skipping a failed node with an unsupported CLI flag. Replaced it with supported log inspection via `omnictl machine-logs` and cancel/retry guidance from the Omni upgrade documentation.
- The rollback section overstated automatic rollback behavior and used unsupported downgrade commands. Updated it to describe canceling an in-progress upgrade and syncing a template with an older supported version.
- The `omnictl` install URL in the GitHub Actions example was not the documented download URL. Replaced it with the official GitHub releases download pattern from the Omni docs.
- The etcd health command used `talosctl etcd members` while claiming to check health and alarms. Updated it to use `talosctl etcd status` and `talosctl etcd alarm list`.

## Review Notes
The remaining examples are intentionally generic and require an already configured `omniconfig`, kubeconfig, Talos config, and cluster template files. Omni's dashboard remains the primary documented upgrade path; CLI automation is best represented through cluster templates.
