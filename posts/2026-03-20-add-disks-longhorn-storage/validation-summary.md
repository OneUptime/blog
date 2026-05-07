# Validation Summary: How to Add Additional Disks for Longhorn Storage

## Status
validated

## Post Type
Guide

## Technologies Covered
- Longhorn
- Kubernetes
- `kubectl`
- Linux block devices and filesystems
- `/etc/fstab`

## Sources Consulted
- Longhorn Multiple Disk Support: https://longhorn.io/docs/latest/nodes-and-volumes/nodes/multidisk/
- Longhorn Configuring Defaults for Nodes and Disks: https://longhorn.io/docs/latest/nodes-and-volumes/nodes/default-disk-and-node-config/
- Longhorn Settings Reference: https://longhorn.io/docs/latest/references/settings/
- Longhorn V2 Data Engine Quick Start: https://longhorn.io/docs/latest/v2-data-engine/quick-start/
- Kubernetes `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes guide for patching API objects: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/update-api-object-kubectl-patch/

## Issues Found
- The post mixed whole-disk and partitioned-device paths after presenting both formatting options. The mount and `/etc/fstab` examples used `/dev/sdb` unconditionally, which would be wrong if the reader created `/dev/sdb1`. I changed those examples to use a `DEVICE` variable so the commands remain correct in either case.
- The post described the workflow generically for Longhorn disks, but the commands shown are specifically for filesystem-type disks. I scoped the introduction accordingly and made `Disk Type: Filesystem` explicit in the UI and `node.longhorn.io` examples so the guide does not get confused with Longhorn V2 block-type disks.
- The Longhorn node manifests omitted `diskType: filesystem` from the `spec.disks` entries. I added it to the full YAML example and the merge-patch example to match current Longhorn disk configuration.
- The note above the exported node manifest said to "GET and PATCH instead" even though the example actually exported, edited, and applied the existing resource. I corrected the note so it accurately describes the workflow being shown.
- The section titled "Adding Disks at Scale with DaemonSet" did not contain a DaemonSet at all. I renamed it to "Preparing Disks at Scale" and adjusted the lead-in text so it matches the content.

## Review Notes
- The post is now technically accurate for filesystem-type Longhorn disks mounted on the host. It is not a guide for V2 `block-type` disks; current Longhorn docs explicitly treat those differently and do not have you format and mount them first.
- The merge-patch example is appropriate for this CRD. Kubernetes does not support strategic merge patch for custom resources, so `--type merge` is the correct patch type to demonstrate.
