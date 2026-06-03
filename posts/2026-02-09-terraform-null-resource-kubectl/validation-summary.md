# Validation Summary: How to Build Terraform Null Resource with Local-Exec for kubectl Commands

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terraform null provider
- Terraform Kubernetes provider
- Terraform local-exec provisioners
- Terraform local provider data sources
- Kubernetes
- kubectl
- Istio Gateway custom resources

## Sources Consulted
- HashiCorp Terraform provisioners documentation: https://developer.hashicorp.com/terraform/language/provisioners
- HashiCorp null_resource provider documentation: https://registry.terraform.io/providers/hashicorp/null/latest/docs/resources/resource.html
- HashiCorp Kubernetes provider tutorial and kubernetes_manifest documentation: https://developer.hashicorp.com/terraform/tutorials/kubernetes/kubernetes-provider
- HashiCorp jsonencode function documentation: https://developer.hashicorp.com/terraform/language/functions/jsonencode
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes kubectl delete reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- HashiCorp local_file data source documentation: https://registry.terraform.io/providers/hashicorp/local/latest/docs/data-sources/file.html

## Issues Found
- The raw manifest destroy-time provisioner referenced `${path.module}` directly. Destroy-time provisioners should rely on values available through the parent resource, so the manifest paths are now stored in `triggers` and referenced through `self.triggers`.
- The Istio Gateway destroy-time provisioner referenced input variables directly. The gateway name and namespace are now stored in `triggers` and referenced through `self.triggers` for destroy.
- The Istio Gateway YAML rendered wildcard hosts such as `*.example.com` unquoted, which is invalid YAML because `*` starts an alias. Host values are now rendered with `jsonencode(host)`, producing YAML-compatible quoted strings.
- The kubeconfig example used `~/.kube/config` directly in a `--kubeconfig=` argument and environment value. Shell tilde expansion does not apply in that argument form, so the example now uses Terraform's `pathexpand()` function.
- The custom resource wording implied there is no Terraform support for custom resources. It now notes that `kubectl` is useful when native resources such as `kubernetes_manifest` are not suitable.

## Review Notes
The `null_resource` examples are technically valid, but HashiCorp now recommends `terraform_data` for many provisioner-only use cases in Terraform 1.4 and later. The post remains valid because it specifically teaches the still-supported `null_resource` pattern.
