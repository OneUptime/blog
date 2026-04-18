# Validation Summary: How to Uninstall Longhorn Safely

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- Longhorn (distributed block storage for Kubernetes)
- Kubernetes (kubectl, PVCs, PVs, StorageClasses, CRDs, Jobs)
- Helm (package manager for Kubernetes)
- jq (JSON processing for kubectl output)
- Shell/bash operations for node-level cleanup

## Sources Consulted
- Longhorn official uninstall documentation: https://longhorn.io/docs/latest/deploy/uninstall/
- Longhorn GitHub repository: https://github.com/longhorn/longhorn
- Longhorn CRD definitions (backupvolumes.longhorn.io, backups.longhorn.io, volumes.longhorn.io)
- Longhorn default data path reference (`/var/lib/longhorn/`)
- kubectl CLI reference: https://kubernetes.io/docs/reference/kubectl/
- Kubernetes PersistentVolumeClaim / StorageClass field spec docs
- Helm CLI docs: https://helm.sh/docs/helm/helm_uninstall/
- Longhorn uninstall job manifest (v1.7.0 release)

## Issues Found

1. **Step 3 (Delete PVCs) — incorrect selector**: The original command `kubectl delete pvc --all-namespaces --selector storageclass=longhorn` would not actually match any Longhorn PVCs. `storageClassName` is a field under `spec`, not a label, and Longhorn does not automatically add a `storageclass=longhorn` label to provisioned PVCs. Replaced with a `kubectl get -o json | jq | while read` pipeline that filters on `spec.storageClassName == "longhorn"` and iterates properly across namespaces — this matches the filtering pattern already used correctly in the Pre-Uninstall Checklist section.

## Review Notes

- The manifest-based uninstall flow (Step 5, "Via kubectl (manifest Installation)") technically also requires setting the `deleting-confirmation-flag` setting to `true` before the uninstall job can complete (since Longhorn v1.4+). The post covers this indirectly via the UI option ("Setting → General → Uninstall"), which sets the flag internally. Users who go straight to the manifest path may need: `kubectl -n longhorn-system patch -p '{"value": "true"}' --type=merge lhs deleting-confirmation-flag` beforehand. Left unchanged since the UI path is presented first and adequately covers confirmation.
- The pinned version `v1.7.0` in the manifest URLs is valid (released August 2024), though newer Longhorn releases exist. Version pinning is appropriate for a how-to guide and these URLs are still fetchable.
- The `kubectl wait --for=condition=complete job/longhorn-uninstall` step after `helm uninstall` may race with Helm resource cleanup depending on chart version — in some chart revisions Helm removes the Job before the wait resolves. Non-blocking for most users since the underlying job still runs to completion; left as-is.
- Default Longhorn data paths (`/var/lib/longhorn/replicas/`, `/var/lib/longhorn/engine-binaries/`, `/var/lib/longhorn/longhorn-disk.cfg`) are correct.
- CRD names referenced (`backupvolumes.longhorn.io`, `backups.longhorn.io`, `volumes.longhorn.io`) are accurate for Longhorn's API group.
