# Validation Summary: How to Configure Longhorn Volume Data Locality

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Longhorn (cloud-native distributed block storage for Kubernetes)
- Kubernetes (StorageClass, StatefulSet, PersistentVolumeClaim)
- kubectl (CRD patching, custom-columns output)
- Longhorn CRDs: `settings.longhorn.io`, `volumes.longhorn.io`, `replicas.longhorn.io`

## Sources Consulted
- Longhorn official docs — Settings reference: https://longhorn.io/docs/latest/references/settings/
- Longhorn official docs — Data Locality: https://longhorn.io/docs/latest/high-availability/data-locality/
- Longhorn official docs — StorageClass parameters: https://longhorn.io/docs/latest/references/storage-class-parameters/
- Longhorn manager source/labels conventions for replica resources

## Issues Found
No technical issues found.

The following claims were verified directly against Longhorn documentation:
- The three data locality modes (`disabled`, `best-effort`, `strict-local`) are correct and complete.
- Setting CRD `default-data-locality` uses a top-level `value` field — the `kubectl patch ... --type merge -p '{"value": "best-effort"}'` syntax is valid.
- StorageClass parameter `dataLocality` (camelCase) and provisioner `driver.longhorn.io` are correct.
- `strict-local` requires `numberOfReplicas: "1"` — volume creation otherwise fails parameter validation.
- Volume CRD has `spec.dataLocality`, and the patch example is structurally correct.
- UI path "Setting → General → Default Data Locality" matches the Longhorn UI.

## Review Notes
- The Longhorn docs note that `strict-local` is incompatible with ReadWriteMany (RWX) volumes. The post focuses on `ReadWriteOnce` workloads so this is not misleading, but a future revision could call this out explicitly.
- The replica label `longhornvolume=<volume-name>` is the conventional label used by Longhorn manager and matches widely-published example commands; the official docs reference checked do not include an explicit example, but the label name is consistent with Longhorn source.
- The UI labels ("Setting" singular vs "Settings") have varied slightly across Longhorn UI versions — the wording in the post matches the current UI and is acceptable.
- The `grep -i "data locality"` log filter is illustrative; actual log lines may not always contain that exact phrase, but the command itself is syntactically correct and harmless.
- No version pin is given for Longhorn, which is reasonable since the data locality feature and the listed mode names have been stable across recent v1.x releases.
