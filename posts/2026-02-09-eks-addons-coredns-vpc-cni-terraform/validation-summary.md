# Validation Summary: How to Configure EKS Add-Ons (CoreDNS, kube-proxy, VPC CNI) with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EKS add-ons
- CoreDNS
- kube-proxy
- Amazon VPC CNI
- Amazon EBS CSI Driver
- Terraform AWS provider
- AWS CLI
- Kubernetes kubectl
- Amazon CloudWatch Container Insights

## Sources Consulted
- Amazon EKS add-ons: https://docs.aws.amazon.com/eks/latest/userguide/eks-add-ons.html
- Create an Amazon EKS add-on: https://docs.aws.amazon.com/eks/latest/userguide/creating-an-add-on.html
- Determine fields you can customize for Amazon EKS add-ons: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-field-management.html
- AWS CLI describe-addon-configuration reference: https://docs.aws.amazon.com/cli/latest/reference/eks/describe-addon-configuration.html
- Terraform AWS provider aws_eks_addon resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_addon
- VPC CNI network policy configuration: https://docs.aws.amazon.com/eks/latest/userguide/cni-network-policy-configure.html
- Manage CoreDNS for DNS in Amazon EKS clusters: https://docs.aws.amazon.com/eks/latest/userguide/managing-coredns.html
- Recent changes to the CoreDNS add-on: https://aws.amazon.com/blogs/containers/recent-changes-to-the-coredns-add-on/
- Manage kube-proxy in Amazon EKS clusters: https://docs.aws.amazon.com/eks/latest/userguide/managing-kube-proxy.html
- Running kube-proxy in IPVS mode: https://aws.github.io/aws-eks-best-practices/networking/ipvs/
- Amazon EKS and Kubernetes Container Insights metrics: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Container-Insights-metrics-EKS.html

## Issues Found
- The post described EKS add-ons as having automatic updates. Updated this to controlled updates/version lifecycle because EKS add-ons are managed through explicit create/update operations rather than automatically upgraded by EKS in all Terraform-managed workflows.
- The VPC CNI example used invalid configuration keys `ENABLE_NETWORK_POLICY` and `ENABLE_POD_SECURITY_GROUP`. Replaced network policy configuration with the supported top-level `enableNetworkPolicy` key and removed the invalid pod security group key; `ENABLE_POD_ENI` is the documented setting for security groups for pods.
- The CoreDNS example created a separate `coredns-custom` ConfigMap, which is not consumed by the default EKS-managed CoreDNS Corefile. Replaced it with the supported `corefile` add-on configuration value and included the default EKS CoreDNS plugins needed for readiness and health behavior.
- The CoreDNS PDB configuration omitted the `enabled` property. Added `enabled = true` to match the documented configurable PDB schema.
- The kube-proxy example nested `conntrack` and `iptables` under a non-schema `config` object. Moved these settings to the top level of `configuration_values`, matching kube-proxy configuration fields used by EKS add-on configuration.
- The CloudWatch dashboard used non-existent `AWS/EKS` metrics named `AddonHealth` and `AddonUpdateDuration`. Replaced the example with documented `ContainerInsights` metrics for kube-system running pods and pod restart monitoring.

## Review Notes
- The hard-coded add-on versions are examples and may not be compatible with every Kubernetes minor version; production Terraform should continue using `aws_eks_addon_version` or `aws eks describe-addon-versions` to confirm compatibility.
- `configuration_values` schemas vary by add-on version. The post now uses fields documented for the referenced examples, but users should still verify the exact schema for their selected add-on version.
- Terraform and AWS CLI were not installed in the local workspace, so local command execution validation was limited to source review against official documentation.
