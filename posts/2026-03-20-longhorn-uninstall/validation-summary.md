# Validation Summary: How to Remove Longhorn from a Kubernetes Cluster

## Status
validated

## Post Type
Guide

## Technologies Covered
- Longhorn
- Kubernetes
- Helm
- SUSE Rancher
- PersistentVolumes (PVs)
- PersistentVolumeClaims (PVCs)
- CSI
- iSCSI
- `jq`

## Sources Consulted
- Longhorn docs: Uninstall Longhorn: https://longhorn.io/docs/latest/deploy/uninstall/
- Longhorn docs: Settings (`Deleting Confirmation Flag`, `Default Data Path`): https://longhorn.io/docs/latest/references/settings/
- Longhorn docs: Delete Longhorn Volumes: https://longhorn.io/docs/latest/nodes-and-volumes/volumes/delete-volumes/
- Longhorn docs: Install Longhorn on Kubernetes (`open-iscsi`, `driver.longhorn.io`): https://longhorn.io/docs/latest/deploy/install/
- Longhorn docs: What is Longhorn? (`/dev/longhorn`, iSCSI frontend context): https://longhorn.io/docs/1.11.1/what-is-longhorn/
- Longhorn docs: Trim Filesystem (device-mapper context for encrypted volumes): https://longhorn.io/docs/latest/nodes-and-volumes/volumes/trim-filesystem/
- Longhorn official manifest CRDs (`settings.longhorn.io`, `volumes.longhorn.io`, short names): https://raw.githubusercontent.com/longhorn/longhorn/v1.11.1/deploy/longhorn.yaml
- Longhorn official uninstall job manifest: https://raw.githubusercontent.com/longhorn/longhorn/v1.11.1/uninstall/uninstall.yaml
- Longhorn Knowledge Base: Troubleshooting Orphan ISCSI Session Error: https://longhorn.io/kb/troubleshooting-orphan-iscsi-session-error/
- Kubernetes docs: Persistent Volumes reclaim policy (`Delete` vs `Retain`): https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes docs: `kubectl patch`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Helm docs: `helm uninstall`: https://helm.sh/docs/helm/helm_uninstall/
- Rancher docs: current app uninstall navigation (`Apps` → `Installed Apps`): https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/advanced-user-guides/compliance-scan-guides/uninstall-rancher-compliance

## Issues Found
- The PVC discovery commands assumed storage class names beginning with `longhorn`. I changed them to detect PVs provisioned by the Longhorn CSI driver (`driver.longhorn.io`), which is more accurate and does not break on custom Longhorn storage class names.
- The original `jq` filter could fail when `storageClassName` was absent. The revised commands avoid that failure mode.
- The post said deleting a PVC also deletes the underlying Longhorn volume. I corrected this to note that automatic cleanup only happens when the PV reclaim policy is `Delete`, and added the retained-PV cleanup step for `Retain`.
- The uninstallation setting comment referenced the unrelated `allow-recurring-job-while-volume-detached` setting. I corrected it to `deleting-confirmation-flag` and used the full Longhorn resource name `settings.longhorn.io`.
- The volume verification command used an ambiguous resource reference. I changed it to `volumes.longhorn.io`, matching the official Longhorn CRD.
- The Rancher UI path was updated to the current `Apps` → `Installed Apps` navigation used in Rancher documentation.
- The namespace/CRD cleanup flow was too aggressive and skipped the documented uninstall troubleshooting path. I updated it to inspect the `longhorn-uninstall` job, delete CRDs only if they remain, and remove leftover Longhorn webhook configurations when they block CRD deletion.
- The workload shutdown step implied that all workload types can be handled the same way. I clarified that some workload types need to be suspended or deleted rather than scaled.
- The post did not account for Longhorn volumes that remain outside Kubernetes PVC/PV management. I added a note to remove any remaining Longhorn volumes from the Longhorn UI before proceeding with uninstall.
- The device-mapper and iSCSI cleanup step was overly broad. I narrowed it to encrypted-volume device-mapper entries and targeted stale Longhorn iSCSI sessions instead of logging out all node iSCSI sessions.
- The CRD deletion pipeline used GNU-specific `xargs -r`. I replaced it with a portable shell loop.

## Review Notes
- The post now aligns with Longhorn’s documented Helm/Rancher uninstall flow. Clusters installed directly with `kubectl apply` use the separate `uninstall/uninstall.yaml` process described in the official Longhorn uninstall docs.
- Manual cleanup steps such as force-finalizing the namespace, deleting webhooks, or removing stale iSCSI sessions remain last-resort operational steps and should only be used when the standard uninstall flow does not complete cleanly.
