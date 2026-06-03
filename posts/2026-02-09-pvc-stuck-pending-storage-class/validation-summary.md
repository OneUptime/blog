# Validation Summary: How to Fix K8s PersistentVolumeClaim Stuck in Pending Due to Storage Class

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes PersistentVolumeClaims and PersistentVolumes
- Kubernetes StorageClasses and dynamic provisioning
- CSI storage provisioners
- AWS EBS CSI driver and EBS quotas
- GCE PD CSI driver
- Longhorn
- Rook-Ceph
- NFS CSI driver
- kubectl
- AWS CLI
- Google Cloud CLI
- Prometheus alert rules
- kube-state-metrics / Kubernetes metrics

## Sources Consulted
- Kubernetes StorageClasses documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes StorageClass API reference: https://kubernetes.io/docs/reference/kubernetes-api/storage/storage-class-v1/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics
- Amazon EKS StorageClass documentation: https://docs.aws.amazon.com/eks/latest/userguide/create-storage-class.html
- Amazon EBS CSI driver documentation: https://docs.aws.amazon.com/eks/latest/userguide/ebs-csi.html
- Amazon EBS quotas documentation: https://docs.aws.amazon.com/ebs/latest/userguide/ebs-resource-quotas.html
- AWS CLI get-service-quota reference: https://docs.aws.amazon.com/cli/latest/reference/service-quotas/get-service-quota.html
- Google Cloud CLI project-info describe reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/project-info/describe
- Kubernetes CSI NFS driver parameters: https://github.com/kubernetes-csi/csi-driver-nfs/blob/master/docs/driver-parameters.md

## Issues Found
- The AWS EBS StorageClass examples used the removed in-tree provisioner `kubernetes.io/aws-ebs`. Updated them to the current AWS EBS CSI provisioner `ebs.csi.aws.com`.
- The example `kubectl get storageclass` output showed a missing StorageClass as a table row. Removed that impossible row and left the explanatory comment that the requested `fast-ssd` class is absent.
- The PVC update flow implied `kubectl apply` could change an existing PVC's `storageClassName`. Added deletion of the pending PVC before applying the corrected PVC manifest.
- The EBS CSI controller log command used a pod name pattern that commonly does not match the current Deployment-managed controller pods. Updated it to use `kubectl logs deployment/ebs-csi-controller` with `--tail=50`.
- The RBAC example used a specific ClusterRole name that varies by installation. Changed it to list EBS CSI ClusterRoles instead of describing a possibly nonexistent role.
- The AWS quota example used the gp2 quota code while the StorageClass example provisions gp3 volumes. Updated the quota code to the gp3 storage quota and changed the current usage command to sum gp3 volume sizes.
- The NFS CSI StorageClass example omitted `subDir`, which is commonly used by the CSI NFS dynamic provisioner to create per-claim subdirectories. Added a per-PVC `subDir` parameter.
- The Prometheus alert named a broad Kubernetes storage operation metric as PV provisioning-specific. Renamed the alert and summary to describe storage operation failures accurately.

## Review Notes
- The article remains provider-dependent in several areas, especially CSI driver pod names, RBAC object names, and quota names. The examples are now technically plausible, but production clusters should verify the exact driver installation and cloud-provider quota names in their own environment.
