# Validation Summary: How to Upgrade an RKE Cluster

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RKE/RKE1
- Kubernetes
- Rancher
- etcd snapshots
- kubectl
- RKE `cluster.yml` upgrade strategy

## Sources Consulted
- RKE1 Upgrades documentation: https://rke.docs.rancher.com/upgrades
- RKE1 How Upgrades Work documentation: https://rke.docs.rancher.com/upgrades/how-upgrades-work
- RKE1 Configuring the Upgrade Strategy documentation: https://rke.docs.rancher.com/upgrades/configuring-strategy
- RKE1 Maintaining Availability documentation: https://rke.docs.rancher.com/upgrades/maintaining-availability
- RKE1 Backups and Disaster Recovery documentation: https://rke.docs.rancher.com/etcd-snapshots
- RKE1 One-time Snapshots documentation: https://rke.docs.rancher.com/etcd-snapshots/one-time-snapshots
- RKE1 Restoring from Backup documentation: https://rke.docs.rancher.com/etcd-snapshots/restoring-from-backup
- RKE release `v1.5.6`: https://github.com/rancher/rke/releases/tag/v1.5.6
- RKE release `v1.5.8`: https://github.com/rancher/rke/releases/tag/v1.5.8
- RKE release `v1.8.8`: https://github.com/rancher/rke/releases/tag/v1.8.8
- RKE CLI source for etcd subcommands: https://raw.githubusercontent.com/rancher/rke/release/v1.8/cmd/etcd.go
- Kubernetes Version Skew Policy: https://kubernetes.io/releases/version-skew-policy/
- Kubernetes `kubectl version` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl Linux install documentation: https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/

## Issues Found
- The post did not mention that RKE/RKE1 reached end of life on July 31, 2025. Added a short note that this process is for maintaining existing RKE1 clusters and that operators should plan migration to RKE2 for continued support.
- The post used `kubectl version --short`, which is not present in current Kubernetes `kubectl version` reference docs. Replaced it with `kubectl version`.
- The etcd snapshot verification checked `./pki/` and used `rke etcd snapshot-list`. RKE1 snapshots are stored on etcd nodes in `/opt/rke/etcd-snapshots`, and the current RKE1 CLI exposes `snapshot-save` and `snapshot-restore`, not `snapshot-list`. Replaced the verification with an SSH check of the snapshot directory on each etcd node.
- The configuration backup used `cluster-rkestate.json`, but RKE v0.2.0+ uses `cluster.rkestate`. Updated the backup command.
- The RKE binary example used `v1.5.6`, which supports Kubernetes `v1.27.11-rancher1-1`, `v1.26.14-rancher1-1`, and `v1.25.16-rancher2-3`, not the post's `v1.28.8-rancher1-1` target. Updated the example to `v1.5.8`, whose release notes list `v1.28.8-rancher1-1`.
- The post omitted RKE's `system_images` precedence over `kubernetes_version`. Added a note so the Kubernetes version change behaves as described.
- The pod health check used `grep -v Running | grep -v Completed`, which can return the table header and is less precise than Kubernetes field selectors. Replaced it with a `status.phase` field selector for pods not in `Running` or `Succeeded`.
- The upgrade order omitted worker components on etcd-only nodes and add-ons, and described worker upgrades as one-at-a-time. Updated the process to match RKE's documented default order and worker batching behavior.
- The post said RKE drains worker nodes automatically. RKE cordons nodes by default, and draining only happens when `upgrade_strategy.drain: true` is configured. Updated the text and conclusion accordingly.
- The restore sequence restored etcd before putting the old `cluster.yml` back and then ran a separate `rke up`. Updated the sequence to restore the old config first, note that `snapshot-restore` deletes/rebuilds the cluster, and removed the redundant `rke up`.
- The HA upgrade strategy snippet was fenced as `bash` even though it is YAML. Changed the code fence to `yaml`.

## Review Notes
- The `v1.28.8-rancher1-1` Kubernetes target is still a version-specific example; operators must choose a Kubernetes version supported by their selected RKE release and their current cluster version.
- RKE1 is past upstream end of life. Recent RKE 1.8 release notes indicate some Kubernetes versions require an active RKE Extended Life subscription.
- Availability during upgrades still depends on HA topology, replicated workloads, readiness/liveness probes, and disruption budgets.
