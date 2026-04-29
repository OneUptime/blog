# Validation Summary: How to Manage Services with OpenTofu on Kubernetes

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- Kubernetes
- HashiCorp Kubernetes provider

## Sources Consulted
- OpenTofu docs: Provider Requirements — https://opentofu.org/docs/language/providers/requirements/
- OpenTofu docs: Working with OpenTofu — https://opentofu.org/docs/intro/core-workflow/
- OpenTofu docs: References to Named Values — https://opentofu.org/docs/v1.11/language/expressions/references/
- HashiCorp Kubernetes provider docs: provider configuration — https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/index.md
- HashiCorp Kubernetes provider docs: `kubernetes_service` resource — https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/service.md
- HashiCorp Kubernetes provider docs: `kubernetes_deployment` resource — https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/deployment.md
- HashiCorp Kubernetes provider docs: `kubernetes_namespace` resource — https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/namespace.md
- Kubernetes docs: Service — https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes docs: Deployments — https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes docs: Namespaces — https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/

## Issues Found
1. **The post was about Kubernetes Services, but the example only managed a Deployment.** Added a `kubernetes_service` resource with a selector and port mapping so the code now matches the title, description, and explanation.

2. **The provider setup omitted `required_providers`.** OpenTofu documentation states that each module must declare provider requirements so OpenTofu can install and use them. Added a `terraform` block with `required_providers` for `hashicorp/kubernetes`.

3. **`kube_context` incorrectly defaulted to `"default"`.** The Kubernetes provider uses its default context behavior when `config_context` is omitted, but setting `config_context = "default"` assumes a kubeconfig context literally named `default`, which is not generally true. Removed the default so readers must supply a real context value.

4. **The conclusion referred to “Kubernetes outputs” imprecisely.** In this configuration the relevant OpenTofu feature is resource attribute references, not output values. Updated the wording to reflect that.

## Review Notes
- The example uses the provider’s documented `kubernetes_namespace`, `kubernetes_deployment`, and `kubernetes_service` resources, which remain valid in the current provider docs.
- The example is technically valid without a provider version constraint, but OpenTofu recommends constraining provider versions for reproducibility.
- Using `image_tag = "latest"` works, but pinning an immutable image tag would make real-world deployments more reproducible.
- `tofu` and `terraform` CLIs were not installed in this workspace, so the validation was performed against official documentation rather than local command execution.
