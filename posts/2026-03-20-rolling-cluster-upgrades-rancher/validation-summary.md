# Validation Summary: How to Perform Rolling Cluster Upgrades in Rancher - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical guide

## Technologies Covered
- Rancher Manager
- Kubernetes
- RKE2
- System Upgrade Controller
- kubectl
- PodDisruptionBudgets
- Rancher CIS/Compliance scans

## Sources Consulted
- RKE2 Automated Upgrades documentation: https://docs.rke2.io/upgrades/automated
- RKE2 Rolling Back documentation: https://docs.rke2.io/upgrades/roll-back
- Rancher Kubernetes upgrade and rollback documentation: https://ranchermanager.docs.rancher.com/v2.14/getting-started/installation-and-upgrade/upgrade-and-roll-back-kubernetes
- Rancher RKE2 cluster configuration reference: https://ranchermanager.docs.rancher.com/v2.13/reference-guides/cluster-configuration/rancher-server-configuration/rke2-cluster-configuration
- System Upgrade Controller Plan API documentation: https://github.com/rancher/system-upgrade-controller/blob/master/doc/plan.md
- System Upgrade Controller Plan API types: https://github.com/rancher/system-upgrade-controller/blob/master/pkg/apis/upgrade.cattle.io/v1/types.go
- System Upgrade Controller job generation source: https://github.com/rancher/system-upgrade-controller/blob/master/pkg/upgrade/job/job.go
- RKE2 upgrade image script: https://github.com/rancher/rke2-upgrade/blob/master/scripts/upgrade.sh
- Kubernetes version skew policy: https://kubernetes.io/releases/version-skew-policy/
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain
- Kubernetes kubectl `--short` removal report in the official Kubernetes repository: https://github.com/kubernetes/kubernetes/issues/122455
- Rancher compliance scan documentation: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/compliance-scan-guides/run-a-scan

## Issues Found
- The pre-upgrade command used `kubectl version --short`, which fails with modern kubectl versions, including the Kubernetes v1.30.2 client used to match the post's example RKE2 version. Changed it to `kubectl version`.
- The Rancher UI instructions listed `Max Unavailable` as a separate RKE2 upgrade strategy setting. Rancher RKE2 upgrade strategy exposes control plane concurrency, worker concurrency, and drain options; worker concurrency is the relevant batch/unavailable setting. Replaced the incorrect bullet with a `Drain Nodes` instruction.
- The manual upgrade method said it applied to clusters not managed by Rancher's provisioner. RKE2 documentation is stricter: Rancher-managed RKE2 clusters should use Rancher version management unless version management has been disabled for an imported cluster. Updated the scope statement.
- The System Upgrade Controller install command only applied `system-upgrade-controller.yaml`. Current RKE2 documentation applies both `crd.yaml` and `system-upgrade-controller.yaml`, so the CRD manifest was added.
- The worker Plan omitted the required `upgrade` container and the `system-upgrade` service account used by the prepare step. Added both fields so the Plan is valid and has the permissions expected by the official examples.
- The worker Plan selected nodes labeled `rke2-upgrade=worker`, but the post did not label worker nodes or apply the worker Plan. Added the matching label and apply commands.
- The rollback wording implied a generic API server downgrade limitation without clarifying the in-place case. Updated it to say Kubernetes does not support an in-place API server downgrade, aligning the text with RKE2's documented rollback process using datastore restoration and binary rollback.

## Review Notes
- The example RKE2 version `v1.30.2+rke2r1` exists, but it is no longer current as of this review. Readers should choose a version supported by their Rancher and RKE2 release channel.
- The `drain.force: false` setting is conservative. It may block drains if unmanaged pods are present, which is usually preferable for production but should be understood before running the Plan.
- System Upgrade Controller plans are appropriate for unmanaged RKE2 clusters or imported clusters where Rancher version management has been disabled; Rancher-provisioned RKE2 clusters should be upgraded through Rancher.
