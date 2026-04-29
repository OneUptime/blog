# Validation Summary: How to Configure Longhorn Network File System Server - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Longhorn
- Kubernetes
- NFSv4.1
- Longhorn RWX volumes
- Longhorn Share Manager
- StorageClass configuration
- SUSE Rancher / Longhorn chart values

## Sources Consulted
- Longhorn RWX volumes: https://longhorn.io/docs/latest/nodes-and-volumes/volumes/rwx-volumes/
- Longhorn settings reference: https://longhorn.io/docs/latest/references/settings/
- Longhorn installation requirements: https://longhorn.io/docs/latest/deploy/install/
- Longhorn chart values (`image.longhorn.shareManager`): https://raw.githubusercontent.com/longhorn/longhorn/v1.11.1/chart/values.yaml
- Longhorn manager setting definitions (`guaranteed-instance-manager-cpu`): https://raw.githubusercontent.com/longhorn/longhorn-manager/v1.11.1/types/setting.go
- Longhorn share manager NFS server implementation: https://raw.githubusercontent.com/longhorn/longhorn-share-manager/v1.11.1/pkg/server/nfs/nfs_server.go
- Longhorn share manager export implementation: https://raw.githubusercontent.com/longhorn/longhorn-share-manager/v1.11.1/pkg/server/nfs/export.go
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- `showmount(8)` manual page: https://man7.org/linux/man-pages/man8/showmount.8.html

## Issues Found
- The post stated that each RWX PVC gets its own share-manager pod. I corrected this to match Longhorn's documented behavior: the dedicated share-manager pod exists per RWX volume that is actively in use, and each active RWX volume also has a corresponding Service.
- The StorageClass example and mount-options section recommended `hard` mounts as the default behavior. I updated the example and table to align with Longhorn's documented default `nfsOptions` behavior, which uses `softerr,timeo=600,retrans=5` with NFSv4.1.
- The section titled "Configure Share Manager Pod Resources" used the `guaranteed-instance-manager-cpu` setting, which applies to instance manager pods rather than share managers. I replaced it with supported share-manager placement controls: `shareManagerNodeSelector` and `shareManagerTolerations`.
- The `kubectl patch setting.longhorn.io share-manager-image` example was incorrect. I replaced it with the supported Longhorn chart/app values configuration for `image.longhorn.shareManager`.
- The monitoring section used `exportfs -v`, but Longhorn share manager runs NFS-Ganesha and generates its export configuration in `/tmp/vfs.conf`. I replaced the command with inspection of the generated config.
- The troubleshooting section used `showmount -e` against a share-manager pod and recommended force-unmounting kubelet-managed paths. I replaced those commands with NFSv4-appropriate checks for share manager state, pod events, kernel NFS errors, and active mounts.
- I added the missing requirement that node hostnames must be unique across the cluster for Longhorn's NFS lock recovery behavior.

## Review Notes
- The post is technically consistent with current Longhorn documentation as of 2026-04-29 after the corrections above.
- The image example intentionally uses `<LONGHORN_VERSION>` rather than a hardcoded tag so the guidance stays correct when matched to the installed Longhorn release.
- The guide describes generic filesystem-based RWX volumes backed by Longhorn share-manager pods, not migratable RWX block-mode volumes.
