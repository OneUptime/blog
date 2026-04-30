# Validation Summary: How to Deploy Helm Charts with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Helm provider for Terraform/OpenTofu (`hashicorp/helm`)
- Helm charts
- Kubernetes
- HCL
- Bitnami NGINX Helm chart

## Sources Consulted
- [OpenTofu `terraform` block settings](https://opentofu.org/docs/language/settings/)
- [OpenTofu provider requirements](https://opentofu.org/docs/language/providers/requirements/)
- [OpenTofu `yamlencode` function](https://opentofu.org/docs/language/functions/yamlencode/)
- [OpenTofu CLI commands overview](https://opentofu.org/docs/cli/commands/)
- [OpenTofu `tofu init` command](https://opentofu.org/docs/v1.8/cli/commands/init/)
- [OpenTofu `tofu plan` command](https://opentofu.org/docs/cli/commands/plan/)
- [OpenTofu `tofu apply` command](https://opentofu.org/docs/v1.11/cli/commands/apply/)
- [HashiCorp Helm provider overview](https://registry.terraform.io/providers/hashicorp/helm/latest/docs)
- [HashiCorp `helm_release` resource documentation](https://registry.terraform.io/providers/hashicorp/helm/latest/docs/resources/release)
- [HashiCorp Helm provider GitHub README](https://github.com/hashicorp/terraform-provider-helm)
- [Bitnami NGINX chart README](https://github.com/bitnami/charts/blob/main/bitnami/nginx/README.md)
- [Bitnami NGINX chart values](https://github.com/bitnami/charts/blob/main/bitnami/nginx/values.yaml)
- [Bitnami chart index](https://charts.bitnami.com/bitnami/index.yaml)

## Issues Found
1. **The post did not deploy a Helm chart at all**: The original article used the Kubernetes provider and raw `kubernetes_*` resources (`kubernetes_namespace`, `kubernetes_deployment`, `kubernetes_service`, `kubernetes_resource_quota`). That contradicts the title and description, which claim to show Helm chart deployment with OpenTofu. I replaced the examples with the Helm provider and a real `helm_release` resource.
2. **Provider configuration was for the wrong provider**: The original `required_providers` block declared `hashicorp/kubernetes`, not `hashicorp/helm`. I corrected the provider requirement and provider block to use Helm provider syntax documented by HashiCorp.
3. **The workload example contained an undefined variable**: The original deployment referenced `var.container_image`, but no such variable was declared. The corrected article now installs a real chart (`bitnamicharts/nginx`) and removes the broken reference.
4. **The prerequisites were misleading**: “Access to a Kubernetes cluster or Docker daemon” is not sufficient for the shown configuration. The Helm provider needs Kubernetes access, typically via kubeconfig or another supported auth method. I corrected the prerequisites accordingly.
5. **The default kube context handling was misleading**: The original article hard-coded `config_context = var.kube_context` with a default of `"default"`, which is often not a real kubeconfig context name. I removed that incorrect defaulted context wiring and kept the provider configuration aligned with the documented file-based auth example.
6. **Outputs referenced Kubernetes service fields instead of Helm release attributes**: The original outputs exposed namespace and service cluster IP from Kubernetes resources that no longer matched the topic. I replaced them with valid `helm_release` outputs (`name`, `namespace`, `status`, and deployed chart version).
7. **The conclusion overstated the workflow**: The original conclusion described the result as “GitOps-style management of Kubernetes resources,” but the article did not implement GitOps. I corrected the conclusion to accurately describe Helm release lifecycle management with OpenTofu.

## Review Notes
- The corrected article now demonstrates version pinning with the Bitnami NGINX chart version `23.0.3`, which was present in Bitnami’s official chart index at review time on April 30, 2026. This value should be refreshed periodically as chart releases move forward.
- The example uses `values = [yamlencode(...)]`, which is valid for `helm_release` because the provider accepts a list of raw YAML strings for Helm values.
- The Helm provider documentation currently shows provider version `3.1.1` as the latest release. The article pins with `~> 3.0`, which is technically valid and avoids floating to a future breaking major version.
- No local `tofu` binary was available in the workspace, so CLI commands were verified against official OpenTofu documentation rather than executed locally.
