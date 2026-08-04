# Validation Summary: Audit Kubernetes Portability Across EKS, AKS, and GKE

## Status

validated

## Post Type

Technical guide and portability-audit checklist

## Technologies Covered

- Kubernetes APIs, API deprecation, version skew, CRDs, API aggregation, admission webhooks, RBAC, and ServiceAccounts
- `kubectl`, Helm, and ripgrep
- Amazon EKS, EKS platform versions, Amazon VPC CNI, AWS Load Balancer Controller, IRSA, and EKS Pod Identity
- Azure Kubernetes Service (AKS), Azure CNI, Application Gateway for Containers, and Microsoft Entra Workload ID
- Google Kubernetes Engine (GKE), GKE release channels, GKE Gateway controller, and Workload Identity Federation for GKE
- Gateway API, ExternalDNS, Secrets Store CSI Driver, CSI storage, StorageClasses, and volume snapshots
- NetworkPolicy, load balancers, DNS, TLS, topology, observability, backup, restore, upgrades, and day-two operations

## Sources Consulted

- Kubernetes `kubectl api-resources` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_api-resources/
- Kubernetes `kubectl apply` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes API concepts, including server-side dry run and admission behavior: https://kubernetes.io/docs/reference/using-api/api-concepts/
- Kubernetes API deprecation policy: https://kubernetes.io/docs/reference/using-api/deprecation-policy/
- Kubernetes version skew policy: https://kubernetes.io/releases/version-skew-policy/
- Kubernetes CRD versioning, stored versions, and conversion webhooks: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definition-versioning/
- Kubernetes StorageClasses: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes volume snapshots: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes `ReadWriteOncePod` guidance and `ReadWriteOnce` semantics: https://kubernetes.io/docs/tasks/administer-cluster/change-pv-access-mode-readwriteoncepod/
- Helm `helm template` command reference: https://helm.sh/docs/helm/helm_template/
- ripgrep guide, including `-i/--ignore-case`: https://github.com/BurntSushi/ripgrep/blob/master/GUIDE.md
- Amazon EKS Kubernetes version lifecycle: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- Amazon EKS platform versions: https://docs.aws.amazon.com/eks/latest/userguide/platform-versions.html
- Amazon EKS workload identity options, including IRSA and EKS Pod Identity: https://docs.aws.amazon.com/eks/latest/userguide/service-accounts.html
- Amazon EKS VPC CNI NetworkPolicy support: https://docs.aws.amazon.com/eks/latest/userguide/cni-network-policy.html
- AWS Load Balancer Controller on EKS: https://docs.aws.amazon.com/eks/latest/userguide/aws-load-balancer-controller.html
- AKS supported Kubernetes versions and release calendar: https://learn.microsoft.com/en-us/azure/aks/supported-kubernetes-versions
- Microsoft Entra Workload ID on AKS: https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview
- Azure CNI Overlay networking: https://learn.microsoft.com/en-us/azure/aks/concepts-network-azure-cni-overlay
- GKE release channels and automatic upgrades: https://cloud.google.com/kubernetes-engine/docs/concepts/release-channels
- Workload Identity Federation for GKE: https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity
- GKE Gateway API implementation and provider-specific policy resources: https://cloud.google.com/kubernetes-engine/docs/concepts/gateway-api
- Gateway API implementations and conformance reports: https://gateway-api.sigs.k8s.io/implementations/
- Secrets Store CSI Driver concepts and supported providers: https://secrets-store-csi-driver.sigs.k8s.io/concepts and https://secrets-store-csi-driver.sigs.k8s.io/providers
- Local CLI help and version output for `kubectl` v1.34.1, Helm v3.12.3, and ripgrep v15.2.0

## Issues Found

- The API inventory claimed to cover every workload resource, but the command listed only namespaced resources. Added a second `kubectl api-resources --namespaced=false` pipeline for cluster-scoped objects and clarified that the result is limited to objects visible to the audit identity; this prevents dependencies such as ClusterRoles, StorageClasses, and webhook configurations from being omitted.
- The provider-coupling search was case-sensitive, so it would not match the standard `storageClassName` field. It also omitted common Azure identifiers such as `azure.workload.identity/*` and `azure-load-balancer-*`, and it did not explicitly cover `volumeSnapshotClassName`. Changed the command to use `rg -ni` and added `azure[.-]` and `volumesnapshotclass` patterns.

## Review Notes

- Kubernetes 1.35 is a valid example for the stated EKS-to-AKS envelope on 2026-08-04: it is in EKS standard support and is a supported AKS GA minor version. GKE's published release schedule also includes Kubernetes 1.35. The post correctly warns readers to verify current subscription and regional availability rather than treating the example as a permanent guarantee.
- The server-side dry-run explanation is accurate: the request passes through validation and the applicable admission chain without persistence, but it does not test controller reconciliation or cloud-resource provisioning.
- `VolumeSnapshot`, `VolumeSnapshotContent`, and `VolumeSnapshotClass` are CRDs supplied as part of CSI snapshot support. Consequently, `kubectl get volumesnapshotclass` requires those CRDs to be installed; an absent resource type is itself relevant audit evidence.
- All eight links in the post's Official Documentation section resolved to the intended authoritative documentation, with some canonical redirects.
