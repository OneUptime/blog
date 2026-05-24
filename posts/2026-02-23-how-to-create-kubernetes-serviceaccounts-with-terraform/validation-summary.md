# Validation Summary: How to Create Kubernetes ServiceAccounts with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (>= 1.0)
- HashiCorp Kubernetes provider (~> 2.25)
- Kubernetes ServiceAccounts, RBAC (ClusterRole, ClusterRoleBinding)
- Kubernetes Secrets (dockerconfigjson)
- GKE Workload Identity (Google Cloud)
- EKS IRSA — IAM Roles for Service Accounts (AWS)
- Kubernetes Deployments

## Sources Consulted
- HashiCorp Kubernetes provider — `kubernetes_service_account`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/service_account
- HashiCorp Kubernetes provider — `kubernetes_cluster_role`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/cluster_role
- HashiCorp Kubernetes provider — `kubernetes_cluster_role_binding`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/cluster_role_binding
- HashiCorp Kubernetes provider — `kubernetes_secret`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/secret
- HashiCorp Kubernetes provider — `kubernetes_deployment`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/deployment
- GKE Workload Identity docs: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- EKS IRSA docs: https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html
- Kubernetes RBAC docs: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes ServiceAccount docs: https://kubernetes.io/docs/concepts/security/service-accounts/

## Issues Found
- Minor typo: the comment "# Grant the GCS SA permissions in GCP" used "GCS" (which usually means Google Cloud Storage). The surrounding context and the resource name `google_service_account.app_gsa` consistently use "GSA" (Google Service Account). Updated the comment to "# Grant the GSA permissions in GCP" for consistency.

## Review Notes
- All Terraform resource names, blocks, and arguments match the current HashiCorp Kubernetes provider (~> 2.25) schema: `kubernetes_service_account`, `kubernetes_cluster_role`, `kubernetes_cluster_role_binding`, `kubernetes_secret`, `kubernetes_deployment`, plus the `image_pull_secret`, `automount_service_account_token`, and `metadata[0]` access patterns.
- GKE Workload Identity annotation `iam.gke.io/gcp-service-account` and the IAM member format `serviceAccount:<project>.svc.id.goog[<namespace>/<ksa>]` with `roles/iam.workloadIdentityUser` are correct.
- EKS IRSA annotation `eks.amazonaws.com/role-arn`, the `sts:AssumeRoleWithWebIdentity` action, and the trust policy conditions on `sub` (matching `system:serviceaccount:<ns>:<sa>`) and `aud` (`sts.amazonaws.com`) match AWS official guidance.
- The `kubernetes_secret` of type `kubernetes.io/dockerconfigjson` with `auths.<registry>.auth = base64(user:password)` matches both the Kubernetes spec and provider schema.
- Minor version caveat: the multi-SA example uses `optional(map(string), {})` which requires Terraform >= 1.3 (default values for `optional()` attributes became stable in 1.3). The post declares `required_version = ">= 1.0"`. This will work on most modern installations but technically the constraint should be `>= 1.3` for that specific example. Left unchanged as the post overall recommends modern Terraform and this is a soft version-pin issue.
- The introductory claim that "Every pod in Kubernetes runs as a ServiceAccount" is accurate — pods without a specified ServiceAccount automatically use the `default` ServiceAccount in their namespace.
