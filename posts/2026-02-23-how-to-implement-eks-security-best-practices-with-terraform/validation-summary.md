# Validation Summary: How to Implement EKS Security Best Practices with Terraform

## Status
validated

## Post Type
Guide

## Technologies Covered
- Amazon EKS
- Terraform AWS provider
- Terraform Kubernetes provider
- Terraform Helm provider
- Kubernetes NetworkPolicy
- Kubernetes Pod Security Admission
- AWS IAM Roles for Service Accounts
- AWS KMS and CloudWatch Logs
- Calico

## Sources Consulted
- Amazon EKS documentation: Understand the Kubernetes version lifecycle on EKS: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- Amazon EKS documentation: Create nodes with optimized Amazon Linux AMIs: https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html
- Amazon EKS documentation: Guide to EKS AL2 and AL2-Accelerated AMIs transition features: https://docs.aws.amazon.com/eks/latest/userguide/eks-ami-deprecation-faqs.html
- Amazon EKS documentation: Create an IAM OIDC provider for your cluster: https://docs.aws.amazon.com/eks/latest/userguide/enable-iam-roles-for-service-accounts.html
- Amazon EKS documentation: View Amazon EKS security group requirements for clusters: https://docs.aws.amazon.com/eks/latest/userguide/sec-group-reqs.html
- AWS Containers Blog: Introducing launch template and custom AMI support in Amazon EKS Managed Node Groups: https://aws.amazon.com/blogs/containers/introducing-launch-template-and-custom-ami-support-in-amazon-eks-managed-node-groups/
- Terraform AWS provider documentation: aws_eks_cluster: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_cluster
- Terraform AWS provider documentation: aws_eks_node_group: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_node_group
- Terraform Helm provider documentation: helm_release: https://registry.terraform.io/providers/hashicorp/helm/latest/docs/resources/release
- Terraform Kubernetes provider documentation: kubernetes_network_policy: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/network_policy
- Kubernetes documentation: Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes documentation: Pod Security Admission: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Calico documentation: Installing with Helm: https://docs.tigera.io/calico/latest/getting-started/kubernetes/helm
- Calico documentation: Installing on EKS: https://docs.tigera.io/calico/latest/getting-started/kubernetes/managed-public-cloud/eks

## Issues Found
- The cluster example used Kubernetes version `1.29`, which is no longer available in EKS standard or extended support on 2026-05-22. Changed it to `1.33`, which is in EKS standard support.
- The node group example used the AL2 AMI type. Amazon EKS stopped publishing EKS-optimized AL2 AMIs after November 26, 2025, and Kubernetes `1.32` was the last EKS version with AL2 AMIs. Changed the node group to `AL2023_x86_64_STANDARD`.
- The managed node group specified `disk_size` in the node group while also using a launch template, which AWS documents as an invalid combination. Removed `disk_size` and kept the encrypted root volume settings in the launch template.
- The launch template specified `image_id` while the node group also specified an EKS optimized `ami_type`. For managed node groups, an AMI ID in the launch template is treated as custom AMI usage and should not be combined with AMI type. Removed the explicit `image_id` so EKS selects the optimized AL2023 AMI.
- The Calico Helm example used an older chart version and omitted the current Helm install pattern for EKS. Updated the version to `v3.32.0`, added the Calico CRD chart, and set `installation.kubernetesProvider` to `EKS`.
- The Helm provider `set` example used block syntax. Updated it to the current `set = [{ ... }]` form shown in the Helm provider documentation.
- The DNS NetworkPolicy egress rule allowed UDP/53 to every namespace. Changed it to target CoreDNS in the `kube-system` namespace and added TCP/53 for DNS fallback.
- The ingress namespace selector used a custom `name` label that is not guaranteed to exist on namespaces. Changed it to the built-in `kubernetes.io/metadata.name` namespace label.

## Review Notes
- The examples remain partial Terraform snippets and still assume supporting resources such as VPCs, subnets, IAM roles, KMS keys, providers, and the `production` namespace exist or are defined elsewhere.
- The HTTPS egress rule intentionally allows TCP/443 broadly. Production environments may want narrower egress controls through VPC endpoints, proxies, or a CNI-specific policy model.
