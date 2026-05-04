# Validation Summary: How to Configure Longhorn Orphaned Replica Cleanup

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Longhorn (cloud-native distributed block storage)
- Kubernetes
- kubectl
- Bash scripting

## Sources Consulted
- [Longhorn 1.9 — Orphaned Data Cleanup](https://longhorn.io/docs/1.9.0/advanced-resources/data-cleanup/orphaned-data-cleanup/)
- [Longhorn 1.11 — Customizing Default Settings](https://longhorn.io/docs/1.11.1/advanced-resources/deploy/customizing-default-settings/)
- [Longhorn 1.11 — Uninstall Longhorn (deleting-confirmation-flag)](https://longhorn.io/docs/1.11.1/deploy/uninstall/)
- [Longhorn longhorn.yaml CRD source (master)](https://raw.githubusercontent.com/longhorn/longhorn/master/deploy/longhorn.yaml)
- [SUSE Storage 1.11 — Orphaned Data Cleanup](https://documentation.suse.com/cloudnative/storage/1.11/en/data-integrity-recovery/orphaned-data-cleanup.html)
- [Longhorn 20220324 Orphaned Data Cleanup design enhancement](https://github.com/longhorn/longhorn/blob/master/enhancements/20220324-orphaned-data-cleanup.md)
- [Longhorn issue #11542 — orphan-resource-auto-deletion setting](https://github.com/longhorn/longhorn/issues/11542)
- [Longhorn KB — Restoring Data from an Orphaned Replica Directory](https://longhorn.io/kb/restoring-data-from-an-orphaned-replica-directory/)

## Issues Found

1. **Setting renamed: `orphan-auto-deletion` → `orphan-resource-auto-deletion`.** In Longhorn 1.9.0+ the setting is named `orphan-resource-auto-deletion`. The post used the legacy name. Updated both the `kubectl patch` and the verification `kubectl get` commands to the current name.

2. **`replicas.longhorn.io` field name.** The post referenced `spec.dataPath`, which does not exist on the Replica CRD. The correct field is `spec.dataDirectoryName` (the disk path lives separately in `spec.diskPath` and the full data path is computed from `diskPath + dataDirectoryName`). Updated the jsonpath expressions in the manual detection commands and the cleanup script. Also removed the now-unnecessary `xargs basename` step since the field already contains a directory name (not a path).

3. **Orphan CRD parameter casing.** The orphan CRD's `spec.parameters` map keys are PascalCase (`DataName`, `DiskName`, `DiskPath`, `DiskUUID`), not camelCase. Changed `spec.parameters.diskPath` → `spec.parameters.DiskPath` in the custom-columns output.

4. **Non-existent orphan status field.** The `custom-columns` example referenced `status.parameters.diskSpaceUsageInBytes`, which is not part of the Orphan CRD schema (the orphan `status` only contains `conditions` and `ownerID`). Replaced with valid spec parameters (`spec.orphanType`, `spec.parameters.DiskName`, `spec.parameters.DataName`) so the command actually returns useful data.

5. **Misuse of `deleting-confirmation-flag`.** The "Configure Delete Confirmation" subsection claimed this setting prevents volume deletion when volumes are attached. That is incorrect — `deleting-confirmation-flag` is a guard against accidental Longhorn-system uninstallation; it has nothing to do with volume deletion or orphan cleanup. Removed the subsection because it is both off-topic and technically wrong.

## Review Notes

- The `/var/lib/longhorn/replicas/` path used in examples is the typical default replica directory layout, but operators with custom Default Data Path settings or multiple disks will see replicas under their configured disk paths instead. The post's "use with caution" warning around the manual cleanup script covers this adequately.
- The grace period for auto-deletion is governed by a separate setting, `orphan-resource-auto-deletion-grace-period`. The post mentions a "configurable wait period" without naming the setting; this is acceptable but could be made more concrete in a future revision.
- The "Configuring Orphan Detection Interval" section only shows a `kubectl get | grep orphan` command rather than configuring an interval. The section title slightly oversells the content but it is not technically inaccurate, so left as-is.
