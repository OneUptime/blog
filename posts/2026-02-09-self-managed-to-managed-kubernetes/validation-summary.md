# Validation Summary: How to Migrate from Self-Managed Kubernetes to Managed Kubernetes Services

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Kubernetes
- Amazon EKS
- Google Kubernetes Engine (GKE)
- Azure Kubernetes Service (AKS)
- eksctl
- Helm
- AWS Load Balancer Controller
- Amazon EBS CSI Driver
- Cluster Autoscaler
- Velero
- MetalLB
- IAM Roles for Service Accounts (IRSA)
- Amazon Route 53
- Amazon CloudWatch Container Insights

## Sources Consulted
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Amazon EKS pricing: https://aws.amazon.com/eks/pricing/
- Amazon EKS Kubernetes version lifecycle: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- eksctl managed node group documentation: https://docs.aws.amazon.com/eks/latest/eksctl/nodegroup-managed.html
- AWS Load Balancer Controller Helm installation: https://docs.aws.amazon.com/eks/latest/userguide/lbc-helm.html
- Amazon EKS Network Load Balancer annotations: https://docs.aws.amazon.com/eks/latest/userguide/network-load-balancing.html
- Amazon EKS add-ons documentation: https://docs.aws.amazon.com/eks/latest/userguide/workloads-add-ons-available-eks.html
- Amazon CloudWatch Observability EKS add-on documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Container-Insights-setup-EKS-addon.html
- GKE pricing: https://cloud.google.com/kubernetes-engine/pricing
- GKE Workload Identity Federation documentation: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/workload-identity
- AKS pricing tiers documentation: https://learn.microsoft.com/en-us/azure/aks/free-standard-pricing-tiers
- Velero install documentation: https://velero.io/docs/v1.18/velero-install/
- Velero restore reference: https://velero.io/docs/v1.18/restore-reference/
- Velero AWS plugin compatibility information: https://pkg.go.dev/github.com/vmware-tanzu/velero-plugin-for-aws
- MetalLB advanced address pool configuration: https://metallb.io/configuration/_advanced_ipaddresspool_configuration/

## Issues Found
- The managed-service responsibility list said automatic Kubernetes upgrades and free/low-cost control plane management generically. Updated this to managed upgrade workflows and included-or-billed-separately control plane management because provider behavior and pricing differ.
- The provider comparison stated GKE and AKS control planes are free. Updated the pricing text to reflect GKE cluster management fees/free-tier credit and AKS Free versus Standard/Premium tiers.
- The EKS provisioning example used Kubernetes 1.28, which is no longer listed as an available EKS version on June 3, 2026. Updated the example to EKS 1.35.
- The add-on install commands omitted Helm repo updates and required IAM service account setup for AWS Load Balancer Controller, EBS CSI Driver, and Cluster Autoscaler. Added the missing setup commands and Helm service account values.
- The Velero install example used an outdated AWS plugin version and omitted snapshot location configuration and an identity mode. Updated the AWS plugin to v1.14.0 for Velero 1.18 compatibility and added `--snapshot-location-config` and `--no-secret`.
- The AWS Service annotation example used older NLB annotations and omitted selectors and ports. Updated it to current AWS Load Balancer Controller annotations and complete Service specs.
- The MetalLB Service example used the deprecated `metallb.universe.tf/address-pool` annotation and deprecated `spec.loadBalancerIP`. Updated it to `metallb.io/address-pool` and `metallb.io/loadBalancerIPs`.
- The Deployment manifest omitted the required `spec.selector` and matching pod template labels for `apps/v1`. Added both.
- The `kubectl --field-selector spec.type=LoadBalancer` commands used an unsupported Service field selector. Replaced them with `jq` filtering over Service JSON output.
- The DNS update example referenced `$NEW_LB_HOSTNAME` without defining it. Added a command to populate it from the migrated Service.
- The CloudWatch Container Insights YAML was an incomplete DaemonSet and would not install the current EKS observability integration. Replaced it with the Amazon CloudWatch Observability EKS add-on flow.

## Review Notes
- Some AWS IAM policy ARNs remain account-specific placeholders, such as `ACCOUNT_ID` and custom policies for AWS Load Balancer Controller and Cluster Autoscaler. These are appropriate for a migration guide but must be replaced with real account-specific IAM resources before running.
- Velero cross-cluster volume restore depends on compatible storage providers, snapshot locations, and restore strategy. The commands are valid, but production migrations should still test representative stateful workloads before DNS cutover.
