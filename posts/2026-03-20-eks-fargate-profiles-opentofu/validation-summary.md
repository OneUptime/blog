# Validation Summary: How to Set Up EKS with Fargate Profiles Using OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Amazon EKS
- AWS Fargate
- AWS IAM
- AWS CLI
- Kubernetes
- HashiCorp AWS provider
- HashiCorp Kubernetes provider

## Sources Consulted
- Amazon EKS: Define which Pods use AWS Fargate when launched — https://docs.aws.amazon.com/eks/latest/userguide/fargate-profile.html
- Amazon EKS: Get started with AWS Fargate for your cluster — https://docs.aws.amazon.com/eks/latest/userguide/fargate-getting-started.html
- Amazon EKS: Simplify compute management with AWS Fargate — https://docs.aws.amazon.com/eks/latest/userguide/fargate.html
- Amazon EKS: Understand Fargate Pod configuration details — https://docs.aws.amazon.com/eks/latest/userguide/fargate-pod-configuration.html
- Amazon EKS: Amazon EKS Pod execution IAM role — https://docs.aws.amazon.com/eks/latest/userguide/pod-execution-role.html
- AWS Managed Policy Reference: AmazonEKSFargatePodExecutionRolePolicy — https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonEKSFargatePodExecutionRolePolicy.html
- AWS CLI Command Reference: create-fargate-profile — https://docs.aws.amazon.com/cli/latest/reference/eks/create-fargate-profile.html
- Kubernetes: kubectl rollout restart — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- OpenTofu: local-exec Provisioner — https://opentofu.org/docs/language/resources/provisioners/local-exec/
- HashiCorp AWS provider docs: aws_eks_fargate_profile — https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/eks_fargate_profile.html.markdown
- HashiCorp Kubernetes provider docs: kubernetes_namespace_v1 — https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/namespace_v1.md
- HashiCorp Kubernetes provider docs: kubernetes_deployment_v1 — https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/deployment_v1.md
- HashiCorp Kubernetes provider docs: provider usage with managed clusters — https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/index.md

## Issues Found
- The CoreDNS Fargate profile selector was too broad. It matched the entire `kube-system` namespace, but current AWS guidance is to target CoreDNS specifically with `namespace = "kube-system"` and `labels = { "k8s-app" = "kube-dns" }`. I updated the selector so the example aligns with the current EKS Fargate flow.
- The CoreDNS migration step used an older `kubectl patch` approach to remove the `eks.amazonaws.com/compute-type` annotation. Current AWS EKS documentation now uses a CoreDNS-specific Fargate profile plus `kubectl rollout restart`. I replaced the patch command with a restart step.
- The application deployment targeted the `apps` namespace without creating it. That would cause the deployment to fail on a clean cluster. I added a `kubernetes_namespace_v1` resource and wired the deployment to that namespace.
- The Kubernetes resource examples used legacy unsuffixed provider resource names. I updated them to `kubernetes_namespace_v1` and `kubernetes_deployment_v1` to match the current provider documentation.
- The Fargate workload example set only resource requests. Current AWS documentation for EKS on Fargate requires CPU and memory requests to equal limits for all containers. I added matching limits and adjusted CPU to `250m` so the example reflects a standard Fargate-sized request.
- Several comments and prerequisite lines were inaccurate or misleading. I corrected the subnet requirement wording, fixed the selector comment that incorrectly said "any namespace," and updated the pod execution role comment so it no longer implies permissions that the managed policy does not grant.

## Review Notes
- The post assumes the EKS cluster already exists, which matches the stated prerequisites. The Kubernetes provider is most reliable when cluster infrastructure and in-cluster resources are applied separately; the provider documentation still recommends separating those stages when possible.
- AWS now recommends restricting the pod execution role trust policy with an `aws:SourceArn` condition to reduce confused deputy risk. The simpler trust policy shown here still works and matches the AWS provider example, so I left it unchanged to avoid expanding the snippet beyond the fixes required for correctness.
