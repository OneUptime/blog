# Validation Summary: How to Deploy Karpenter with Terraform

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Terraform
- AWS EKS
- Karpenter
- Kubernetes NodePools and EC2NodeClasses
- Helm
- IAM Roles for Service Accounts (IRSA)
- Amazon SQS and EventBridge interruption handling

## Sources Consulted
- Karpenter v1.12 Getting Started documentation: https://karpenter.sh/v1.12/getting-started/getting-started-with-karpenter/
- Karpenter v1.12 NodePools documentation: https://karpenter.sh/v1.12/concepts/nodepools/
- Karpenter v1.12 NodeClasses documentation: https://karpenter.sh/v1.12/concepts/nodeclasses/
- Karpenter v1.12 Disruption documentation: https://karpenter.sh/v1.12/concepts/disruption/
- Karpenter v1.12 Compatibility documentation: https://karpenter.sh/v1.12/upgrading/compatibility/
- Karpenter v1.12.1 CloudFormation reference for IAM and interruption resources: https://raw.githubusercontent.com/aws/karpenter-provider-aws/v1.12.1/website/content/en/preview/getting-started/getting-started-with-karpenter/cloudformation.yaml
- terraform-aws-iam v5.33.0 iam-role-for-service-accounts-eks module variables: https://raw.githubusercontent.com/terraform-aws-modules/terraform-aws-iam/v5.33.0/modules/iam-role-for-service-accounts-eks/variables.tf
- Karpenter provider AWS v1.12.1 Helm chart values: https://raw.githubusercontent.com/aws/karpenter-provider-aws/v1.12.1/charts/karpenter/values.yaml

## Issues Found
- The post pinned Karpenter Helm chart `0.33.0` and used `v1beta1` resources. Updated the chart example to `1.12.1` and changed NodePool and EC2NodeClass manifests to the current `karpenter.sh/v1` and `karpenter.k8s.aws/v1` APIs.
- The NodePool examples used `nodeClassRef.name` only. Current Karpenter `v1` examples include `group`, `kind`, and `name`, so those fields were added.
- The NodePool disruption examples used `WhenUnderutilized`, which is not the current `v1` consolidation policy value. Updated it to `WhenEmptyOrUnderutilized`.
- The cost optimization example placed `expireAfter` under `spec.disruption`; in current Karpenter it belongs under `spec.template.spec`. Moved it accordingly.
- The Helm values placed resource requests and limits at top level. Current chart values put them under `controller.resources`, so the Terraform Helm values were corrected.
- The Helm values used a `nodeSelector` requiring `karpenter.sh/nodepool = ""`, which would not match ordinary static node group nodes. Replaced it with a Linux node selector plus node affinity requiring `karpenter.sh/nodepool` to not exist.
- The controller IAM module did not receive the SQS queue ARN, so interruption handling would lack the queue permissions from the module policy. Added `karpenter_sqs_queue_arn`.
- The node role example used `AmazonEC2ContainerRegistryReadOnly`; the current Karpenter AWS reference uses the narrower `AmazonEC2ContainerRegistryPullOnly` managed policy. Updated the policy ARN.
- The EC2NodeClass example used `amiFamily: AL2` as a default AMI selector. Updated it to current AL2023 alias-based EKS optimized AMI selection with `amiSelectorTerms`.
- The EventBridge interruption pattern omitted `EC2 Capacity Reservation Instance Interruption Warning`, which is included in the current Karpenter AWS reference. Added it.
- The prerequisite statement referenced EKS 1.25 or later. Replaced it with a version-neutral requirement to use an EKS version supported by the selected Karpenter release.

## Review Notes
The example uses `al2023@latest` for brevity, which is valid, but Karpenter recommends pinning AMI aliases for production so new AMI releases do not automatically drift and replace all out-of-date nodes.
