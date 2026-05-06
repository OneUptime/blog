# Validation Summary: How to Implement Canary Deployments with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS Application Load Balancer
- AWS target groups
- Kubernetes
- Argo Rollouts
- Helm
- Terraform-compatible HCL
- Prometheus
- Istio

## Sources Consulted
- OpenTofu Settings: https://opentofu.org/docs/language/settings/
- AWS Application Load Balancer rule action types: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/rule-action-types.html
- HashiCorp Helm provider `helm_release`: https://registry.terraform.io/providers/hashicorp/helm/latest/docs/resources/release
- HashiCorp Kubernetes provider `kubernetes_manifest`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/manifest
- Argo Rollouts canary strategy: https://argo-rollouts.readthedocs.io/en/stable/features/canary/
- Argo Rollouts Istio traffic management: https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/istio/
- Argo Rollouts Prometheus analysis: https://argo-rollouts.readthedocs.io/en/stable/analysis/prometheus/
- Argo Rollouts analysis overview: https://argoproj.github.io/argo-rollouts/features/analysis/
- Argo Rollouts best practices: https://argoproj.github.io/argo-rollouts/best-practices/
- Argo Helm chart repository metadata: https://argoproj.github.io/argo-helm/index.yaml

## Issues Found
- The Argo Rollouts example used `analysis { ... }` inside a `kubernetes_manifest` object. That is invalid HCL for the Kubernetes provider's `manifest` argument, so it was changed to `analysis = { ... }`.
- The `helm_release` example omitted `create_namespace = true`. The Helm provider does not create the target namespace by default, so the example could fail on a fresh cluster. `create_namespace = true` was added.
- The post implied that installing Argo Rollouts with `helm_release` and creating `Rollout`/`AnalysisTemplate` resources with `kubernetes_manifest` in the same plan would work with `depends_on`. HashiCorp documents that `kubernetes_manifest` validates schemas at plan time, so the CRDs must already exist. Comments were added to clarify that the controller/CRDs need to be applied first or managed separately.
- The Rollout snippet referenced `canaryService`, `stableService`, and an Istio `VirtualService` without stating that those resources must already exist. A clarifying comment was added.
- The `failureLimit` comment said "3 consecutive failures", but Argo Rollouts defines `failureLimit` as the maximum number of failed measurements allowed. The comment was corrected to "3 failed measurements".
- The Prometheus query was presented as a generic example without noting that metric and label names vary by instrumentation. A short comment was added so readers know to adapt the query to their Prometheus schema.

## Review Notes
- The post's use of the top-level `terraform` block is correct for OpenTofu; OpenTofu's official docs explicitly state that the `terraform` block remains the correct configuration block in v1.x.
- The pinned Argo Helm chart version `2.35.0` is valid in the official chart repository and maps to Argo Rollouts `v1.6.6`, but it is not the newest chart release as of 2026-05-06.
- The AWS ALB example is technically valid, but ALB target group weights are relative weights, not a hard per-user guarantee. The example's `0-100` variable still works because it maps those relative weights onto a 100-point scale.
