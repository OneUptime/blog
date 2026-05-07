# Validation Summary: How to Attach and Detach Longhorn Volumes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Longhorn
- Kubernetes
- PersistentVolumeClaims
- `kubectl`
- Longhorn custom resources (`volumes.longhorn.io`, `volumeattachments.longhorn.io`)

## Sources Consulted
- Longhorn VolumeAttachment documentation: https://longhorn.io/docs/latest/advanced-resources/volumeattachment/
- Longhorn Concepts documentation: https://longhorn.io/docs/latest/concepts/
- Longhorn Terminology documentation: https://longhorn.io/docs/latest/terminology/
- Longhorn source for `VolumeAttachment`: https://raw.githubusercontent.com/longhorn/longhorn-manager/master/k8s/pkg/apis/longhorn/v1beta2/volumeattachment.go
- Longhorn source for `Volume`: https://raw.githubusercontent.com/longhorn/longhorn-manager/master/k8s/pkg/apis/longhorn/v1beta2/volume.go
- Longhorn CRD manifest: https://raw.githubusercontent.com/longhorn/longhorn/v1.11.1/deploy/longhorn.yaml
- Kubernetes `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes `VolumeAttachment` API reference: https://kubernetes.io/zh-cn/docs/reference/kubernetes-api/config-and-storage-resources/volume-attachment-v1/

## Issues Found
- The post described Longhorn `VolumeAttachment` as a resource to create from scratch with an arbitrary name. I changed this to patch the existing per-volume `volumeattachments.longhorn.io` resource and add a manual attachment ticket, which matches Longhorn’s documented model and API types.
- The detachment example deleted the Longhorn `VolumeAttachment` resource entirely. I changed this to remove the manual attachment ticket with a JSON patch, which is how Longhorn’s attachment workflow clears manual requests.
- The manual-access section said “Using the Longhorn API via kubectl” while patching the Kubernetes custom resource. I corrected the wording and standardized the resource name to `volumes.longhorn.io`.
- The manual-access workflow stopped at `umount`, which does not detach the Longhorn volume. I added the required step to clear `spec.nodeID` so the volume is actually detached.
- The stuck-attachment guidance suggested deleting Kubernetes `VolumeAttachment` objects and restarting Longhorn manager. I replaced this with the documented Longhorn approach: inspect the Longhorn `VolumeAttachment` CR and remove only stale tickets after confirming nothing still needs them.
- Minor accuracy fixes: changed “mounted to any node” to “attached to any node”, updated the Longhorn UI navigation label to `Volumes`, corrected the Maintenance Mode description to “without enabling the frontend”, and removed the unsupported “Longhorn API” mention from the description.

## Review Notes
- The manual mount example applies to volumes using the block device frontend, which is why the post now qualifies the `/dev/longhorn/<volume>` path.
- Longhorn’s current CRD API version remains `longhorn.io/v1beta2`.
- The commands were validated against official documentation and Longhorn source/CRDs, but they were not executed against a live Kubernetes cluster in this workspace.
