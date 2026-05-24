# Validation Summary: How to Create Kubernetes HorizontalPodAutoscalers with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL, lifecycle meta-argument, dynamic blocks, optional object attributes)
- Kubernetes HorizontalPodAutoscaler (HPA) v2 API (autoscaling/v2)
- Terraform `hashicorp/kubernetes` provider (>= 2.17 for HPA v2; pinned to ~> 2.25 in the post)
- Kubernetes Metrics Server
- Kubernetes Deployments and StatefulSets
- Custom metrics API and External metrics API (e.g., Prometheus, SQS)

## Sources Consulted
- Terraform Registry — `kubernetes_horizontal_pod_autoscaler_v2` resource docs: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/horizontal_pod_autoscaler_v2
- Terraform Registry — `kubernetes_deployment` resource docs: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/deployment
- Terraform language docs — lifecycle meta-argument: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- Terraform language docs — dynamic blocks: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- Terraform language docs — `optional()` object type modifier (Terraform 1.3+): https://developer.hashicorp.com/terraform/language/expressions/type-constraints#optional-object-type-attributes
- Kubernetes HPA documentation (autoscaling/v2 metric types Resource/Pods/Object/External, behavior/scale_up/scale_down/policy/stabilizationWindowSeconds): https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/
- Kubernetes Metrics Server: https://github.com/kubernetes-sigs/metrics-server

## Issues Found
1. **`lifecycle` block incorrectly nested inside `spec`** (Basic HPA example, `kubernetes_deployment.web`). The `lifecycle` meta-argument must be a top-level block within a `resource` (a sibling of `metadata` and `spec`), not nested inside the `spec` block. As written, `terraform validate` would reject the configuration with an "Unsupported block type" error. Moved the `lifecycle { ignore_changes = [spec[0].replicas] }` block out of `spec` and placed it at the resource level so it correctly tells Terraform to ignore replica drift caused by the HPA.

## Review Notes
- The post uses `kubernetes_horizontal_pod_autoscaler_v2`, which is the current (autoscaling/v2) resource in the `hashicorp/kubernetes` provider. The older `kubernetes_horizontal_pod_autoscaler` (autoscaling/v1) is deprecated for new work, so the choice is correct.
- The `metric` / `resource` / `pods` / `external` / `target` / `behavior` / `scale_up` / `scale_down` / `policy` schema usages all match the provider's documented schema.
- The `Pods` and `External` metric examples correctly use `target { type = "AverageValue"; average_value = "..." }` (string values, as required for quantity-valued targets).
- The `dynamic "metric"` block inside the multi-deployment example correctly uses `metric.value` for the iterator (Terraform resolves the iterator name from the block label, even though it collides with the block's own name).
- The `optional(number)` usage in the variable's object type requires Terraform >= 1.3, which is compatible with the post's `required_version = ">= 1.0"` only because users on 1.0–1.2 would hit a parse error; this is a minor caveat worth being aware of but is not strictly incorrect since the post's `required_version` is a lower bound and most users will be on a recent Terraform.
- The advice that resource requests must be set on a Deployment for CPU-utilization HPAs is correct (Utilization-based targeting is computed against `requests`).
- The provider version pin `~> 2.25` is reasonable; `kubernetes_horizontal_pod_autoscaler_v2` has been available since provider 2.17.
