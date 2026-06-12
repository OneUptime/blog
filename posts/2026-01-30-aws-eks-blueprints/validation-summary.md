# Validation Summary: How to Build AWS EKS Blueprints

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EKS
- EKS Blueprints Add-ons for Terraform
- Terraform
- terraform-aws-modules EKS and VPC modules
- Kubernetes RBAC, namespaces, resource quotas, and network policies
- Helm provider for Terraform
- AWS CLI and kubectl
- ArgoCD, ExternalDNS, AWS Load Balancer Controller, and Karpenter

## Sources Consulted
- Amazon EKS Kubernetes version lifecycle: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- Amazon EKS kubeconfig documentation: https://docs.aws.amazon.com/eks/latest/userguide/create-kubeconfig.html
- Amazon EKS network policy documentation: https://docs.aws.amazon.com/eks/latest/userguide/cni-network-policy.html
- EKS Blueprints Add-ons Terraform module documentation/source: https://github.com/aws-ia/terraform-aws-eks-blueprints-addons
- EKS Blueprints Add-ons Terraform Registry metadata: https://registry.terraform.io/modules/aws-ia/eks-blueprints-addons/aws/latest
- terraform-aws-modules EKS module documentation: https://github.com/terraform-aws-modules/terraform-aws-eks
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- AWS CLI `eks update-kubeconfig` command reference: https://docs.aws.amazon.com/cli/latest/reference/eks/update-kubeconfig.html

## Issues Found
- The post defaulted `cluster_version` to Kubernetes `1.29`, which is no longer available in Amazon EKS standard or extended support on June 12, 2026. Changed the default to `1.34`, which is currently in EKS standard support.
- The Helm provider constraint allowed provider v3, while the published EKS Blueprints Add-ons 1.x module and the snippet's nested `kubernetes {}` provider syntax are compatible with Helm provider v2. Changed the constraint to `>= 2.9, < 3.0`.
- The EKS Blueprints Add-ons module blocks did not pin a module version even though the article recommends versioning modules. Added `version = "~> 1.0"` to the add-on module examples.
- The VPC/EKS section comment called the core cluster module the "official EKS Blueprints module", but the snippet uses `terraform-aws-modules/eks/aws` and `terraform-aws-modules/vpc/aws`. Updated the comment to describe it as the upstream EKS module for the core cluster.
- The teams section implied Kubernetes NetworkPolicy resources automatically isolate namespaces. EKS requires a compatible CNI or enabled Amazon VPC CNI network policy support for enforcement. Updated the prose and inline comment to make that requirement explicit.
- The DNS egress rule allowed only UDP port 53. Added TCP port 53 as well, since DNS can use TCP.
- The platform RBAC comment implied the Terraform snippet alone gives a team cluster-admin access. Updated it to say it binds the `platform-team` Kubernetes group, which still requires the cluster authentication layer to map identities into that group.

## Review Notes
The Terraform, AWS CLI, and kubectl commands are structurally correct, but the local workspace does not have `terraform`, `aws`, or `kubectl` installed, so command execution was not performed. The post still uses terraform-aws-modules EKS v20 and EKS Blueprints Add-ons v1.x; a future refresh could migrate the examples to newer major module versions if the project standardizes on them.
