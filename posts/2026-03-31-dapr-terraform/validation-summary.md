# Validation Summary: How to Use Dapr with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (distributed application runtime)
- Terraform (infrastructure as code)
- Helm (Kubernetes package manager)
- Kubernetes
- Redis (as Dapr state store backing service)
- Azure (Azure Cache for Redis module referenced)

## Sources Consulted
- Dapr Helm chart repository index: https://dapr.github.io/helm-charts/
- Dapr Helm chart values.yaml (GitHub): https://github.com/dapr/dapr/blob/master/charts/dapr/values.yaml
- Dapr documentation — Redis state store component: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr documentation — Referencing secrets in components: https://docs.dapr.io/operations/components/component-secrets/
- Terraform Registry — Helm provider (`hashicorp/helm`): https://registry.terraform.io/providers/hashicorp/helm/latest/docs
- Terraform Registry — Kubernetes provider (`hashicorp/kubernetes`): https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs
- Terraform Registry — `helm_release` resource: https://registry.terraform.io/providers/hashicorp/helm/latest/docs/resources/release
- Terraform Registry — `kubernetes_manifest` resource: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/manifest
- Terraform Registry — `kubernetes_secret` resource: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/secret_v1

## Issues Found
No technical issues found.

## Review Notes
- **Terraform provider versions are pinned to 2.x while 3.x is available.** The Helm provider constraint `~> 2.12` pins to the 2.x line (latest 2.x is 2.17.0), while the current major is 3.1.1. Similarly, the Kubernetes provider constraint `~> 2.24` pins to 2.x (latest 2.x is 2.38.0), while the current major is 3.0.1. The 2.x constraints are still valid and functional, but readers starting new projects may want to evaluate the 3.x providers.
- **Dapr version 1.13.0 is not the latest.** The specified Helm chart version 1.13.0 is a valid release but the latest stable Dapr version is 1.17.4. Readers should consider using a more recent version for new deployments.
- **The `wait = true` and `timeout = 300` values in the `helm_release` are defaults.** They are explicitly set in the example, which is fine for clarity but technically redundant.
- **The `ha_enabled` variable is a `bool` type but used in a Helm `set` block whose `value` attribute expects a string.** Terraform will auto-convert the bool to `"true"` or `"false"`, so this works correctly, though using `tostring(var.ha_enabled)` would make the conversion explicit.
