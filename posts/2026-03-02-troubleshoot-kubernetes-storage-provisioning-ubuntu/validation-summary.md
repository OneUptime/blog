# Validation Summary: How to Troubleshoot Kubernetes Storage Provisioning on Ubuntu

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Kubernetes (PersistentVolumeClaim, PersistentVolume, StorageClass)
- kubectl CLI
- Container Storage Interface (CSI) drivers
- Rancher local-path-provisioner
- Longhorn distributed storage
- Ubuntu host operations (df, du, journalctl, ssh)
- Kubelet (systemd unit)

## Sources Consulted
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes Storage Classes documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes CSI documentation: https://kubernetes-csi.github.io/docs/
- Kubernetes Volume Modes / Access Modes: https://kubernetes.io/docs/concepts/storage/persistent-volumes/#access-modes
- Rancher local-path-provisioner GitHub: https://github.com/rancher/local-path-provisioner
- Longhorn documentation: https://longhorn.io/docs/
- kubectl reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Node Conditions / Taints: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/

## Issues Found
- "Longhorn with RWXM support" — "RWXM" is not a standard Kubernetes access mode abbreviation. The four defined access modes are ReadWriteOnce (RWO), ReadOnlyMany (ROX), ReadWriteMany (RWX), and ReadWriteOncePod (RWOP). Changed to "RWX" to match the surrounding context which already correctly uses "RWX" for ReadWriteMany.

## Review Notes
- The local-path-provisioner version pinned in the install command (v0.0.26) is a real released tag. Readers may want to pick a newer tag from the upstream releases page when running this today.
- The default local-path-provisioner host path (`/opt/local-path-provisioner`) is configurable; the post correctly calls it the default.
- The label selectors used for CSI driver pods (`app=csi-driver`, `app=csi-node`, `app=csi-controller`) are common conventions but not universal — different CSI distributions (AWS EBS, GCP PD, Longhorn, Rook/Ceph) use different labels. The post is presented as examples to grep for, which is reasonable.
- The `kubectl patch pv ... '{"spec":{"claimRef": null}}'` form to recycle a Released PV is widely used and works. Some operators alternatively scrub only `claimRef.uid`/`claimRef.resourceVersion`; either is acceptable.
- The DiskPressure narrative is accurate: the kubelet adds a `node.kubernetes.io/disk-pressure:NoSchedule` taint that blocks new scheduling (and evicts existing pods per QoS).
- All kubectl subcommands, resource names (csidriver, csinodes, volumeattachment, node.longhorn.io, volumes), and Longhorn service name/port (`longhorn-frontend` on 80) verify against current documentation.
