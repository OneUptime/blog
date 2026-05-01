# Validation Summary: How to Configure EKS Network Policies with OpenTofu

## Status
validated

## Post Type
Tutorial / infrastructure guide

## Technologies Covered
- Amazon EKS
- Amazon VPC CNI
- Kubernetes NetworkPolicy
- OpenTofu
- AWS provider for OpenTofu/Terraform
- Kubernetes provider for OpenTofu/Terraform
- CoreDNS

## Sources Consulted
- Amazon EKS: Restrict Pod network traffic with Kubernetes network policies - https://docs.aws.amazon.com/eks/latest/userguide/cni-network-policy-configure.html
- Amazon EKS: Limit Pod traffic with Kubernetes network policies - https://docs.aws.amazon.com/eks/latest/userguide/cni-network-policy.html
- Amazon EKS: Troubleshooting Kubernetes network policies For Amazon EKS - https://docs.aws.amazon.com/eks/latest/userguide/network-policies-troubleshooting.html
- Amazon EKS: Manage CoreDNS for DNS in Amazon EKS clusters - https://docs.aws.amazon.com/eks/latest/userguide/managing-coredns.html
- Kubernetes: Network Policies - https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes: Namespaces - https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- OpenTofu CLI docs: Basic CLI Features - https://opentofu.org/docs/cli/commands/
- OpenTofu CLI docs: init - https://opentofu.org/docs/cli/init/
- OpenTofu CLI docs: plan - https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI docs: apply - https://opentofu.org/docs/v1.11/cli/commands/apply/
- HashiCorp AWS provider: `aws_eks_addon` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/eks_addon.html.markdown
- HashiCorp AWS provider: `aws_eks_addon_version` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/eks_addon_version.html.markdown
- HashiCorp Kubernetes provider: `kubernetes_network_policy` - https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/network_policy.md

## Issues Found
- The introduction described EKS network policy enforcement as happening at the VPC networking layer. Current AWS documentation describes enforcement as eBPF-based on supported Amazon EC2 Linux worker nodes, so I corrected the implementation and platform wording.
- The prerequisite `VPC CNI add-on version 1.14.0+` was outdated for current AWS guidance. I updated it to `1.21.0+` and added the Linux node and kernel prerequisites documented by AWS.
- The default-deny example comment implied an immediate zero-trust posture. AWS documents that, in standard mode, new pods can start with default-allow behavior until policies are applied, so I adjusted the wording to reflect enforcement timing.
- The conclusion suggested using VPC Flow Logs for network policy enforcement visibility. AWS documents VPC CNI network policy logs through the node agent and CloudWatch Logs path instead, so I replaced that guidance.

## Review Notes
- The `aws_eks_addon` snippet uses current provider arguments, including `resolve_conflicts_on_update` and JSON-encoded `configuration_values`.
- The `kubernetes_network_policy` examples are consistent with current Kubernetes NetworkPolicy semantics and the current HashiCorp Kubernetes provider schema.
- The DNS policy's selectors are consistent with Kubernetes namespace labeling and EKS CoreDNS defaults.
