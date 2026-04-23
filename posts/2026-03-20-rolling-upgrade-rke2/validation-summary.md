# Validation Summary: How to Perform a Rolling Upgrade of RKE2 - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RKE2
- Kubernetes
- kubectl
- System Upgrade Controller
- `upgrade.cattle.io/v1` `Plan` resources
- RKE2 upgrade image (`rancher/rke2-upgrade`)

## Sources Consulted
- RKE2 Automated Upgrades documentation: https://docs.rke2.io/upgrades/automated
- RKE2 Rolling Back documentation: https://docs.rke2.io/upgrades/roll-back
- RKE2 stable release channel: https://update.rke2.io/v1-release/channels/stable
- RKE2 release `v1.34.6+rke2r3`: https://github.com/rancher/rke2/releases/tag/v1.34.6+rke2r3
- System Upgrade Controller Plan API documentation: https://github.com/rancher/system-upgrade-controller/blob/master/doc/plan.md
- System Upgrade Controller Plan API types: https://github.com/rancher/system-upgrade-controller/blob/master/pkg/apis/upgrade.cattle.io/v1/types.go
- System Upgrade Controller job generation source: https://github.com/rancher/system-upgrade-controller/blob/master/pkg/upgrade/job/job.go
- RKE2 upgrade script source: https://github.com/rancher/rke2-upgrade/blob/master/scripts/upgrade.sh
- Kubernetes `kubectl drain` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes Safely Drain a Node documentation: https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/
- Kubernetes Version Skew Policy: https://kubernetes.io/releases/version-skew-policy/

## Issues Found
- The System Upgrade Controller install command only applied `system-upgrade-controller.yaml`. Updated it to apply both `crd.yaml` and `system-upgrade-controller.yaml`, matching the current RKE2 automated upgrade documentation.
- The examples targeted the outdated RKE2 version `v1.30.2+rke2r1`. Updated both server and agent plans to `v1.34.6+rke2r3`, which the RKE2 stable channel resolved to during validation on 2026-04-23.
- The agent drain settings used `deleteLocalData`. Updated it to `deleteEmptydirData`, the current System Upgrade Controller field that maps to the current `kubectl drain --delete-emptydir-data` behavior.
- The availability wording promised zero downtime unconditionally. Revised it to describe a controlled rolling upgrade that helps maintain availability when workloads are replicated and protected by disruption budgets.
- The rollback section said to delete an upgrade job but showed deleting plans, and it could imply that deleting plans rolls back a node. Corrected the text to say deleting plans stops additional upgrade jobs and that rollback requires restoring a datastore snapshot and rolling back the RKE2 binary when needed.
- The `skipWaitForDeleteTimeout` best-practice note described the option as a general eviction timeout. Corrected it to match `kubectl drain`: it skips waiting for pods whose `DeletionTimestamp` is older than the configured number of seconds.

## Review Notes
- The examples use a fixed `version`. RKE2 also supports using the stable channel URL in a Plan, but fixed versions are valid when operators want an explicit target release.
- Kubernetes version skew rules still apply. Operators should not skip unsupported intermediate minor versions when selecting the target RKE2 version.
- For Rancher-managed RKE2 clusters, the official RKE2 documentation recommends using Rancher version management instead of applying standalone System Upgrade Controller plans manually.
