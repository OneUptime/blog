# Validation Summary: How to Troubleshoot Longhorn Volume Attachment Issues

## Status
validated

## Post Type
Guide

## Technologies Covered
- Longhorn
- Kubernetes
- Kubernetes CSI / `VolumeAttachment`
- iSCSI / `open-iscsi`
- `kubectl`

## Sources Consulted
- Longhorn installation requirements: https://longhorn.io/docs/latest/deploy/install/
- Longhorn volume attachment workflow and troubleshooting: https://longhorn.io/docs/1.9.1/advanced-resources/volumeattachment/
- Longhorn volume creation and scheduling failure behavior: https://longhorn.io/docs/latest/nodes-and-volumes/volumes/create-volumes/
- Longhorn storage class parameters, including `nodeSelector`: https://longhorn.io/docs/latest/references/storage-class-parameters/
- Longhorn settings reference: https://longhorn.io/docs/latest/references/settings/
- Kubernetes node debugging with `kubectl debug`: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes `kubectl debug` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Longhorn manager source for CSI deployment names: https://github.com/longhorn/longhorn-manager/blob/master/types/deploy.go
- Longhorn manager source for CSI deployment labels: https://github.com/longhorn/longhorn-manager/blob/master/csi/deployment.go
- Longhorn manager source for detach behavior and attachment tickets: https://github.com/longhorn/longhorn-manager/blob/master/manager/volume.go

## Issues Found
- The post advised deleting the Kubernetes `VolumeAttachment` object as a fix for stuck attachments. I changed this to inspecting and editing Longhorn’s `volumeattachment.longhorn.io` attachment tickets, which is the documented Longhorn troubleshooting path for volumes stuck in `Attaching` or `Detaching`.
- The expected CSI pod names were incorrect. I changed `longhorn-csi-attacher`, `longhorn-csi-provisioner`, `longhorn-csi-resizer`, and `longhorn-csi-snapshotter` to the actual deployment names `csi-attacher`, `csi-provisioner`, `csi-resizer`, and `csi-snapshotter`, and included `longhorn-csi-plugin`.
- The `kubectl logs` example for `longhorn-manager` omitted `-c longhorn-manager`. Current `longhorn-manager` pods are multi-container pods, so the original command would fail without the container name.
- The iSCSI troubleshooting commands used unprivileged `kubectl debug` examples that do not reliably inspect or modify host services and kernel modules. I replaced them with host-level checks for `iscsid` and `iscsi_tcp`, and clarified that they should run via SSH or a privileged debug pod.
- The node-selector troubleshooting step queried `default-longhorn-static-storage-class`, which is not the relevant setting for Longhorn volume scheduling. I changed this to inspect the PVC’s actual StorageClass and the Longhorn node CR.
- The pod event example used `attachdetach` instead of `attachdetach-controller`. I corrected the example to match current Kubernetes event wording.
- The final iSCSI best-practice note was incomplete. I updated it to include the documented `open-iscsi` prerequisite in addition to `iscsid` and `iscsi_tcp`.
- The node-crash best-practice line was more specific than the current docs support. I changed it to a safer recommendation to wait for recovery when possible and inspect Longhorn attachment tickets before manual cleanup.

## Review Notes
The corrected post matches current Longhorn 1.11.x documentation and upstream Longhorn manager behavior. The Longhorn `VolumeAttachment` troubleshooting reference currently lives under the 1.9.1 docs path, but the attachment-ticket model and related commands are still reflected in current Longhorn source. Node-level iSCSI checks remain distro-dependent, so the post now correctly frames them as host commands rather than generic in-cluster container commands.
