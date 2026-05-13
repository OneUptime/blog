# Validation Summary: How to Organize Storage Classes Before PVCs in Flux Repository

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux Kustomization resources and dependency ordering
- Kubernetes StorageClass resources
- Kubernetes PersistentVolumeClaims
- Kubernetes StatefulSets
- AWS EBS CSI driver
- AWS EFS CSI driver
- flux CLI
- kubectl CLI

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `flux get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes PersistentVolume and PersistentVolumeClaim documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Amazon EKS StorageClass documentation for EBS parameters: https://docs.aws.amazon.com/eks/latest/userguide/create-storage-class.html
- AWS EBS CSI driver documentation: https://github.com/kubernetes-sigs/aws-ebs-csi-driver
- AWS EFS CSI driver documentation: https://github.com/kubernetes-sigs/aws-efs-csi-driver

## Issues Found
- The infrastructure Flux Kustomization set `wait: true` together with explicit `healthChecks`. Flux documents that when `spec.wait` is `true`, `spec.healthChecks` is ignored. Removed `wait: true` from that snippet so the listed EBS CSI DaemonSet and Deployment health checks are the checks Flux uses before dependent Kustomizations proceed.

## Review Notes
- The StorageClass examples use current `storage.k8s.io/v1` APIs, valid AWS EBS/EFS CSI provisioners, and valid binding modes.
- The EBS example uses `ebs.csi.aws.com`, which is correct for the AWS EBS CSI driver. EKS Auto Mode uses a different provisioner, `ebs.csi.eks.amazonaws.com`, but this post is about CSI drivers rather than EKS Auto Mode.
- `WaitForFirstConsumer` is appropriate for topology-aware CSI storage such as EBS. For PVCs using `WaitForFirstConsumer`, Kubernetes provisioning happens when a consuming Pod is scheduled.
