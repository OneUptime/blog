# Validation Summary: How to Use Terraform for Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (>= 1.5.0)
- HashiCorp AWS Provider (~> 5.0)
- HashiCorp Kubernetes Provider (~> 2.25)
- HashiCorp Helm Provider (~> 2.12)
- gavinbunney/kubectl Provider (~> 1.14)
- HashiCorp Google Provider (GKE auth example)
- AWS EKS (via `terraform-aws-modules/eks/aws` v20.2.0)
- AWS VPC (via `terraform-aws-modules/vpc/aws` v5.4.0)
- Kubernetes core resources: Namespace, Deployment, Service, ConfigMap, Secret, ResourceQuota, LimitRange
- Kubernetes RBAC: ServiceAccount, Role, RoleBinding, ClusterRole, ClusterRoleBinding
- Kubernetes NetworkPolicy
- HorizontalPodAutoscaler v2 (autoscaling/v2)
- Helm charts: ingress-nginx (4.9.0), kube-prometheus-stack (56.0.0)
- Prometheus Operator CRDs: PrometheusRule, ServiceMonitor
- AWS IAM Roles for Service Accounts (IRSA)

## Sources Consulted
- Terraform Kubernetes provider docs: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs
- Terraform Helm provider v2 docs: https://registry.terraform.io/providers/hashicorp/helm/2.17.0/docs (verified that nested `kubernetes { ... }` block and `set { name, value }` block syntax are correct for the 2.x major; these were changed in helm v3.0)
- Terraform AWS provider docs (data sources `aws_eks_cluster`, `aws_eks_cluster_auth`): https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Terraform Google provider docs (`google_container_cluster`, `google_client_config`): https://registry.terraform.io/providers/hashicorp/google/latest/docs
- terraform-aws-modules/eks/aws v20.x release: https://github.com/terraform-aws-modules/terraform-aws-eks/releases
- terraform-aws-modules/vpc/aws v5.4.0: https://github.com/terraform-aws-modules/terraform-aws-vpc/releases
- gavinbunney/kubectl provider: https://registry.terraform.io/providers/gavinbunney/kubectl/latest/docs
- Kubernetes NetworkPolicy spec: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes HPA v2 behavior spec: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/#configurable-scaling-behavior
- Kubernetes TLS Secret type: https://kubernetes.io/docs/concepts/configuration/secret/#tls-secrets
- ingress-nginx Helm chart 4.9.x values: https://github.com/kubernetes/ingress-nginx/tree/main/charts/ingress-nginx
- kube-prometheus-stack 56.x: https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack
- EKS control plane logging types (api, audit, authenticator, controllerManager, scheduler): https://docs.aws.amazon.com/eks/latest/userguide/control-plane-logs.html
- AWS in-tree NLB annotations: https://kubernetes.io/docs/concepts/services-networking/service/#aws-nlb-support

## Issues Found
No technical issues found. All provider configurations, resource block names, argument names, module versions, Helm chart versions, RBAC verbs/resources, network policy semantics, HPA v2 fields, and CLI commands verified against current documentation are correct for the pinned versions.

## Review Notes
- The Helm provider is pinned to `~> 2.12`, so the example syntax (`set { ... }` blocks, nested `kubernetes { ... }` provider block) is correct. If a reader bumps to Helm provider v3.0 they will need to migrate to the new attribute-based syntax (`set = [...]`, `kubernetes = { ... }`). Worth mentioning in a future revision but not an error.
- The AWS in-tree NLB annotations (`service.beta.kubernetes.io/aws-load-balancer-type: nlb`) shown for the NGINX ingress service still work, but newer AWS clusters typically use the AWS Load Balancer Controller with `service.beta.kubernetes.io/aws-load-balancer-type: "external"` and `aws-load-balancer-nlb-target-type` annotations. Not incorrect for this post's scope.
- The example pins Kubernetes version to `1.29`. As of mid-2026 this version is approaching/past end of standard EKS support; users following the guide may want to bump to a supported version. Default is a sensible illustrative choice though.
- The `allow_egress` NetworkPolicy's second `egress` block has only a `ports` clause (no `to`), which permits egress to all destinations on TCP/443. This is technically correct and a common pattern, just worth noting it is intentionally broad.
- The `kubernetes.io/role/elb = 1` and `kubernetes.io/role/internal-elb = 1` subnet tags use integer `1`; the upstream EKS documentation often shows the value as the string `"1"`. HCL/Terraform will marshal the tag value as a string either way, and the terraform-aws-modules examples themselves use the integer form, so this is fine.
