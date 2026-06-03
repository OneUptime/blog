# Validation Summary: How to Schedule Pods with Volume Topology Constraints

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes StorageClass, PersistentVolume, PersistentVolumeClaim, Pod, and StatefulSet APIs
- Kubernetes volume binding modes and allowed topologies
- Kubernetes local persistent volumes
- Kubernetes CSI drivers and VolumeSnapshot CRDs
- Amazon EBS CSI driver
- Google Kubernetes Engine regional persistent disks
- kubectl JSONPath and jq commands

## Sources Consulted
- Kubernetes Storage Classes documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes StorageClass API reference: https://kubernetes.io/docs/reference/kubernetes-api/storage/storage-class-v1/
- Kubernetes Volumes documentation, local volume section: https://kubernetes.io/docs/concepts/storage/volumes/#local
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes Volume Snapshots documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes kubectl JSONPath documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Amazon EKS EBS CSI driver documentation: https://docs.aws.amazon.com/eks/latest/userguide/ebs-csi.html
- Amazon EKS StorageClass documentation: https://docs.aws.amazon.com/eks/latest/userguide/create-storage-class.html
- Google Kubernetes Engine regional persistent disk documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/regional-pd

## Issues Found
- The post broadly stated that persistent volumes are created in availability zones. Updated the wording to clarify that this applies to many cloud block storage volumes and topology-constrained volumes, not every PersistentVolume type.
- The AWS EBS examples used the removed in-tree `kubernetes.io/aws-ebs` provisioner. Replaced it with the current EBS CSI provisioner `ebs.csi.aws.com`.
- The first AWS topology-aware StorageClass used the generic zone key with the EBS CSI provisioner. Updated it to `topology.ebs.csi.aws.com/zone`, matching the EBS CSI topology key used in Kubernetes documentation.
- The PostgreSQL StatefulSet example omitted required PostgreSQL authentication configuration. Added a minimal `POSTGRES_PASSWORD` environment variable so the container can start in an example deployment.
- The local-volume StatefulSet requested three replicas but only defined one static local PersistentVolume. Added two additional local PV examples so there is one PV per replica.
- The local-volume StatefulSet template lacked labels matching `.spec.selector.matchLabels`, which would make the StatefulSet invalid. Added `metadata.labels.app: cache` to the pod template.
- The monitoring commands read PV zones from PV metadata labels, which are not the reliable source for topology-constrained PV placement. Updated them to read zone values from PV `spec.nodeAffinity`.
- Several commands piped Kubernetes JSONPath map output into `jq`, but kubectl JSONPath prints objects using string formatting rather than JSON. Updated those commands to use `-o json | jq`.
- Troubleshooting commands used unquoted angle-bracket placeholders directly in shell commands. Replaced them with shell variables so the examples do not get interpreted as redirections.
- The snapshot section described snapshots themselves as topology-aware. Updated the wording to clarify that snapshots are created through CSI snapshot APIs and topology is applied when restoring through a topology-aware StorageClass.

## Review Notes
- `WaitForFirstConsumer` and `allowedTopologies` usage is accurate. Kubernetes documentation notes that `allowedTopologies` is often unnecessary with `WaitForFirstConsumer`, but it remains valid when an operator wants to restrict provisioning to specific zones.
- Local volumes are static in Kubernetes and require one suitable PV per consumed PVC; the updated example reflects this.
- VolumeSnapshot APIs are CRDs and require a CSI driver with snapshot support plus the snapshot controller components installed in the cluster.
- `kubectl` was not installed in the local environment, so command verification was performed against official kubectl documentation rather than local CLI help.
