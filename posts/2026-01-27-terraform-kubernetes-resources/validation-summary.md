# Validation Summary: How to Deploy Kubernetes Resources with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- Terraform Kubernetes provider (`hashicorp/kubernetes` ~> 2.23)
- Terraform Helm provider (`hashicorp/helm` ~> 2.11)
- Amazon EKS (AWS provider data sources)
- Kubernetes resources: Namespace, ResourceQuota, Deployment, Service, ConfigMap, Secret, ServiceAccount, Role, RoleBinding, ClusterRole, Ingress v1
- AWS IRSA (IAM Roles for Service Accounts)
- Helm charts: ingress-nginx, kube-prometheus-stack
- Prometheus Operator (PrometheusRule CRD)
- cert-manager

## Sources Consulted
- Terraform Kubernetes provider documentation — https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs
- Terraform Helm provider documentation (v2.x) — https://registry.terraform.io/providers/hashicorp/helm/2.11.0/docs
- Terraform AWS provider `aws_eks_cluster` / `aws_eks_cluster_auth` data sources — https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- ingress-nginx Helm chart releases — https://github.com/kubernetes/ingress-nginx/releases (4.8.0 verified)
- kube-prometheus-stack chart releases — https://github.com/prometheus-community/helm-charts (52.0.0 verified)
- AWS EKS IRSA documentation — https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html
- Kubernetes Ingress API docs — https://kubernetes.io/docs/concepts/services-networking/ingress/
- Prometheus Operator PrometheusRule CRD — https://prometheus-operator.dev/docs/operator/api/

## Issues Found
No technical issues found.

The following items were verified and are correct:
- Provider version constraints (`hashicorp/kubernetes ~> 2.23`, `hashicorp/helm ~> 2.11`) are real published versions.
- Helm provider v2.x syntax (`kubernetes {}` nested provider block, `set { name = ..., value = ... }` blocks, `set_sensitive`, `values = [file(...)]`, `wait`, `wait_for_jobs`, `timeout` in seconds) is consistent with the v2 series.
- `kubernetes_deployment` supports `wait_for_rollout` and `timeouts {}` block.
- `kubernetes_ingress_v1` is the correct resource name (the legacy `kubernetes_ingress` is deprecated).
- `kubernetes_manifest` is a valid resource for raw/custom CRDs.
- `data.aws_eks_cluster.cluster.certificate_authority[0].data` is the correct attribute path (certificate_authority is a list).
- IRSA annotation key `eks.amazonaws.com/role-arn` is correct.
- RBAC `role_ref.api_group = "rbac.authorization.k8s.io"` is correct.
- Helm chart versions referenced (ingress-nginx 4.8.0, kube-prometheus-stack 52.0.0) are real published releases.
- PrometheusRule `apiVersion = "monitoring.coreos.com/v1"` is correct for the Prometheus Operator.
- The escaped-dot syntax in `set { name = "controller.service.annotations.service\\.beta\\.kubernetes\\.io/aws-load-balancer-type" }` is the documented way to handle dots inside Helm key paths.

## Review Notes
- The post uses the deprecated `kubernetes.io/ingress.class` annotation rather than the newer `spec.ingressClassName` field (preferred since Kubernetes 1.18+). The annotation still works in current ingress-nginx releases, so this is not strictly incorrect, but readers using newer clusters should be aware that `ingressClassName` is the modern approach.
- Helm provider v3.x (released after this post's referenced v2.11) introduced breaking syntax changes — `set` becomes a list attribute and the `kubernetes` block becomes a top-level attribute. The post's syntax is consistent with v2.x as declared in `required_providers`, so no change is needed, but a future update may be required when migrating to v3.
- `wait_for_rollout` defaults to `true` on `kubernetes_deployment`; the explicit `true` in the example is harmless but redundant.
- The `kubernetes_secret` example stores credentials in Terraform state in plain text. The post does not call this out explicitly; readers should be reminded to use remote state with encryption or an external secret manager (AWS Secrets Manager, SOPS, sealed-secrets) in production.
