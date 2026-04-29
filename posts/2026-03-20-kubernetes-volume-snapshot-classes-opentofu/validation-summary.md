# Validation Summary: How to Create Kubernetes Volume Snapshot Classes with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Kubernetes VolumeSnapshot API
- CSI snapshot controller / external-snapshotter
- OpenTofu / Terraform-style HCL
- Helm
- Google Kubernetes Engine (GKE) Persistent Disk CSI driver
- AWS EBS CSI driver

## Sources Consulted
- Kubernetes Volume Snapshot Classes: https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/
- Kubernetes Volume Snapshots: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes Persistent Volumes: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes CSI Snapshot Controller docs: https://kubernetes-csi.github.io/docs/snapshot-controller.html
- Google Cloud, Back up Persistent Disk storage using volume snapshots: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/backup-pd-volume-snapshots
- Amazon EKS, Enable snapshot functionality for CSI volumes: https://docs.aws.amazon.com/eks/latest/userguide/csi-snapshot-controller.html
- AWS EBS CSI driver tagging docs: https://github.com/kubernetes-sigs/aws-ebs-csi-driver/blob/master/docs/tagging.md
- AWS EBS CSI driver snapshot class example: https://github.com/kubernetes-sigs/aws-ebs-csi-driver/blob/master/examples/kubernetes/snapshot/manifests/classes/snapshotclass.yaml
- HashiCorp Kubernetes provider `kubernetes_manifest` docs: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/docs/resources/manifest.md
- HashiCorp Kubernetes provider PVC resource docs/source: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/docs/resources/persistent_volume_claim_v1.md
- HashiCorp Kubernetes provider PVC schema/source: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/kubernetes/schema_persistent_volume_claim.go
- Piraeus snapshot-controller chart README: https://github.com/piraeusdatastore/helm-charts/blob/main/charts/snapshot-controller/README.md
- Piraeus snapshot-controller chart metadata: https://github.com/piraeusdatastore/helm-charts/blob/main/charts/snapshot-controller/Chart.yaml

## Issues Found
- The Overview overstated OpenTofu's role. I changed it to reflect that OpenTofu manages Kubernetes resources, while the CSI snapshot controller performs the actual snapshot create/delete operations.
- Step 1 pinned the Piraeus `snapshot-controller` chart to `2.1.0`, which was outdated as of April 29, 2026. I updated it to `5.0.3` and corrected the step title/comment to reflect that the chart installs the snapshot controller as well as the CRDs.
- The post implied the Helm release and `kubernetes_manifest` custom resources could be planned together. The official Kubernetes provider requires API access and CRD schemas during planning, so I added a note that the snapshot controller/CRDs must be applied first before planning `VolumeSnapshotClass` and `VolumeSnapshot` resources.
- The `depends_on` in the GKE `VolumeSnapshotClass` example was misleading because it does not solve the provider's plan-time CRD requirement. I removed it.
- The AWS `VolumeSnapshotClass` example was not marked as default, while the later `VolumeSnapshot` example assumed a class choice. I added the default-class annotation and switched the `VolumeSnapshot` example to rely on the default `VolumeSnapshotClass` for the PVC's CSI driver, which matches Kubernetes behavior.
- The restore example used `kubernetes_persistent_volume_claim_v1` with a `data_source` block. That block is not supported by the typed PVC resource in the official Kubernetes provider. I replaced the restore example with a valid `kubernetes_manifest` `PersistentVolumeClaim` that uses `spec.dataSource` with `VolumeSnapshot`.

## Review Notes
- `storage-locations` for GKE Persistent Disk snapshots is valid and is driver-specific. Google documents it for custom snapshot storage locations on clusters using supported GKE versions.
- `tagSpecification_1` is a valid AWS EBS CSI `VolumeSnapshotClass.parameters` key for snapshot tagging.
- On managed platforms, the snapshot controller may already be bundled or available as a managed add-on. The revised post now reflects that the Helm chart is only needed when the cluster does not already provide these components.
- The current Piraeus `snapshot-controller` chart version used in the post, `5.0.3`, declares `kubeVersion: >= 1.25.0-0`.
- The AWS example targets the standard EBS CSI driver provisioner, `ebs.csi.aws.com`. Amazon EKS Auto Mode uses a different provisioner, `ebs.csi.eks.amazonaws.com`.
- Kubernetes volume snapshots are useful for backup and recovery, but Kubernetes does not guarantee application consistency on its own. Workloads that need application-consistent backups may still require quiescing or higher-level coordination before taking a snapshot.
