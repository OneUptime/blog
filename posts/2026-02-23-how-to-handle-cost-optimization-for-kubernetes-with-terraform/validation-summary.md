# Validation Summary: How to Handle Cost Optimization for Kubernetes with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- AWS EKS (`aws_eks_cluster`, `aws_eks_node_group`, `aws_launch_template`)
- AWS IAM (`aws_iam_role`, `aws_iam_openid_connect_provider`)
- Karpenter v0.33.0 (v1beta1 NodePool API)
- Helm provider (`helm_release`)
- Kubernetes provider (`kubernetes_namespace`, `kubernetes_resource_quota`, `kubernetes_limit_range`)
- kubectl provider (`kubectl_manifest`)
- Kubecost
- Spot instances and EC2 instance families (m5/m6i/c5/r5)

## Sources Consulted
- Terraform AWS provider docs — `aws_eks_cluster`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_cluster
- Terraform AWS provider docs — `aws_eks_node_group` (ami_type, capacity_type, taint, scaling_config): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_node_group
- Terraform Kubernetes provider docs — `kubernetes_resource_quota`, `kubernetes_limit_range`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs
- Terraform Helm provider docs — `helm_release`: https://registry.terraform.io/providers/hashicorp/helm/latest/docs/resources/release
- Karpenter v0.33 NodePool reference (v1beta1 API): https://karpenter.sh/v0.33/concepts/nodepools/
- Karpenter v0.33 getting-started guide: https://karpenter.sh/v0.33/getting-started/getting-started-with-karpenter/
- Karpenter Helm chart in public ECR: oci://public.ecr.aws/karpenter/karpenter
- Kubecost Helm chart repository: https://kubecost.github.io/cost-analyzer/
- AWS EKS supported AMI types (incl. `AL2023_x86_64_STANDARD`): https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-amis.html

## Issues Found
- The section heading "Resource Quotas and Limit Ranges" was missing its `##` markdown prefix, so it rendered as plain body text instead of a section header. Added `##` to bring it in line with the rest of the document's heading structure.

No technical errors were found in the Terraform/Kubernetes/Karpenter code samples or claims. The Karpenter v0.33.0 NodePool uses the v1beta1 API correctly, and `consolidationPolicy = "WhenUnderutilized"` is a valid value for that release (it was renamed to `WhenEmptyOrUnderutilized` only in Karpenter v1.0+, so the post's usage matches the pinned version).

## Review Notes
- Karpenter v0.33.0 is pinned. Readers upgrading to Karpenter v1.0+ will need to migrate the NodePool API to `karpenter.sh/v1` and change `consolidationPolicy: WhenUnderutilized` to `WhenEmptyOrUnderutilized` (and add a `consolidateAfter` value, which became required). This is correct for the version shown but worth flagging for future readers.
- EKS Kubernetes version `"1.28"` is older as of the validation date; EKS supports newer minors. The configuration syntax is unchanged, so the code remains valid for current versions.
- The Karpenter NodePool manifest does not include an `EC2NodeClass` definition (only a `nodeClassRef` pointing to `"default"`). In a real deployment readers would also need to create the corresponding `EC2NodeClass` resource — out of scope for this post but worth noting.
- The `helm_release.karpenter` block does not set `chart_version` for Karpenter CRDs separately; in practice the Karpenter CRDs are published as a separate chart (`karpenter-crd`) that some deployments install ahead of the controller. Not a correctness issue for the example, just a real-world caveat.
- Helm chart version `v0.33.0` is shown with a `v` prefix. The Karpenter OCI chart accepts both `v0.33.0` and `0.33.0` references in practice, so no change needed.
