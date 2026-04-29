# Validation Summary: How to Build a Microservices Platform with OpenTofu

## Status
validated

## Post Type
Guide / Infrastructure Tutorial

## Technologies Covered
- OpenTofu
- HCL
- Amazon EKS
- EKS managed node groups
- IAM Roles for Service Accounts (IRSA)
- AWS Load Balancer Controller
- Cluster Autoscaler
- ExternalDNS
- Amazon Route 53
- Helm
- Kubernetes namespaces and ResourceQuota

## Sources Consulted
- OpenTofu module source documentation: https://opentofu.org/docs/language/modules/sources/
- terraform-aws-eks module documentation for v20.31.0: https://github.com/terraform-aws-modules/terraform-aws-eks/tree/v20.31.0
- Amazon EKS supported Kubernetes versions: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- Amazon EKS managed node groups: https://docs.aws.amazon.com/eks/latest/userguide/managed-node-groups.html
- Amazon EKS IRSA documentation: https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html
- AWS Load Balancer Controller installation guide: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/deploy/installation/
- AWS EKS charts index: https://aws.github.io/eks-charts/index.yaml
- Amazon EKS Cluster Autoscaler best practices: https://docs.aws.amazon.com/eks/latest/best-practices/cas.html
- Cluster Autoscaler Helm chart and repo index: https://github.com/kubernetes/autoscaler/tree/master/cluster-autoscaler/charts/cluster-autoscaler and https://kubernetes.github.io/autoscaler/index.yaml
- ExternalDNS AWS tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/aws/
- Bitnami ExternalDNS chart values and repo index: https://github.com/bitnami/charts/tree/main/bitnami/external-dns and https://charts.bitnami.com/bitnami/index.yaml
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Terraform Kubernetes provider `kubernetes_resource_quota` documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/resource_quota

## Issues Found
- The post pinned `cluster_version = "1.29"`, which is not a supported Amazon EKS cluster version as of 2026-04-29. I updated it to `1.35` based on the current EKS supported-version matrix.
- The AWS Load Balancer Controller example created an IRSA role but did not attach the controller IAM policy, and its trust policy omitted the documented `:aud` condition. I added the `aud` condition, attached the policy through `var.alb_controller_policy_arn`, set the service account name explicitly, and updated the chart pin from `1.7.2` to current `3.2.2`.
- The Cluster Autoscaler example created an IRSA role but omitted the permissions policy required to discover and scale node groups. I added the least-privilege IAM policy from the Amazon EKS best-practices guide, added the `aud` trust condition, set the service account name explicitly, and pinned the chart to `9.57.0` so it matches Kubernetes `1.35`.
- The ExternalDNS example referenced `aws_iam_role.external_dns` without defining the role and did not grant Route 53 permissions. I added the IRSA role, the Route 53 policy from the ExternalDNS AWS tutorial, the `aud` trust condition, and explicit service account naming.
- The post metadata and section wording overstated the scope by claiming service mesh/API gateway coverage and labeling a quotas-only section as “RBAC.” I corrected the description, intro, tags, section heading, and summary terminology so the article matches the code it actually provides.
- The summary used the retired name “ALB Ingress Controller.” I updated it to the current controller name, `AWS Load Balancer Controller`.

## Review Notes
- As of 2026-04-29, Amazon EKS lists Kubernetes `1.35`, `1.34`, and `1.33` in standard support and `1.32`, `1.31`, and `1.30` in extended support. The original `1.29` example was no longer valid for new clusters.
- `var.alb_controller_policy_arn` must point to an IAM policy created from the AWS Load Balancer Controller upstream `iam_policy.json` for the controller version being installed.
- The AWS Load Balancer Controller can also require explicit `region` and `vpcId` Helm values when IMDS is restricted. The post’s example remains valid for the common EKS setup where the controller can discover those values automatically.
- IRSA remains technically valid, but AWS now also documents EKS Pod Identity as an alternative for granting AWS permissions to workloads and controllers.
