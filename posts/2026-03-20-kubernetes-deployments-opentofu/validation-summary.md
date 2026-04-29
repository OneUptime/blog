# Validation Summary: How to Manage Deployments with OpenTofu on Kubernetes

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Kubernetes
- HashiCorp Kubernetes provider
- Kubernetes Deployments
- Kubernetes Namespaces
- HCL

## Sources Consulted
- OpenTofu Provider Requirements: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu Provider Configuration: https://opentofu.org/docs/language/providers/configuration/
- HashiCorp Kubernetes provider overview: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/index.md
- HashiCorp Kubernetes provider `kubernetes_namespace` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/namespace.md
- HashiCorp Kubernetes provider `kubernetes_deployment` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/deployment.md
- Kubernetes Deployments: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Resource Management for Pods and Containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes kubeconfig v1 reference: https://kubernetes.io/docs/reference/config-api/kubeconfig.v1/

## Issues Found
- The post omitted the `required_providers` declaration. I added a `terraform { required_providers { ... } }` block because OpenTofu configurations must declare provider requirements before installing and using the Kubernetes provider.
- The example defaulted `kube_context` to `"default"`. I removed that default because `config_context` must match a real kubeconfig context name, and a context literally named `default` is not generally guaranteed to exist.
- The conclusion overstated two recommendations. I changed "Always set resource requests and limits" to "Set appropriate resource requests and limits" and clarified namespaces as providing "logical isolation and scoping" to better match Kubernetes documentation.

## Review Notes
- The post uses `kubernetes_namespace` and `kubernetes_deployment` rather than the `_v1` aliases. These unversioned resource names are still documented in the current Kubernetes provider, so no change was required.
- The provider example's `config_path = "~/.kube/config"` is consistent with the current Kubernetes provider documentation.
- `tofu` was not installed in this workspace, so the review was completed against official documentation rather than by executing the snippet locally.
