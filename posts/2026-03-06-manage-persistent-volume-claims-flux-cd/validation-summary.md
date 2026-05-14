# Validation Summary: How to Manage PersistentVolumeClaims with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD Kustomizations
- Kubernetes PersistentVolumeClaims and PersistentVolumes
- Kubernetes StorageClasses
- CSI drivers
- AWS EBS CSI driver
- CSI VolumeSnapshots
- Kustomize overlays and patches
- Prometheus Operator PrometheusRule alerts

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes PersistentVolume and PersistentVolumeClaim documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes VolumeSnapshot documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Amazon EKS StorageClass parameters documentation for the AWS EBS CSI driver: https://docs.aws.amazon.com/eks/latest/userguide/create-storage-class.html
- PrometheusRule API documentation: https://docs.redhat.com/en/documentation/openshift_container_platform/4.21/html/monitoring_apis/prometheusrule-monitoring-coreos-com-v1

## Issues Found
- The prerequisites mentioned a CSI driver but did not state that the VolumeSnapshot examples require the snapshot CRDs, snapshot controller, and a CSI driver with snapshot support. Added that prerequisite because Kubernetes documents VolumeSnapshots as separate CRDs/controllers and driver-dependent functionality.
- The `standard-hdd` StorageClass used AWS EBS `type: gp2`, which is a general-purpose SSD EBS volume type, not HDD. Renamed it to `standard-gp2` and updated the matching Kustomize overlay reference.
- The Deployment comment implied `ReadWriteOnce` means a single replica. Kubernetes defines `ReadWriteOnce` as writable by a single node, and multiple pods on the same node can still access it. Reworded the comment as a conservative default for single-node-attached block volumes such as EBS.
- The volume expansion wording used "resize" generically. Kubernetes only supports expanding PVCs by requesting a larger size, so the wording was changed to "expand" / "expansion".

## Review Notes
The examples use current Kubernetes APIs for the stated Kubernetes version range. The Flux prune annotation and Kustomization `prune` behavior match Flux documentation. Snapshot and storage behavior remains CSI-driver-specific, so operators should verify exact capabilities and parameters for their installed CSI driver.
