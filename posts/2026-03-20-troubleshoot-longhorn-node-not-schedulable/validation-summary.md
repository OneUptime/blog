# Validation Summary: How to Troubleshoot Longhorn Node Not Schedulable

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Longhorn (distributed block storage for Kubernetes)
- Kubernetes (kubectl, nodes, PVCs, DaemonSets, conditions)
- jq (JSON processing for kubectl output)
- crictl (container runtime CLI for image cleanup)
- journalctl (systemd log management)
- Bash scripting

## Sources Consulted
- Longhorn settings reference: https://longhorn.io/docs/1.7.0/references/settings/
- Longhorn node CRD source (condition types): https://raw.githubusercontent.com/longhorn/longhorn-manager/master/k8s/pkg/apis/longhorn/v1beta2/node.go
- Longhorn condition handling source: https://raw.githubusercontent.com/longhorn/longhorn-manager/master/types/condition.go
- Longhorn multi-disk and node management documentation: https://longhorn.io/docs/1.7.0/nodes-and-volumes/nodes/multidisk/
- Kubernetes documentation on node conditions, cordoning, and field/label selectors

## Issues Found
No technical issues found. Verified items:
- `nodes.longhorn.io` CRD and `spec.allowScheduling` field name are correct.
- `storage-minimal-available-percentage` default value of 25 is correct (confirmed via Longhorn docs).
- `storage-over-provisioning-percentage` setting exists and accepts a string value (default is 100; the example value of 300 is illustrative and valid).
- `kubectl patch settings.longhorn.io ... -p '{"value": "..."}'` matches the Setting CRD shape (settings store their value in `.value` as a string).
- Node condition types `Schedulable`, `Ready`, and `MountPropagation` all exist in `NodeConditionType*` constants in the upstream `longhorn-manager` source.
- The `longhorn-manager` DaemonSet pods carry the label `app=longhorn-manager`, so the label selector and field selector combinations are correct.
- `/var/lib/longhorn/` is the default Longhorn host data directory.
- `crictl rmi --prune`, `journalctl --vacuum-size=500M`, `kubectl uncordon`, and `kubectl get pvc --all-namespaces` are all valid, current commands.
- The jq pipelines for `diskStatus` and the conditions array are syntactically correct and align with the actual node status structure.

## Review Notes
- The post is version-agnostic and uses APIs that have been stable across recent Longhorn releases (1.4–1.7+).
- The `storage-over-provisioning-percentage` default has changed over Longhorn versions (was historically 200, currently 100); the post does not state a default for this setting, so no correction is needed.
- The recommendation to maintain "at least 30% free space" is a sensible practice given the 25% minimum threshold default but is the author's preventive guidance, not an official Longhorn requirement.
- Issue 6's instruction to remove a disk via the Longhorn UI is correct; the equivalent kubectl/CRD edit (removing the entry from `spec.disks`) could optionally be added for completeness in a future revision.
