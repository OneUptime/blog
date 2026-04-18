# Validation Summary: How to Troubleshoot Longhorn Volume Attachment Issues - Part 3

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Longhorn (distributed block storage for Kubernetes)
- Kubernetes (kubectl, PVCs, PVs, VolumeAttachments, CSI)
- iSCSI / iscsid (open-iscsi)
- containerd / crictl
- systemd

## Sources Consulted
- Longhorn CRD definitions: https://github.com/longhorn/longhorn/blob/master/chart/templates/crds.yaml
- Longhorn deployment manifests: https://github.com/longhorn/longhorn/blob/master/deploy/longhorn.yaml
- Longhorn settings (`types/setting.go`): https://github.com/longhorn/longhorn-manager/blob/master/types/setting.go
- Longhorn CSI deployment util / `types/deploy.go`: https://github.com/longhorn/longhorn-manager
- Longhorn v1.5.0 changelog (instance-manager pod consolidation): https://github.com/longhorn/longhorn/releases
- Kubernetes `kubectl debug node` documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Longhorn troubleshooting guides: https://longhorn.io/docs/

## Issues Found
1. **Non-existent CRD `instances.longhorn.io`** (Issue 1 diagnostic block). Longhorn does not expose an `instances` CRD. The relevant resources are `engines.longhorn.io`, `replicas.longhorn.io`, and `instancemanagers.longhorn.io`. Since the comment says "Check if the engine is starting", changed to `kubectl get engines.longhorn.io -n longhorn-system | grep <volume-name>`.
2. **Incorrect `kubectl debug node` recipe for checking host iscsid** (Issue 3). The default debug pod is unprivileged and runs systemctl against the pod's own (non-existent) systemd, not the host's. Updated the command to use `--profile=sysadmin` and added `chroot /host` before invoking `systemctl status iscsid`, which is the documented Kubernetes pattern for host-level debugging.

## Review Notes
- The `kubectl get pods -n longhorn-system | grep engine` check in Issue 7 is mostly historical — since Longhorn v1.5.0, engine and replica processes run inside consolidated `instance-manager-*` pods rather than dedicated engine pods. The grep won't usually match anything in current versions, but the subsequent guidance to inspect engine events/logs and the use of `--previous` is still valid when an engine pod does exist (e.g., older Longhorn deployments). Left as-is to remain compatible with both pre- and post-v1.5 deployments.
- `/var/lib/longhorn/replicas/` is the correct default replica directory; each replica is stored in a subdirectory beneath it, which the `ls -la` command will reveal.
- All other CRD names, label selectors (`app=csi-attacher`, `app=csi-provisioner`, `app=longhorn-manager`), the deployment name `longhorn-driver-deployer`, and the setting `storage-minimal-available-percentage` were verified accurate.
