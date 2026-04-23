# Validation Summary: How to Perform a Rolling Upgrade of RKE2

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RKE2
- Kubernetes
- `kubectl drain`, `uncordon`, and `wait`
- RKE2 etcd snapshots
- RKE2 installation script environment variables
- Pod Disruption Budgets
- Rancher system-upgrade-controller

## Sources Consulted
- RKE2 official documentation: Manual Upgrades - https://docs.rke2.io/upgrades/manual
- RKE2 official documentation: Backup and Restore - https://docs.rke2.io/datastore/backup_restore
- RKE2 official documentation: Configuration Options / installation script environment variables - https://docs.rke2.io/install/configuration
- RKE2 official documentation: Automated Upgrades - https://docs.rke2.io/upgrades/automated
- RKE2 official documentation: High Availability - https://docs.rke2.io/install/ha
- RKE2 official release notes: v1.28.X - https://docs.rke2.io/release-notes-old/v1.28.X
- RKE2 official release notes: v1.34.X - https://docs.rke2.io/release-notes/v1.34.X
- Kubernetes official documentation: `kubectl drain` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes official documentation: Pod disruptions and PodDisruptionBudgets - https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes official documentation: Version Skew Policy - https://kubernetes.io/releases/version-skew-policy/

## Issues Found
1. **Zero-downtime guarantee was overstated**: The post described the process as zero-downtime without qualifying the workload requirements. Kubernetes only preserves availability during voluntary disruptions when workloads have enough replicas, capacity, and suitable PDBs. **Fix:** Reworded the description and conclusion to say the process minimizes downtime for highly available workloads, and added the dependency on replicas, capacity, and PDBs.

2. **Hard-coded target version was outdated and potentially unsafe**: The post used `v1.28.10+rke2r1`, which the RKE2 release notes list as a May 22, 2024 release. Using that in a 2026 guide is stale, and upgrading across Kubernetes minor versions must follow the Kubernetes version skew policy. **Fix:** Replaced the hard-coded version with the official RKE2 placeholder format `vX.Y.Z+rke2rN` and added a prerequisite to choose a supported target without skipping Kubernetes minor versions.

3. **Install script environment variables could be lost through `sudo`**: Commands such as `INSTALL_RKE2_VERSION=$VERSION sudo sh -` rely on `sudo` preserving the caller environment, which is not reliable. RKE2 documents `INSTALL_RKE2_VERSION` and `INSTALL_RKE2_TYPE` as install script environment variables. **Fix:** Changed the SSH commands to pipe into `sudo env INSTALL_RKE2_VERSION=... sh -` and `sudo env INSTALL_RKE2_VERSION=... INSTALL_RKE2_TYPE=agent sh -`.

4. **Server nodes were cordoned but not drained**: RKE2 server nodes are schedulable by default unless tainted, and Kubernetes recommends draining a node before an in-place minor kubelet upgrade. The original script only cordoned the node and slept. **Fix:** Replaced the server-node cordon/sleep step with `kubectl drain --ignore-daemonsets --delete-emptydir-data`, noting that static control-plane mirror pods are skipped by `kubectl drain`.

5. **Node readiness check missed `NotReady` nodes**: `grep -v Ready` does not catch `NotReady` because the string contains `Ready`. **Fix:** Replaced it with an `awk` check against the node status column.

6. **Custom node status column was misleading**: `.status.conditions[-1].type` prints a condition type, not a stable node readiness status. **Fix:** Replaced the status/role inspection and watch examples with `kubectl get nodes -o wide`, which shows Kubernetes' standard status, roles, and version columns.

7. **Worker drain verification did not actually exclude DaemonSets**: The normal `kubectl get pods` table does not include owner kind, so `grep -v daemonset` was not a valid way to exclude DaemonSet-managed pods. **Fix:** Changed the check to count remaining pods after drain without claiming DaemonSet exclusion.

8. **Health and version checks had fragile grep behavior**: Some pod health checks included the table header, and the target-version comparison used regex matching where `.` and other characters could be interpreted as pattern syntax. **Fix:** Filtered the header in health checks and used `grep -F` for fixed-string version comparison.

## Review Notes
- The RKE2 upgrade order in the post is correct: server nodes should be upgraded first, one at a time, followed by agent nodes.
- The etcd snapshot command and default snapshot path are consistent with the RKE2 backup and restore documentation.
- `kubectl drain --ignore-daemonsets --delete-emptydir-data` is current and valid, and `kubectl drain` uses eviction behavior that respects PDBs unless eviction is disabled.
- The workspace does not have local `kubectl` or `rke2` binaries installed, so CLI flag verification was performed against official documentation rather than local `--help` output.
