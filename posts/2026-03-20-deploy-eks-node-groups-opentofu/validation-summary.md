# Validation Summary: How to Deploy EKS with Node Groups Using OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible HCL)
- AWS EKS (Elastic Kubernetes Service)
- AWS EKS Managed Node Groups
- AWS IAM (roles, trust policies, policy attachments)
- AWS EC2 Launch Templates
- AWS EBS (gp3 volumes)
- IMDSv2 (Instance Metadata Service v2)
- EKS Add-ons (CoreDNS, kube-proxy, VPC CNI, EBS CSI driver)
- EC2 Spot Instances
- Kubernetes labels and taints

## Sources Consulted
- AWS EKS documentation: https://docs.aws.amazon.com/eks/latest/userguide/
- Terraform AWS Provider — `aws_eks_cluster`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_cluster
- Terraform AWS Provider — `aws_eks_node_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_node_group
- Terraform AWS Provider — `aws_eks_addon`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_addon
- Terraform AWS Provider — `aws_launch_template`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- Terraform AWS Provider — `aws_eks_addon_version` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/eks_addon_version
- AWS managed policies for EKS: https://docs.aws.amazon.com/eks/latest/userguide/security-iam-awsmanpol.html
- EKS cluster control plane logging: https://docs.aws.amazon.com/eks/latest/userguide/control-plane-logs.html

## Issues Found
No technical issues found. All HCL examples use the correct resource names, argument names, and value types per the AWS provider schema. Specifically verified:

- IAM trust policy service principals are correct (`eks.amazonaws.com` for the cluster role, `ec2.amazonaws.com` for the node role).
- All five EKS control plane log types (`api`, `audit`, `authenticator`, `controllerManager`, `scheduler`) are spelled correctly and are the only valid values.
- The `aws_eks_node_group` schema supports all blocks used: `scaling_config`, `update_config` (with `max_unavailable_percentage`), `launch_template`, `taint`, `labels`.
- `aws_eks_addon` `resolve_conflicts_on_update` and `service_account_role_arn` are valid arguments.
- The `data "aws_eks_addon_version"` data source arguments (`addon_name`, `kubernetes_version`, `most_recent`) match the documented schema.
- IMDSv2 enforcement via `http_tokens = "required"` is correctly described as a defense against SSRF on the metadata endpoint.

## Review Notes
- `http_put_response_hop_limit = 1` in the launch template is intentionally restrictive — it prevents pods from reaching IMDS. This is a deliberate security posture, but readers running workloads that rely on IMDS access from pods (e.g., older AWS SDKs not configured for IRSA) may need to bump it to `2`. The post does not call this out, but the configuration itself is correct.
- The application node group declares `instance_types` on the resource AND uses a `launch_template`. This is allowed only because the example launch template does not specify an instance type itself; if a future reader adds `instance_type` to the launch template, EKS will reject node group creation.
- The `AmazonEKS_CNI_Policy` is attached to the node role for simplicity. AWS now recommends migrating the VPC CNI to IRSA (a service-account-scoped role) instead of granting the policy at the node level. The current code still works, but is worth noting as a future hardening step.
- The add-ons section only defines a `data "aws_eks_addon_version" "coredns"` block while the resources reference equivalent data sources for `kube_proxy`, `vpc_cni`, and `ebs_csi`. Readers will need to define the analogous data sources for those add-ons. This is an example/illustrative omission rather than a technical error.
- `aws_iam_role.ebs_csi` is referenced but not defined in the post — readers building the EBS CSI add-on with IRSA will need to create this role with the `AmazonEBSCSIDriverPolicy` and an OIDC trust policy. Again, an illustrative omission rather than incorrect code.
