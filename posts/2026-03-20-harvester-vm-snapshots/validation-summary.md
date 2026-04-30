# Validation Summary: How to Take VM Snapshots in Harvester

## Status
validated

## Post Type
Guide

## Technologies Covered
- Harvester
- KubeVirt
- Kubernetes `VolumeSnapshot`
- Longhorn
- `kubectl`
- Bash

## Sources Consulted
- Harvester VM Backup, Snapshot & Restore: https://docs.harvesterhci.io/v1.7/vm/backup-restore/
- KubeVirt Snapshot Restore API user guide: https://kubevirt.io/user-guide/storage/snapshot_restore_api/
- KubeVirt API reference (`VirtualMachineSnapshot` and `VirtualMachineRestore`): https://kubevirt.io/api-reference/v1.7.1/definitions.html
- KubeVirt lifecycle and `virtctl` start/stop usage: https://kubevirt.io/user-guide/user_workloads/lifecycle/
- Longhorn recurring snapshots and backups: https://longhorn.io/docs/1.11.0/snapshots-and-backups/scheduling-backups-and-snapshots/
- Kubernetes field selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands/

## Issues Found
- The snapshot and restore manifests used the outdated `snapshot.kubevirt.io/v1alpha1` API. Updated all examples to `snapshot.kubevirt.io/v1beta1` to match current KubeVirt documentation.
- The introduction implied VM snapshots were just Longhorn snapshots of disks. Clarified that Harvester uses KubeVirt VM snapshots backed by Kubernetes `VolumeSnapshot` objects on Longhorn storage, and added the required `VolumeSnapshotClass` prerequisite plus the guest-agent consistency caveat for running VMs.
- The UI walkthrough used the action name `Take Snapshot`, while current Harvester documentation uses `Take VM Snapshot`. Updated the step to match the documented UI label.
- The command `kubectl get virtualmachinesnapshot --field-selector spec.source.name=...` is not a documented supported field-selector example for this custom resource. Replaced it with a `kubectl ... -o json | jq` filter that works reliably.
- The command `-o jsonpath='{.status}' | jq .` would not return valid JSON for `jq`. Replaced it with `-o json | jq '.status'`.
- The "in-place restore" example did not actually use KubeVirt's `InPlace` volume restore policy and relied on deprecated `spec.running` patches. Updated the restore manifest to use `targetReadinessPolicy: StopTarget` and `volumeRestorePolicy: InPlace`, and switched the operational example to the current restore/wait plus `virtctl start` flow.
- The restore examples did not wait for the restore resource to become ready. Added `kubectl wait` examples for both same-VM and new-VM restores.
- The Longhorn recurring-job section incorrectly implied the manifest would snapshot "all VM volumes" while also showing direct per-volume labeling, and it used the `default` group in a misleading way. Removed the `default` group, clarified that these are Longhorn volume snapshots rather than Harvester VM snapshots, and changed the label example to the documented `volume/<LONGHORN_VOLUME_NAME>` form.
- The recurring-job section omitted the documented behavior that jobs run only while a volume is attached unless `allow-recurring-job-while-volume-detached` is enabled. Added that caveat.
- The deletion example said "older than 30 days (using labels)" even though it actually filtered by a fixed timestamp and used no labels. Rewrote the example to describe a cutoff date accurately.
- The deletion section did not mention Harvester's current caution for Longhorn V2 volumes. Added the official warning about deleting the latest VM snapshot on Harvester v1.7.x with Longhorn V2 volumes.

## Review Notes
- Harvester documentation also notes an Ubuntu `netplan` DHCP caveat for restored VMs and a possible `filesystem freeze failed` issue on running RHEL 9 guests. Those are technically relevant operational caveats for readers using those guest OSes.
