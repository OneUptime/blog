# Validation Summary: How to Safely Uninstall Longhorn from Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Longhorn
- Kubernetes
- Helm
- kubectl
- Longhorn custom resources (`Backup`, `Settings`, CRDs)
- YAML

## Sources Consulted
- Longhorn uninstall documentation: https://longhorn.io/docs/latest/deploy/uninstall/
- Longhorn create-a-backup documentation: https://longhorn.io/docs/latest/snapshots-and-backups/backup-and-restore/create-a-backup/
- Longhorn recurring snapshots and backups documentation: https://longhorn.io/docs/latest/snapshots-and-backups/scheduling-backups-and-snapshots/
- Longhorn create volumes documentation: https://longhorn.io/docs/latest/nodes-and-volumes/volumes/create-volumes/
- Longhorn settings reference: https://longhorn.io/docs/latest/references/settings/
- Kubernetes `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes `kubectl scale` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_scale/
- Kubernetes `kubectl delete` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/

## Issues Found
- The Step 1 loop annotated `lhvolume` resources with recurring-job metadata, which does not trigger immediate backups. Replaced it with an official Longhorn backup workflow using the documented `Backup` custom resource and clarified that a backup target must already be configured.
- The Step 2 PVC discovery example relied on `kubectl get pvc -A | grep longhorn`, which is brittle, and `kubectl delete pvc --all`, which could delete unrelated claims. Replaced it with a targeted Longhorn CSI PV/PVC listing command and explicit workload/PVC cleanup examples.
- The Step 3 uninstall-flag command used the wrong Longhorn resource name (`setting.longhorn.io`) and an unrelated comment. Corrected it to patch `settings.longhorn.io/deleting-confirmation-flag`.
- The Step 4 wait command watched pods generally instead of the documented uninstall job flow. Updated it to watch `job/longhorn-uninstall` after Helm uninstall.
- The original Step 5 manually deleted Longhorn CRDs and then deleted the `longhorn-system` namespace directly. Replaced that with Longhorn’s documented uninstall-manifest flow for `kubectl` installs, which cleans up CRDs safely and avoids contradicting Longhorn’s own guidance about direct namespace deletion.
- The troubleshooting snippet only removed finalizers from CRD objects, which would not resolve many stuck uninstalls caused by finalizers on custom-resource instances. Replaced it with Longhorn’s documented CRD-instance cleanup loop.
- The node cleanup command now uses `sudo rm -rf /var/lib/longhorn`, which better reflects the privileges typically required on cluster nodes.

## Review Notes
- Longhorn’s raw uninstall manifests are version-specific. The post now uses `<LONGHORN_VERSION>` and notes that it should match the installed release, for example `v1.11.1`.
- The current Longhorn documentation uses the CSI driver `driver.longhorn.io`. Older environments that still depend on legacy Flexvolume-era resources would need different workload-discovery logic.
