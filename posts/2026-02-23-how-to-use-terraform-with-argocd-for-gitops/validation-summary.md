# Validation Summary: How to Use Terraform with ArgoCD for GitOps

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- AWS EKS
- Terraform AWS, Kubernetes, and Helm providers
- terraform-aws-modules/eks/aws
- Argo CD
- Argo CD Helm chart
- Kubernetes custom resources, namespaces, and secrets
- GitOps

## Sources Consulted
- Amazon EKS Kubernetes version lifecycle: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- AWS CLI `eks get-token` command reference: https://docs.aws.amazon.com/cli/latest/reference/eks/get-token.html
- Terraform `bcrypt` function documentation: https://docs.hashicorp.com/terraform/language/functions/bcrypt
- HashiCorp tutorial for managing Kubernetes resources with Terraform, including `kubernetes_manifest` CRD planning behavior: https://developer.hashicorp.com/terraform/tutorials/kubernetes/kubernetes-provider
- Terraform Kubernetes provider `kubernetes_manifest` documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/manifest
- Terraform Helm provider `helm_release` documentation: https://registry.terraform.io/providers/hashicorp/helm/latest/docs/resources/release
- Argo CD declarative setup documentation for Applications, AppProjects, and repository Secrets: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Helm chart metadata: https://raw.githubusercontent.com/argoproj/argo-helm/main/charts/argo-cd/Chart.yaml
- Argo CD Helm chart values: https://raw.githubusercontent.com/argoproj/argo-helm/main/charts/argo-cd/values.yaml

## Issues Found
- The EKS example used Kubernetes `1.29`, which is past the Amazon EKS extended support end date as of 2026-05-22. Changed the example cluster version to `1.35`, which is currently listed by AWS as available in standard support.
- The Argo CD Helm chart was pinned to `5.51.0`, an old chart release. Updated it to the current upstream chart version `9.5.15`.
- The Helm release used `bcrypt(var.argocd_admin_password)` directly in a Terraform resource argument. Terraform documents that `bcrypt` uses a random salt and can cause spurious diffs when used this way. Changed the example to use a precomputed `var.argocd_admin_password_hash` and added `configs.secret.argocdServerAdminPasswordMtime`.
- The post implied that Argo CD `Application` and `AppProject` custom resources could be planned immediately after the Helm release in one flow. Terraform validates `kubernetes_manifest` resources against the Kubernetes API during planning, so the Argo CD CRDs must already exist. Added a note to apply the cluster and Helm release first or keep the custom resources in a separate workspace.
- The infrastructure handoff example created a Secret in the `production` namespace without ensuring that namespace existed. Added a `kubernetes_namespace.production` resource and made the Secret reference it.

## Review Notes
- The Terraform and Helm CLI binaries were not installed in the local environment, so local execution was not possible. The review was performed against official documentation and upstream chart metadata.
- The snippets remain illustrative and still depend on surrounding variables and modules such as `module.vpc`, `module.rds`, `module.elasticache`, and `module.s3`.
- Repository credentials and application infrastructure outputs stored as Kubernetes Secrets will also be stored in Terraform state by the Kubernetes provider; production setups should protect state access carefully or use an external secret-management flow.
