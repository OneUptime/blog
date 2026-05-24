# Validation Summary: How to Fix Terraform Kubernetes Connection Refused Errors

## Status
validated

## Post Type
Troubleshooting guide / Tutorial

## Technologies Covered
- Terraform
- Terraform Kubernetes provider (hashicorp/kubernetes)
- Terraform AWS provider (aws_eks_cluster, aws_eks_cluster_auth)
- Terraform Google provider (google_container_cluster, google_client_config)
- Terraform Azure provider (azurerm_kubernetes_cluster)
- Kubernetes (kubectl)
- AWS EKS
- GCP GKE
- Azure AKS
- minikube, kind, Docker Desktop (local clusters)
- CLI tools: aws, gcloud, az, kubectl

## Sources Consulted
- Terraform Kubernetes provider registry: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs
- Terraform AWS provider docs for `aws_eks_cluster` and `aws_eks_cluster_auth`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_cluster
- Terraform Google provider docs for `google_container_cluster`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/data-sources/container_cluster
- Terraform Azurerm provider docs for `azurerm_kubernetes_cluster`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/kubernetes_cluster
- AWS CLI reference for `eks describe-cluster`: https://docs.aws.amazon.com/cli/latest/reference/eks/describe-cluster.html
- gcloud reference for `container clusters describe` and `get-credentials`
- az CLI reference for `aks show` and `aks get-credentials`
- kubectl reference for `config view`, `config get-contexts`, `config use-context`, `cluster-info`
- Terraform debugging docs: https://developer.hashicorp.com/terraform/internals/debugging (TF_LOG)
- minikube and kind CLI documentation

## Issues Found
No technical issues found.

All code examples, CLI commands, JMESPath query strings (`--query`), Terraform provider attributes, and data source field references were verified against current official documentation and are correct:

- The Kubernetes provider attributes used (`host`, `token`, `cluster_ca_certificate`, `client_certificate`, `client_key`, `insecure`, `config_path`, `config_context`) match the provider schema.
- The `aws_eks_cluster.endpoint` and `certificate_authority[0].data` attribute references are accurate.
- The `google_container_cluster` endpoint (without `https://` prefix, requiring it to be prepended) and `master_auth[0].cluster_ca_certificate` references are correct.
- The `azurerm_kubernetes_cluster.kube_config[0]` attribute access pattern is correct.
- All CLI commands and flags (kubectl, aws, gcloud, az, minikube, kind, telnet, nc, curl) are syntactically valid.
- The error message formats shown match standard Go HTTP client and Terraform Kubernetes provider error output.

## Review Notes
- **EKS same-apply timing caveat**: In section 5, the "fix" code block uses data sources (`data "aws_eks_cluster"`) to read cluster info. This pattern works well for subsequent applies (when the cluster already exists), but doesn't fully resolve the underlying issue when the cluster is being created in the same apply, because Terraform provider configuration is evaluated relatively early. The post does correctly recommend the primary fix (two-step approach / separate applies), so the advice is sound overall. Readers facing the same-apply scenario specifically may also benefit from the `exec` plugin auth pattern (using `aws eks get-token` via the Kubernetes provider's `exec` block), which delays authentication to runtime — but this is an enhancement, not a correction.
- **AKS local accounts**: The AKS configuration using `client_certificate` / `client_key` from `kube_config` requires the cluster to have local accounts enabled. AKS clusters with AAD-only authentication would need the `kube_admin_config` block instead, or token-based authentication. This is a minor edge case not addressed in the post.
- **gcloud `--zone` vs `--location`**: The post uses `--zone` consistently, which is still valid for zonal clusters. For regional GKE clusters, `--region` (or `--location`) would be needed. The post's examples are zonal so this is fine.
- No deprecated APIs or commands were used.
