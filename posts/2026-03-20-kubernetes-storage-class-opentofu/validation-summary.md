# Validation Summary: How to Configure Kubernetes Storage Classes with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HashiCorp Kubernetes provider
- Kubernetes StorageClass
- AWS EBS CSI driver
- Azure Disk CSI driver / AKS
- Google Kubernetes Engine Persistent Disk CSI driver

## Sources Consulted
- HashiCorp Kubernetes provider changelog: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/CHANGELOG.md
- HashiCorp Kubernetes provider `kubernetes_storage_class_v1` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/storage_class_v1.md
- Kubernetes StorageClass concepts: https://kubernetes.io/docs/concepts/storage/storage-classes/
- AWS EBS CSI driver StorageClass parameters: https://raw.githubusercontent.com/kubernetes-sigs/aws-ebs-csi-driver/master/docs/parameters.md
- Amazon EKS storage class documentation: https://docs.aws.amazon.com/eks/latest/userguide/create-storage-class.html
- AKS Azure Disk CSI storage provisioning docs: https://learn.microsoft.com/en-us/azure/aks/azure-csi-disk-storage-provision
- AKS Ultra Disk docs: https://learn.microsoft.com/en-us/azure/aks/use-ultra-disks
- Azure Disk CSI driver parameters: https://raw.githubusercontent.com/kubernetes-sigs/azuredisk-csi-driver/master/docs/driver-parameters.md
- Azure Disk CSI driver resize example: https://raw.githubusercontent.com/kubernetes-sigs/azuredisk-csi-driver/master/deploy/example/resize/README.md
- GKE regional persistent disk docs: https://cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/regional-pd

## Issues Found
- The post used the unversioned `kubernetes_storage_class` resource. The current HashiCorp Kubernetes provider deprecates that resource in favor of `kubernetes_storage_class_v1`, so all examples were updated and the provider version was moved to the current `~> 3.0` line.
- The Azure Premium SSD example said `enableBursting` enabled host-based encryption. That parameter actually enables on-demand bursting for eligible Premium SSD disks, so the comment was corrected.
- The Azure Ultra Disk example omitted `cachingMode = "None"`, which Ultra disks require in current Azure Disk CSI guidance. That field was added.
- The Azure Ultra Disk example claimed Ultra disks do not support online expansion and set `allow_volume_expansion = false`. Current Azure Disk CSI and Azure managed disk documentation support online resize, so the example was corrected to enable expansion.
- The GKE regional PD example used a `zones` StorageClass parameter. Current GKE documentation uses `allowedTopologies` with `topology.gke.io/zone` for zone constraints, so the snippet was updated accordingly.
- The best-practices note about multiple default StorageClasses said they cause unpredictable behavior. Kubernetes documents the behavior: PVCs without `storageClassName` use the most recently created default. The wording was corrected.
- The best-practices note about volume expansion was overly broad. It was updated to note that expansion depends on CSI driver and backend support.

## Review Notes
- The AWS examples remain valid for the standard EBS CSI driver provisioner `ebs.csi.aws.com`. On Amazon EKS Auto Mode, AWS documents a different provisioner, `ebs.csi.eks.amazonaws.com`, but the post does not claim to target Auto Mode specifically.
- For GKE regional persistent disks, current Google Cloud documentation says `allowedTopologies` can be omitted on regional clusters if node pools have active nodes in at least two zones. The updated example keeps explicit topology constraints, which is still valid.
