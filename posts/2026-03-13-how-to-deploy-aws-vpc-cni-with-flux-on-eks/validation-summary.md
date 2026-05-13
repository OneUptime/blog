# Validation Summary: How to Deploy AWS VPC CNI with Flux on EKS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon EKS
- Amazon VPC CNI
- AWS EKS managed add-ons
- IAM Roles for Service Accounts (IRSA)
- Flux HelmRepository and HelmRelease
- Helm
- Kubernetes DaemonSets, ConfigMaps, and CRDs
- VPC CNI prefix delegation
- VPC CNI custom networking and ENIConfig
- Security groups for pods

## Sources Consulted
- Amazon EKS documentation: Kubernetes version lifecycle on EKS: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- Amazon EKS documentation: Remove an Amazon EKS add-on from a cluster: https://docs.aws.amazon.com/eks/latest/userguide/removing-an-add-on.html
- Amazon EKS best practices: Amazon VPC CNI: https://docs.aws.amazon.com/eks/latest/best-practices/vpc-cni.html
- Amazon EKS best practices: Prefix Mode for Linux: https://docs.aws.amazon.com/eks/latest/best-practices/prefix-mode-linux.html
- Amazon EKS best practices: Custom Networking: https://docs.aws.amazon.com/eks/latest/best-practices/custom-networking.html
- Amazon EKS best practices: Security Groups Per Pod: https://docs.aws.amazon.com/eks/latest/best-practices/sgpp.html
- AWS EKS Helm chart repository: https://github.com/aws/eks-charts
- AWS VPC CNI Helm chart README and values: https://raw.githubusercontent.com/aws/eks-charts/master/stable/aws-vpc-cni/README.md and https://raw.githubusercontent.com/aws/eks-charts/master/stable/aws-vpc-cni/values.yaml
- AWS VPC CNI project documentation: https://github.com/aws/amazon-vpc-cni-k8s
- Flux HelmRelease API reference v2: https://fluxcd.io/flux/components/helm/api/v2/

## Issues Found
- The prerequisites referenced EKS version 1.25 or later. EKS 1.25 is no longer a supported EKS version as of the 2026-05-13 review date, so this was changed to "an existing supported EKS cluster."
- The guide removed the EKS managed add-on with `--preserve` and then installed a HelmRelease, but did not adopt the preserved `aws-node` resources into Helm. The AWS VPC CNI Helm chart documents that existing resources need Helm ownership annotations and labels before adoption. Added the required one-time `kubectl annotate` and `kubectl label` commands for the preserved resources.
- The HelmRelease did not set `originalMatchLabels: true`, which the AWS VPC CNI Helm chart requires when adopting the original `aws-node` DaemonSet match labels. Added this value.
- The chart version examples used `1.16.*` and upgraded to `1.17.*`, which are old examples for a 2026 tutorial. Updated the main example to the current `1.21.*` chart line and adjusted the upgrade example to show moving from `1.20.*` to `1.21.*`.

## Review Notes
The VPC CNI environment variables, ENIConfig API version, SecurityGroupPolicy API version, Flux HelmRelease API version, EKS add-on delete command with `--preserve`, and prefix delegation/custom networking/security group explanations were consistent with the consulted official documentation. Local CLI binaries for `aws`, `eksctl`, `kubectl`, and `flux` were not installed in the review environment, so command verification was performed against official documentation rather than local `--help` output.
