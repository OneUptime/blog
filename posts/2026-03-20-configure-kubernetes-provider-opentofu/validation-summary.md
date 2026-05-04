# Validation Summary: How to Configure the Kubernetes Provider in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- OpenTofu
- HashiCorp Kubernetes provider (`hashicorp/kubernetes`)
- AWS EKS (`aws_eks_cluster`, `aws_eks_cluster_auth` data sources)
- Azure AKS (`azurerm_kubernetes_cluster` resource)
- Google GKE (`google_container_cluster` resource, `google_client_config` data source)
- HCL configuration syntax
- Provider aliasing for multi-cluster setups

## Sources Consulted
- HashiCorp Kubernetes provider documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs
- AWS provider `aws_eks_cluster` and `aws_eks_cluster_auth` data source docs
- AzureRM provider `azurerm_kubernetes_cluster` resource docs (kube_config block)
- Google provider `google_container_cluster` resource and `google_client_config` data source docs
- OpenTofu documentation on provider configuration and the `terraform { required_providers {} }` block
- OpenTofu Registry behavior for provider source addresses (defaults to `registry.opentofu.org`)

## Issues Found
No technical issues found.

All code examples were verified against official documentation:
- `config_path`, `config_context`, `host`, `cluster_ca_certificate`, `token`, `client_certificate`, `client_key` are all valid Kubernetes provider arguments.
- EKS attributes (`endpoint`, `certificate_authority[0].data`, `token` from `aws_eks_cluster_auth`) are correct.
- AKS `kube_config[0]` attribute names are correct, and `base64decode()` is correctly applied only to certificate/key fields (not to `host`).
- GKE configuration correctly prepends `https://` to the endpoint and applies `base64decode()` to `master_auth[0].cluster_ca_certificate`.
- OpenTofu uses the same `terraform { required_providers {} }` block as Terraform, and `hashicorp/kubernetes` is a valid source address that resolves through the OpenTofu Registry.
- Provider aliasing syntax (`provider = kubernetes.prod`) inside a resource block is correct.

## Review Notes
- The `~> 2.0` version constraint is permissive and allows any 2.x release of the provider. Current 2.x releases remain the actively maintained line, so this is appropriate.
- The post correctly distinguishes which `kube_config` fields require `base64decode()` (certs/keys) from those that do not (`host`).
- The advice in the conclusion to prefer dynamic, token-based authentication for CI/CD pipelines aligns with provider best practices documented by HashiCorp.
