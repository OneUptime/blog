# Validation Summary: How to Configure iSCSI Storage in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes Persistent Volumes and Persistent Volume Claims
- iSCSI
- CHAP authentication
- DM Multipath
- Helm
- democratic-csi

## Sources Consulted
- Kubernetes volume documentation: https://kubernetes.io/docs/concepts/storage/volumes/#iscsi
- Kubernetes PersistentVolume API reference: https://kubernetes.io/docs/reference/kubernetes-api/config-and-storage-resources/persistent-volume-v1/
- Kubernetes core API types (`ISCSIPersistentVolumeSource`): https://github.com/kubernetes/kubernetes/blob/v1.35.4/staging/src/k8s.io/api/core/v1/types.go
- Kubernetes iSCSI volume plugin implementation (`iscsi.go`): https://github.com/kubernetes/kubernetes/blob/v1.35.4/pkg/volume/iscsi/iscsi.go
- Kubernetes iSCSI helper implementation (`iscsi_util.go`): https://github.com/kubernetes/kubernetes/blob/v1.35.4/pkg/volume/iscsi/iscsi_util.go
- SUSE Rancher Manager iSCSI volumes guidance: https://documentation.suse.com/external-tree/en-us/cloudnative/rancher-manager/latest/en/cluster-admin/manage-clusters/persistent-storage/install-iscsi-volumes.html
- Open-iSCSI README and command examples: https://github.com/open-iscsi/open-iscsi
- democratic-csi repository README: https://github.com/democratic-csi/democratic-csi
- democratic-csi FreeNAS iSCSI example: https://github.com/democratic-csi/democratic-csi/blob/master/examples/freenas-iscsi.yaml
- Red Hat DM Multipath documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/configuring_device_mapper_multipath/index

## Issues Found
- The Rancher-specific node preparation was incomplete. On Rancher-provisioned RKE clusters, installing `open-iscsi` on the host is not enough because kubelet runs in a container. I added the required `services.kubelet.extra_binds` example and clarified that RKE2 and K3s only need the host packages.
- The manual verification command used `fdisk -l | grep -i iscsi`, which is not a reliable way to confirm an iSCSI session. I replaced it with `iscsiadm -m session -P 1`, which is documented by Open-iSCSI and directly shows active sessions.
- The CHAP example enabled `chapAuthDiscovery: true` but only supplied session CHAP keys in the Secret. Kubernetes reads different secret keys for discovery CHAP and session CHAP, so I removed discovery CHAP from the example to match the provided Secret data.
- The multipath instructions only covered Debian-based systems. I added the RHEL/CentOS package and `mpathconf` commands so the step is technically correct for the distributions referenced earlier in the post.
- The prerequisite pinned Rancher to `v2.6 or later`, which is no longer current and was not required by the rest of the guide. I changed it to a version-agnostic Rancher prerequisite.

## Review Notes
- The post uses Kubernetes' in-tree `iscsi` PersistentVolume source, which is still present in the current Kubernetes documentation reviewed for this validation.
- The `democratic-csi` example is a partial driver configuration example, not a full production-ready values file. Readers will still need to supply environment-specific chart settings such as storage classes and credentials.
