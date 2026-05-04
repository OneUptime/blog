# Validation Summary: How to Create EKS Clusters with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS Provider (hashicorp/aws)
- Amazon EKS (Elastic Kubernetes Service)
- AWS IAM (roles, managed policies, assume role policies)
- AWS KMS (envelope encryption for Kubernetes secrets)
- EKS Managed Node Groups
- EC2 Launch Templates
- EKS Add-ons (VPC CNI, CoreDNS, kube-proxy, AWS EBS CSI Driver)
- IRSA (IAM Roles for Service Accounts) via OIDC
- AWS CLI (`aws eks update-kubeconfig`)
- kubectl

## Sources Consulted
- Terraform AWS Provider — `aws_eks_cluster`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_cluster
- Terraform AWS Provider — `aws_eks_node_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_node_group
- Terraform AWS Provider — `aws_eks_addon`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_addon
- Terraform AWS Provider — `aws_iam_role` and `aws_iam_role_policy_attachment`
- AWS EKS Cluster IAM Role docs (service principal `eks.amazonaws.com`, `AmazonEKSClusterPolicy`)
- AWS EKS Node IAM Role docs (`AmazonEKSWorkerNodePolicy`, `AmazonEKS_CNI_Policy`, `AmazonEC2ContainerRegistryReadOnly`)
- AWS EKS Authentication modes (`API`, `API_AND_CONFIG_MAP`, `CONFIG_MAP`)
- AWS EKS Control Plane Logging types (`api`, `audit`, `authenticator`, `controllerManager`, `scheduler`)
- AWS EKS Add-ons reference (add-on identifiers: `vpc-cni`, `coredns`, `kube-proxy`, `aws-ebs-csi-driver`)
- AWS CLI EKS reference: https://docs.aws.amazon.com/cli/latest/reference/eks/update-kubeconfig.html
- HashiCorp HCL `lifecycle.ignore_changes` reference for nested block attributes

## Issues Found
No technical issues found.

All Terraform/HCL is syntactically valid and uses current, non-deprecated arguments. The IAM trust relationships, managed policy ARNs, EKS add-on names, `resolve_conflicts_on_update` values, `authentication_mode` value, control-plane log types, and `aws eks update-kubeconfig` invocation are all correct. The `ignore_changes = [scaling_config[0].desired_size]` syntax is the proper HCL pattern for ignoring a single attribute inside a nested block. The `identity[0].oidc[0].issuer` output path matches the `aws_eks_cluster` schema and is the correct value to feed into IRSA setup.

## Review Notes
- The `data.aws_eks_addon_version` data sources are referenced but not declared in the snippet; this is implicit and fine for an excerpt-style tutorial, but readers building from scratch will need to add `data "aws_eks_addon_version" "vpc_cni" { addon_name = "vpc-cni"; kubernetes_version = aws_eks_cluster.main.version }` and similar for each add-on.
- Likewise, `aws_security_group.eks_cluster`, `aws_kms_key.eks`, `aws_launch_template.eks_nodes`, and `aws_iam_role.ebs_csi` are referenced but not defined in the post — reasonable for a focused guide.
- When using a `launch_template` in `aws_eks_node_group`, AWS recommends specifying `instance_types` either in the node group OR in the launch template (not both) to avoid conflicts. The post sets it on the node group, which is fine as long as the launch template does not also set it — readers should be aware.
- `bootstrap_cluster_creator_admin_permissions = true` grants the IAM principal that creates the cluster cluster-admin via an access entry; this is convenient but should be considered carefully in shared-account environments.
- The `AmazonEKS_CNI_Policy` attached directly to the node role works but the AWS-recommended pattern is now to use IRSA for the VPC CNI add-on; the current approach remains valid and supported.
