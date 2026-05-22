# Validation Summary: How to Import Existing Kubernetes Resources into Terraform

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform
- Terraform import blocks
- HashiCorp Kubernetes provider
- Kubernetes resources: Namespace, Deployment, Service, ConfigMap, Secret, ServiceAccount, ClusterRole, ClusterRoleBinding, Ingress
- kubectl

## Sources Consulted
- Terraform import language documentation: https://developer.hashicorp.com/terraform/language/import
- Terraform import CLI overview: https://developer.hashicorp.com/terraform/cli/import
- HashiCorp Kubernetes provider documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs
- HashiCorp Kubernetes provider source documentation for provider configuration and resource imports: https://github.com/hashicorp/terraform-provider-kubernetes/tree/main/docs
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The provider setup used `context = var.k8s_context`, but the HashiCorp Kubernetes provider uses `config_context` for selecting a kubeconfig context. Changed it to `config_context = var.k8s_context`.
- The opening explanation said Kubernetes resources are identified by their API path for import operations. The provider documentation shows resource-specific import IDs, commonly `{namespace}/{name}` for namespaced resources and name-only IDs for cluster-scoped resources. Updated the wording to describe provider-specific import IDs.
- The Secret example base64-encoded values in the `data` map. The provider's `data` argument accepts plain string values; base64-encoded values belong in `binary_data` when needed. Changed the example to use plain `username` and `password` strings.

## Review Notes
- The documented import IDs for Namespace, Deployment, Service, ConfigMap, Secret, ServiceAccount, ClusterRole, ClusterRoleBinding, and Ingress match the HashiCorp Kubernetes provider documentation.
- The Terraform `import` blocks are appropriate for Terraform 1.5.0 and later.
- The kubectl commands and flags shown are valid for listing resources and outputting YAML.
- Terraform CLI was not installed in the local environment, so syntax was reviewed against official provider documentation rather than validated with `terraform validate`.
