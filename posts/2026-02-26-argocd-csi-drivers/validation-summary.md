# Validation Summary: How to Manage CSI Drivers with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications and ApplicationSets
- Kubernetes CSI drivers
- AWS EBS CSI Driver
- AWS EFS CSI Driver
- Google Compute Engine Persistent Disk CSI Driver
- Secrets Store CSI Driver
- Kubernetes StorageClass and VolumeSnapshotClass resources
- Prometheus Operator ServiceMonitor resources

## Sources Consulted
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Helm values documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD multiple sources documentation: https://argo-cd.readthedocs.io/en/release-3.1/user-guide/multiple_sources/
- Argo CD resource health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD sync waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- AWS EKS Amazon EBS CSI Driver documentation: https://docs.aws.amazon.com/eks/latest/userguide/ebs-csi.html
- AWS EBS CSI Driver Helm chart values and templates: https://github.com/kubernetes-sigs/aws-ebs-csi-driver
- AWS EBS CSI Driver StorageClass parameter documentation: https://github.com/kubernetes-sigs/aws-ebs-csi-driver/blob/master/docs/parameters.md
- AWS EFS CSI Driver Helm chart values: https://github.com/kubernetes-sigs/aws-efs-csi-driver
- GKE Compute Engine persistent disk CSI Driver documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/gce-pd-csi-driver
- GKE regional persistent disk documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/regional-pd
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Secrets Store CSI Driver installation documentation: https://secrets-store-csi-driver.sigs.k8s.io/getting-started/installation.html

## Issues Found
- The AWS EBS StorageClass example used `fsType`, which is the old in-tree AWS EBS parameter style. Changed it to the CSI parameter `csi.storage.k8s.io/fstype`.
- The GCE regional persistent disk StorageClass set `replication-type: regional-pd` without topology constraints. Added `allowedTopologies` because GKE requires it for zonal clusters and recommends explicit zone constraints for dynamic regional PD provisioning.
- The ApplicationSet example referenced `values/{{name}}.yaml` while sourcing charts directly from remote Helm repositories. Updated the example to use Argo CD multi-source Applications and `$values/...` references for values files stored in a separate Git repository.
- The CRD sync options combined `Replace=true` with `ServerSideApply=true`; Argo CD documents that Replace takes precedence over Server-Side Apply, which undermines the stated purpose. Removed `Replace=true` from the general CRD handling snippet.
- The AWS EBS upgrade snippet used `controller.strategy`, but the chart value is `controller.updateStrategy`. Updated the field name.
- The standalone ServiceMonitor example assumes the AWS EBS metrics Service exists. Added a note to enable `controller.enableMetrics: true` in the EBS CSI Helm chart.
- The StorageClass troubleshooting snippet recommended `Replace=true` alone for immutable StorageClass updates. Updated it to `Force=true` with `Replace=true` to reflect Argo CD's delete/recreate behavior for immutable resources.

## Review Notes
- The pinned chart versions are older than current releases, but the post intentionally demonstrates pinned versions and the examples are version-consistent after correction.
- AWS now recommends EKS Pod Identities for EBS CSI driver permissions, while the IRSA annotation shown remains valid for clusters using IRSA.
