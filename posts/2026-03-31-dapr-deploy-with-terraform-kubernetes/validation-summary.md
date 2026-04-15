# Validation Summary: How to Deploy Dapr with Terraform on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (runtime and control plane)
- Terraform (Infrastructure as Code)
- Kubernetes
- Helm (via Terraform Helm provider)
- Dapr Dashboard

## Sources Consulted
- Dapr Helm charts repository index: https://dapr.github.io/helm-charts/index.yaml
- Dapr Helm chart values.yaml (GitHub): https://github.com/dapr/dapr/tree/master/charts/dapr
- Dapr HA configuration documentation: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/#enabling-high-availability-in-your-dapr-deployment
- Terraform Helm provider registry: https://registry.terraform.io/providers/hashicorp/helm/latest/docs
- Terraform Kubernetes provider registry: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs
- Dapr Dashboard GitHub repository: https://github.com/dapr/dashboard

## Issues Found

### 1. Invalid Helm value: `dapr_placement.replicaCount`
- **What was wrong:** The post set `dapr_placement.replicaCount` to `"3"` in the helm_release resource. The Dapr placement service is deployed as a StatefulSet and does not expose a `replicaCount` value in its subchart. Placement HA is controlled via `global.ha.enabled` and `global.ha.replicaCount`.
- **What was changed:** Replaced the `dapr_placement.replicaCount` set block with `global.ha.enabled` set to `"true"`, which enables HA mode for the Dapr control plane including 3 placement replicas by default.
- **Why:** Setting `dapr_placement.replicaCount` would be silently ignored by Helm, leaving placement with only 1 replica despite the post's intent to configure HA.

### 2. Dapr Dashboard chart not available from specified repository
- **What was wrong:** The `helm_release` for `dapr-dashboard` referenced `repository = "https://dapr.github.io/helm-charts/"`, but this repository only publishes the main `dapr` chart. The `dapr-dashboard` chart is not available there, so `terraform apply` would fail with a chart-not-found error.
- **What was changed:** Updated the section to reference the chart from the Dapr Dashboard GitHub repository directly (local path after cloning), and added the Dapr CLI as an alternative installation method.
- **Why:** The original code would fail at apply time. The dashboard chart must be sourced from its own GitHub repository.

## Review Notes
- The `hashicorp/helm` (`~> 2.12`) and `hashicorp/kubernetes` (`~> 2.25`) provider version constraints are functional but both providers have since moved to 3.x major versions. The specified constraints remain valid for existing deployments but new projects may want to adopt the 3.x providers.
- The `variables.tf` section defines `dapr_version`, `environment`, and `operator_replicas` variables but the `helm_release` resource uses hardcoded values rather than referencing these variables (e.g., `var.dapr_version`). Both code blocks are independently valid HCL, but a reader following the tutorial end-to-end would need to connect them manually.
- Dapr version 1.13.0 is not the latest release. Newer 1.13.x patch versions (up to 1.13.6) and later minor versions are available. The post is accurate for the version it specifies.
- `global.mtls.enabled` defaults to `true` in the Dapr Helm chart, so the explicit set block is redundant but not harmful — it serves as documentation of intent.
