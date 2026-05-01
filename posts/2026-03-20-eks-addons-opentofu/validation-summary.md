# Validation Summary: How to Configure EKS Add-Ons with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- AWS EKS
- Terraform AWS provider
- AWS IAM and IRSA
- Kubernetes add-ons
- AWS CLI

## Sources Consulted
- Terraform AWS provider `aws_eks_addon` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/eks_addon.html.markdown
- Terraform AWS provider `aws_eks_addon_version` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/eks_addon_version.html.markdown
- Terraform AWS provider `aws_eks_cluster` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/eks_cluster.html.markdown
- Terraform AWS provider `aws_iam_openid_connect_provider` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/iam_openid_connect_provider.html.markdown
- Amazon EKS User Guide, Create an add-on: https://docs.aws.amazon.com/eks/latest/userguide/creating-an-add-on.html
- Amazon EKS User Guide, Update an add-on: https://docs.aws.amazon.com/eks/latest/userguide/updating-an-add-on.html
- Amazon EKS API Reference, `CreateAddon`: https://docs.aws.amazon.com/eks/latest/APIReference/API_CreateAddon.html
- AWS CLI Command Reference, `aws eks describe-addon`: https://docs.aws.amazon.com/cli/latest/reference/eks/describe-addon.html
- Amazon EKS User Guide, Create the Amazon VPC CNI add-on: https://docs.aws.amazon.com/eks/latest/userguide/vpc-add-on-create.html
- Amazon EKS User Guide, Configure Amazon VPC CNI plugin to use IRSA: https://docs.aws.amazon.com/eks/latest/userguide/cni-iam-role.html
- Amazon EKS Best Practices Guide, Prefix Mode for Linux: https://docs.aws.amazon.com/eks/latest/best-practices/prefix-mode-linux.html
- Amazon EKS User Guide, Use Kubernetes volume storage with Amazon EBS: https://docs.aws.amazon.com/eks/latest/userguide/ebs-csi.html
- Amazon EKS User Guide, Retrieve IAM information about an Amazon EKS add-on: https://docs.aws.amazon.com/eks/latest/userguide/retreive-iam-info.html
- Amazon EKS User Guide, IAM roles for Amazon EKS add-ons: https://docs.aws.amazon.com/eks/latest/userguide/add-ons-iam.html

## Issues Found
- The add-on resources used `resolve_conflicts_on_update` for initial installation, but create-time conflict handling is controlled by `resolve_conflicts_on_create`. I added `resolve_conflicts_on_create = "OVERWRITE"` to the add-on resources and corrected the conclusion accordingly.
- The VPC CNI snippet referenced `aws_iam_role.vpc_cni.arn` without defining the role. I added the missing IAM role and policy attachment so the example is internally consistent.
- The IAM role snippets referenced an undefined `aws_iam_openid_connect_provider.cluster` resource. I changed them to look up the existing cluster and OIDC provider with provider data sources so the examples match the stated prerequisites.
- The EBS CSI snippet referenced `data.aws_eks_addon_version.ebs_csi.version` without defining the data source. I added the missing `aws_eks_addon_version` block.
- The EBS CSI IRSA trust policy omitted the `aud` condition that AWS includes in its documented trust policy examples. I added the `sts.amazonaws.com` audience condition.
- The EBS CSI example attached `AmazonEBSCSIDriverPolicy`, while the current EBS CSI installation guide now uses `AmazonEBSCSIDriverPolicyV2`. I updated the policy ARN.
- The post described the EBS CSI role as requiring IRSA, but AWS now supports EKS Pod Identity for the add-on and recommends it generally for add-ons that need IAM permissions. I corrected the wording to say the example is for IRSA usage.
- The conclusion recommended `aws eks list-addons` for health monitoring, but that command lists installed add-ons rather than reporting an add-on's status. I changed the guidance to `aws eks describe-addon`.

## Review Notes
- AWS currently recommends EKS Pod Identity for add-ons that need IAM permissions, but the corrected post remains technically valid because `service_account_role_arn` with IRSA is still supported.
- The `AmazonEKS_CNI_Policy` example is correct for IPv4 clusters. IPv6 clusters need a different CNI policy, so the post now calls that out inline.
- `most_recent = true` selects the latest compatible add-on version for the cluster version, which is valid but may differ from AWS's default recommended version at a given point in time.
