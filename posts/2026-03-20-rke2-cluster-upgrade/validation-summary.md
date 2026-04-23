# Validation Summary: How to Upgrade RKE2 Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RKE2
- Kubernetes
- kubectl
- etcd snapshots
- Rancher System Upgrade Controller
- `upgrade.cattle.io/v1` `Plan` resources
- Rancher Compliance scans

## Sources Consulted
- RKE2 Manual Upgrades documentation: https://docs.rke2.io/upgrades/manual
- RKE2 Automated Upgrades documentation: https://docs.rke2.io/upgrades/automated
- RKE2 Backup and Restore documentation: https://docs.rke2.io/datastore/backup_restore
- RKE2 CIS Hardening Guide: https://docs.rke2.io/security/hardening_guide
- RKE2 release channel API: https://update.rke2.io/v1-release/channels
- RKE2 release `v1.34.6+rke2r3`: https://github.com/rancher/rke2/releases/tag/v1.34.6%2Brke2r3
- System Upgrade Controller Plan API documentation: https://github.com/rancher/system-upgrade-controller/blob/master/doc/plan.md
- Kubernetes `kubectl version` reference: https://v1-34.docs.kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Kubernetes `kubectl drain` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes Version Skew Policy: https://kubernetes.io/releases/version-skew-policy/
- Rancher Compliance scan configuration reference: https://ranchermanager.docs.rancher.com/v2.14/integrations-in-rancher/compliance-scans/configuration-reference

## Issues Found
- The preparation commands used `kubectl version --short`, which is not present in current kubectl reference docs. Replaced it with `kubectl version`.
- The pod health checks used `grep -v Running | grep -v Completed`, which can return the header line and is less precise than Kubernetes field selectors. Replaced those checks with a field selector for pods whose phase is not `Running` or `Succeeded`.
- The guide did not mention Kubernetes version skew rules even though RKE2 documentation warns not to skip unsupported intermediate minor versions. Added that caveat to the prerequisites/checklist.
- The examples targeted outdated RKE2 version `v1.28.10+rke2r1`. Updated the examples to `v1.34.6+rke2r3`, the stable RKE2 channel release observed during validation.
- The worker-node workload verification only checked the default namespace with `grep`. Changed it to query all namespaces and filter pods by `spec.nodeName`.
- The System Upgrade Controller install command only applied `system-upgrade-controller.yaml`. Updated it to apply both the CRD manifest and controller manifest, matching current RKE2 documentation.
- The automated upgrade plans omitted `serviceAccountName: system-upgrade`, which current RKE2 examples include for upgrade jobs. Added it to both server and agent plans.
- The server plan used the older `deleteLocalData` drain field. Replaced it with `deleteEmptydirData`, matching the current `kubectl drain --delete-emptydir-data` behavior.
- The server plan's `prepare` block only echoed a message while claiming to be a health check. Removed the no-op prepare block.
- The agent plan used a manually constructed `kubectl wait` prepare step and an image tag containing `+`. Replaced it with the official `rancher/rke2-upgrade` prepare arguments used by RKE2 automated upgrade examples.
- The agent plan selected workers with `NotIn` against the control-plane label. Changed it to `DoesNotExist`, matching the official RKE2 agent-plan selector.
- The optional CIS scan used the older `cis.cattle.io/v1` API and an RKE2 CIS 1.6 hardened profile. Updated it to the current Rancher Compliance API example and added a profile-listing command so operators can choose a profile matching their cluster.
- The conclusion promised zero-downtime upgrades unconditionally. Revised it to state that availability depends on replicated workloads and disruption budgets.

## Review Notes
- The fixed RKE2 version is an example target. Operators still need to choose a target compatible with their current cluster version and Kubernetes version skew rules.
- For Rancher-managed RKE2 clusters, RKE2 documentation recommends using Rancher version management rather than applying standalone System Upgrade Controller plans manually.
- Rancher Compliance profile names can vary by Rancher/compliance chart version, so listing `ClusterScanProfile` resources before creating a scan is the safer operational step.
