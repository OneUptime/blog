# Validation Summary: How to Troubleshoot Longhorn Node Not Schedulable Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Longhorn
- Kubernetes
- `kubectl`
- Longhorn custom resources (`node.longhorn.io`, `volume`, `setting`)
- Kubernetes taints and tolerations

## Sources Consulted
- Longhorn Scheduling: https://longhorn.io/docs/latest/nodes-and-volumes/nodes/scheduling/
- Longhorn Settings Reference: https://longhorn.io/docs/latest/references/settings/
- Longhorn Storage Tags: https://longhorn.io/docs/latest/nodes-and-volumes/nodes/storage-tags/
- Longhorn Node Conditions: https://longhorn.io/docs/latest/nodes-and-volumes/nodes/node-conditions/
- Longhorn Create Volumes: https://longhorn.io/docs/latest/nodes-and-volumes/volumes/create-volumes/
- Kubernetes `kubectl debug`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes JSONPath support: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes `kubectl delete`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/

## Issues Found
- The node disk-usage command used `kubectl debug node/...` but ran `df` against `/var/lib/longhorn` inside the debug container, not the host node filesystem. I changed it to `chroot /host df -h /var/lib/longhorn`, which matches Kubernetes node-debug behavior.
- The post said Longhorn defaults to `200%` storage over-provisioning. Current Longhorn settings documentation lists the default as `100%`, so I corrected that statement while keeping `200` as an example tuning value.
- The post referenced `storage-minimum-device-size-mb`, which is not a current Longhorn setting for replica scheduling. I replaced it with `storage-minimal-available-percentage`, which is the documented scheduling-related setting.
- The disk-condition guidance described `diskPressure: true` as a field to inspect. Longhorn exposes disk schedulability through `node.status.diskStatus[*].conditions.Schedulable`, with reasons such as `DiskPressure`, so I corrected that explanation.
- The tag-mismatch section discussed node and disk tags but only checked `spec.nodeSelector` and node tags. I added the documented `spec.diskSelector` check and a disk-tag inspection command for the Longhorn node resource.
- The taint section implied the `taint-toleration` setting covered all Longhorn components. Current Longhorn documentation says it only applies to system-managed components, so I added that clarification and noted that user-deployed components need Helm or manifest changes.

## Review Notes
Validated against current Longhorn documentation available on April 29, 2026 (latest docs line 1.11.x). Older Longhorn releases may differ slightly in defaults, UI wording, or setting availability.
