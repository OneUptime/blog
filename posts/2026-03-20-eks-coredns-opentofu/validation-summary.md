# Validation Summary: How to Deploy CoreDNS on EKS with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS
- Amazon EKS
- Amazon EKS add-ons
- CoreDNS
- Kubernetes
- `kubectl`

## Sources Consulted
- Amazon EKS add-ons: https://docs.aws.amazon.com/eks/latest/userguide/eks-add-ons.html
- Create the CoreDNS Amazon EKS add-on: https://docs.aws.amazon.com/eks/latest/userguide/coredns-add-on-create.html
- Scale CoreDNS Pods for high DNS traffic: https://docs.aws.amazon.com/eks/latest/userguide/coredns-autoscaling.html
- Manage CoreDNS for DNS in Amazon EKS clusters: https://docs.aws.amazon.com/eks/latest/userguide/managing-coredns.html
- AWS CLI `create-addon` reference: https://docs.aws.amazon.com/cli/latest/reference/eks/create-addon.html
- Terraform Registry `aws_eks_addon_version`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/eks_addon_version.html
- Terraform Registry `aws_eks_addon`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_addon.html
- CoreDNS `kubernetes` plugin: https://coredns.io/plugins/kubernetes/
- CoreDNS `forward` plugin: https://coredns.io/plugins/forward
- CoreDNS `health` plugin: https://coredns.io/plugins/health/
- CoreDNS `ready` plugin: https://coredns.io/plugins/ready/
- CoreDNS `cache` plugin: https://coredns.io/plugins/cache/
- CoreDNS `log` plugin: https://coredns.io/plugins/log
- CoreDNS `prometheus` plugin: https://coredns.io/plugins/metrics
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl logs` reference: https://v1-32.docs.kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The introduction stated that CoreDNS on EKS runs as a managed add-on generally. I changed this to say the guide uses the Amazon EKS add-on path, because EKS clusters can also have self-managed CoreDNS depending on how the cluster was created.
- The prerequisites listed Helm and Kubernetes providers, but the documented managed add-on workflow in this post is driven by the AWS provider plus `kubectl` for verification. I corrected the prerequisites accordingly.
- The Step 1 snippet referenced `data.aws_eks_addon_version.coredns.version` without defining the data source. I added the required `aws_eks_cluster` and `aws_eks_addon_version` data sources, enabled `most_recent`, and added `resolve_conflicts_on_create` for the add-on creation path.
- The original Steps 2 through 4 attempted to manage an Amazon EKS-managed CoreDNS add-on by declaring a `kubernetes_deployment`, `kubernetes_config_map`, and a separate HPA. I replaced those examples with the documented `aws_eks_addon.configuration_values` flow, using HCL locals for resource tuning, custom Corefile content, and EKS-managed `autoScaling`.
- The deploy section did not include the rollout verification command AWS documents for CoreDNS add-on updates. I added `kubectl rollout status deployment/coredns --namespace kube-system`.
- The conclusion still described replica scaling generically after the implementation was corrected to use the EKS-managed autoscaling feature. I updated the wording to match the corrected configuration.

## Review Notes
- CoreDNS autoscaling on EKS is version-gated. The cluster platform version and CoreDNS add-on version must meet AWS's documented minimums for `autoScaling` to work.
