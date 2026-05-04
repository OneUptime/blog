# Validation Summary: How to Configure Longhorn Network File System Server

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Longhorn (RWX volumes, Share Manager)
- Kubernetes (StorageClass, PVC, Deployment, PriorityClass, taint/toleration)
- NFS-Ganesha / NFSv4.1
- Helm (Longhorn chart)
- kubectl

## Sources Consulted
- Longhorn RWX Volumes documentation: https://longhorn.io/docs/latest/nodes-and-volumes/volumes/rwx-volumes/
- Longhorn Settings Reference: https://longhorn.io/docs/latest/references/settings/
- Longhorn Helm chart values: https://github.com/longhorn/longhorn/blob/master/chart/values.yaml
- longhorn-manager source (label constants): https://github.com/longhorn/longhorn-manager/blob/master/types/types.go
- Longhorn issue on `intr` deprecation: https://github.com/longhorn/longhorn/issues/6599
- Announcing Longhorn v1.1.0 (RWX support): https://longhorn.io/blog/longhorn-v1.1.0/
- Red Hat note on `intr` no-op since RHEL 6: https://access.redhat.com/solutions/157873

## Issues Found

1. **NFS server software claim was incorrect.** The post said the Share Manager "Uses in-kernel NFS server (or NFS-Ganesha depending on configuration)". Longhorn's Share Manager always uses NFS-Ganesha (userspace) — there is no in-kernel option. Updated the bullet to "Runs an NFS-Ganesha userspace NFS server".

2. **Share Manager pod placement claim was incorrect.** The post said the Share Manager pod "Runs on the same node as the Longhorn volume it serves" and reiterated this in the conclusion. According to Longhorn docs, Share Manager pods are scheduled by Kubernetes and configurable via `shareManagerNodeSelector`, `allowedTopologies`, and `shareManagerTolerations` StorageClass parameters; they are not pinned to the volume's node. Updated the bullet and the conclusion accordingly.

3. **`share-manager-image` is not a real Longhorn setting.** The post showed `kubectl get/patch settings.longhorn.io share-manager-image`, which does not exist in the Longhorn settings reference. The image is configured via the Helm chart values `image.longhorn.shareManager.repository` and `image.longhorn.shareManager.tag`. Replaced the section's commands with a `helm upgrade --set ...` example.

4. **Tolerations section was misleading.** The original heading "Configuring Share Manager Tolerations" implied the `taint-toleration` setting was Share Manager-specific, but it is a global setting that affects all Longhorn system-managed components. Renamed the heading to "Configuring Tolerations for Longhorn Components", added clarification, and pointed to `shareManagerTolerations` (StorageClass parameter) for Share-Manager-only scoping.

5. **`intr` mount option is deprecated.** It has been a no-op since Linux kernel 2.6.25 and triggers `Deprecated parameter 'intr'` kernel warnings on modern systems (tracked in longhorn/longhorn#6599). Removed it from the example `mountOptions` list.

6. **Wrong pod label selector.** The post used `-l app=longhorn-share-manager`, which does not match any pods. Verified against `longhorn-manager/types/types.go` that the correct label is `longhorn.io/component=share-manager`. Replaced all five occurrences (in `kubectl get`, `kubectl logs`, deletion, recovery watch, and `nfsstat` exec).

7. **Priority class default and value were misleading.** The post used `system-node-critical`, which is a built-in Kubernetes PriorityClass reserved for cluster add-ons and is not the documented default. Longhorn installs and defaults to `longhorn-critical`. Updated the example value and added a note that custom PriorityClasses must already exist in the cluster before patching.

## Review Notes

- The `numberOfReplicas: "3"` and `fsType: "ext4"` parameters in the StorageClass are valid Longhorn parameters; for RWX volumes, the StorageClass also accepts `nfsOptions` to override NFS-Ganesha export options server-side (out of scope for this post but worth noting for future revisions).
- NFSv4.2 is also supported via custom `nfsOptions` in newer Longhorn versions; the post correctly focuses on the 4.1 default.
- The `share-manager-image:v1.7.0` example tag in the Helm command is illustrative — readers should match the tag to their Longhorn release.
- The `kubectl exec -it` calls technically require a TTY; they will still work in interactive shells but may need `-i` only when piped into automation.
