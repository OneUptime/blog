# Validation Summary: How to Upgrade Elemental OS on Nodes

## Status
validated

## Post Type
Guide

## Technologies Covered
- SUSE Rancher Prime: OS Manager (Elemental)
- Kubernetes
- Rancher Fleet
- Rancher System Upgrade Controller
- Elemental Toolkit

## Sources Consulted
- SUSE Rancher Prime: OS Manager upgrade documentation: https://documentation.suse.com/cloudnative/os-manager/1.9/en/node-operational-tasks/upgrade.html
- SUSE Rancher Prime: OS Manager upgrade lifecycle documentation: https://documentation.suse.com/cloudnative/os-manager/latest/en/rancher-os-management/upgrade-lifecycle.html
- SUSE Rancher Prime: OS Manager channels documentation: https://documentation.suse.com/cloudnative/os-manager/1.9/en/operator-operational-tasks/channels.html
- SUSE Rancher Prime: OS Manager `ManagedOSVersion` reference: https://documentation.suse.com/cloudnative/os-manager/1.8/en/references/managedosversion-reference.html
- SUSE Rancher Prime: OS Manager troubleshooting and verification steps: https://documentation.suse.com/cloudnative/os-manager/latest/en/troubleshooting/troubleshooting-verification.html
- Elemental Toolkit runtime layout reference: https://rancher.github.io/elemental-toolkit/docs/reference/layout/
- Elemental Toolkit upgrading reference: https://rancher.github.io/elemental-toolkit/docs/getting-started/upgrading/
- Elemental Operator `ManagedOSImage` type definition: https://github.com/rancher/elemental-operator/blob/main/api/v1beta1/managedosimage_types.go
- Rancher Fleet `BundleTarget` type definition: https://github.com/rancher/fleet/blob/main/pkg/apis/fleet.cattle.io/v1alpha1/bundle_types.go
- System Upgrade Controller `DrainSpec` type definition: https://github.com/rancher/system-upgrade-controller/blob/master/pkg/apis/upgrade.cattle.io/v1/types.go
- System Upgrade Controller job label generation: https://github.com/rancher/system-upgrade-controller/blob/master/pkg/upgrade/job/job.go

## Issues Found
- The main `ManagedOSImage` example used an invalid top-level `clusterSelector` field. I changed it to the supported `clusterTargets` structure and kept the cluster-label targeting intent intact.
- The main and rolling examples used `drain.enabled`, which is not part of the current `ManagedOSImage` drain schema. I removed that field and kept valid drain settings only.
- The drain `timeout` values were written as bare integers (`300` and `600`). In System Upgrade Controller, integer timeouts are interpreted as nanoseconds, so I changed them to duration strings (`"300s"` and `"600s"`).
- The worker-node selector used `matchLabels` with `node-role.kubernetes.io/worker: "true"`, which is brittle because these role labels are often presence-only. I changed both worker selectors to `matchExpressions` with `Exists`.
- The monitoring commands filtered jobs and pods with `upgrade.cattle.io/managed-os-image`, which is not the label System Upgrade Controller applies. I corrected both commands to filter on `upgrade.cattle.io/plan=os-upgrader-...`.
- The single-node verification command printed node annotations rather than the node OS image/version. I changed it to read `.status.nodeInfo.osImage`.
- The rolling-upgrade example omitted `clusterTargets`, which would leave the `ManagedOSImage` with no downstream cluster targets in `fleet-default`. I added valid cluster targeting.
- The `ManagedOSVersionChannel` section incorrectly implied that `managedOSVersionName` references a channel directly. I corrected the workflow to create a `ManagedOSVersionChannel` and then reference one synced `ManagedOSVersion` from `ManagedOSImage`.
- The rollback section used `grub2-once recovery` and `elemental reset` as if they were the normal OS Manager rollback path. I replaced that with the documented behavior: automatic A/B fallback on boot failure, and explicit downgrade by pointing `ManagedOSImage` to an older image with `FORCE=true`.
- The introduction and conclusion claimed "zero-downtime" upgrades. I changed that to controlled rolling upgrades because downtime depends on workload redundancy and drain behavior, not the OS Manager alone.

## Review Notes
- The current SUSE documentation uses the product name "SUSE Rancher Prime: OS Manager", while the post uses "Elemental". The terminology is still technically understandable because the CRDs and much of the upstream tooling remain under `elemental.cattle.io`.
- `ManagedOSVersion` names are channel-dependent. The corrected example now uses the right workflow, but readers still need to substitute a version name that actually exists in their synced channel.
