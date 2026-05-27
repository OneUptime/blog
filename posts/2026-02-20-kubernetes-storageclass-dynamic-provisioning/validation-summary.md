# Validation Summary: How to Use Kubernetes StorageClass for Dynamic Volume Provisioning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes StorageClass
- PersistentVolume and PersistentVolumeClaim
- Dynamic volume provisioning
- CSI drivers
- AWS EBS CSI driver
- GKE Persistent Disk CSI driver
- Kubernetes NFS CSI driver
- kubectl

## Sources Consulted
- Kubernetes Storage Classes documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes Dynamic Volume Provisioning documentation: https://kubernetes.io/docs/concepts/storage/dynamic-provisioning
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes Change the Default StorageClass task: https://kubernetes.io/docs/tasks/administer-cluster/change-default-storage-class/
- Kubernetes Change the Reclaim Policy of a PersistentVolume task: https://kubernetes.io/docs/tasks/administer-cluster/change-pv-reclaim-policy
- Kubernetes kubectl annotate reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs
- Amazon EKS Create a StorageClass documentation: https://docs.aws.amazon.com/eks/latest/userguide/create-storage-class.html
- Google Kubernetes Engine regional Persistent Disk documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/regional-pd
- Google Kubernetes Engine Persistent Disk CSI driver documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/gce-pd-csi-driver
- Kubernetes CSI NFS driver documentation: https://github.com/kubernetes-csi/csi-driver-nfs/blob/master/docs/driver-parameters.md

## Issues Found
- The introduction said PVs are created automatically when a PVC is submitted. This is only true for `Immediate` binding; with `WaitForFirstConsumer`, provisioning is delayed until a consuming pod is scheduled. Updated the wording to account for the configured binding mode.
- The GCP regional Persistent Disk StorageClass used `replication-type: regional-pd` without topology constraints. GKE documentation says regional PD dynamic provisioning should specify `allowedTopologies`, except in eligible regional-cluster cases where GKE can infer zones. Added `allowedTopologies` to make the example generally correct.
- The post stated that `WaitForFirstConsumer` is almost always the right choice and ensures same-zone placement. Kubernetes documents this behavior for topology-constrained storage when the CSI driver supports topology. Updated the wording to include that caveat.
- The command for marking `gp3-ssd` as default lacked `--overwrite`. `kubectl annotate` fails when updating an existing annotation unless `--overwrite` is set. Added `--overwrite`.
- The post said PVCs fail if multiple StorageClasses are marked default. Kubernetes uses the most recently created default StorageClass in that case. Updated the explanation.

## Review Notes
The remaining YAML examples use current Kubernetes `storage.k8s.io/v1` StorageClass and `v1` PersistentVolumeClaim APIs. AWS EBS CSI parameters such as `type`, `encrypted`, and `iopsPerGB` are valid, and the NFS CSI provisioner and `server` / `share` parameters match the upstream driver documentation. `kubectl` was not installed locally, so CLI verification was done against the official generated Kubernetes command reference.
