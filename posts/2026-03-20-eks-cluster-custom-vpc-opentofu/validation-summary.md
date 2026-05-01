# Validation Summary: How to Create EKS Cluster with Custom VPC Using OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- AWS
- Amazon EKS
- Amazon VPC
- IAM
- Kubernetes
- AWS CLI
- `kubectl`

## Sources Consulted
- OpenTofu module source address documentation: https://opentofu.org/docs/v1.9/language/modules/sources/
- Terraform AWS provider `aws_availability_zones` data source docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/availability_zones
- Terraform AWS provider `aws_eks_cluster_auth` data source docs: https://registry.terraform.io/providers/hashicorp/aws/5.15.0/docs/data-sources/eks_cluster_auth
- `terraform-aws-vpc` module documentation: https://github.com/terraform-aws-modules/terraform-aws-vpc
- Amazon EKS network requirements and subnet tagging: https://docs.aws.amazon.com/eks/latest/userguide/network-reqs.html
- Amazon EKS cluster endpoint access: https://docs.aws.amazon.com/eks/latest/userguide/cluster-endpoint.html
- Amazon EKS control plane logging: https://docs.aws.amazon.com/eks/latest/userguide/control-plane-logs.html
- Amazon EKS cluster IAM role: https://docs.aws.amazon.com/eks/latest/userguide/cluster-iam-role.html
- Connect `kubectl` to an EKS cluster: https://docs.aws.amazon.com/eks/latest/userguide/create-kubeconfig.html
- AWS CLI `update-kubeconfig` reference: https://docs.aws.amazon.com/cli/v1/reference/eks/update-kubeconfig.html

## Issues Found
- The original VPC snippet referenced `data.aws_availability_zones.available.names` without defining the data source. I added the `aws_availability_zones` data source and filtered it to standard Availability Zones.
- The original VPC snippet used all returned zone names while only defining three public and three private subnets. I changed the example to use `slice(..., 0, 3)` so the AZ list matches the subnet layout.
- The NAT gateway comment said `single_nat_gateway = false` created one NAT gateway per AZ. In the `terraform-aws-vpc` module, that is only explicit when `one_nat_gateway_per_az = true`, so I added that argument.
- The post said subnet tagging was required for load balancers and node groups. That is inaccurate. I corrected the explanation to focus on load balancer subnet discovery and clarified the cluster tag’s compatibility purpose.
- The prerequisites omitted the AWS CLI even though the guide uses `aws eks update-kubeconfig`. I added the AWS CLI prerequisite.
- The deployment verification used `kubectl get nodes`, but the post never creates a managed node group or Fargate profile. I changed the verification command to `kubectl get svc`, which matches Amazon EKS documentation for validating cluster access.

## Review Notes
- The `kubernetes.io/cluster/<cluster-name>` subnet tag is mainly retained for compatibility with older load balancer controller behavior; newer EKS clusters don’t add it automatically.
- The `aws_eks_cluster_auth` data source is technically valid, but it is typically used for Terraform provider authentication rather than for `kubectl` setup directly.
