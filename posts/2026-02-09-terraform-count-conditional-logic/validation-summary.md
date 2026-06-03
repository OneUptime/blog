# Validation Summary: How to Use Terraform Count and Conditional Logic for Kubernetes Resources

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terraform `count` meta-argument
- Terraform conditional expressions
- Terraform dynamic blocks
- HashiCorp Kubernetes provider
- Kubernetes Deployments
- Kubernetes HorizontalPodAutoscalers
- Kubernetes PodDisruptionBudgets
- Kubernetes Ingresses
- Kubernetes NetworkPolicies
- Kubernetes volumes, init containers, and sidecar containers

## Sources Consulted
- HashiCorp Terraform count meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/count
- HashiCorp Terraform conditional expressions reference: https://developer.hashicorp.com/terraform/language/expressions/conditionals
- HashiCorp Terraform dynamic blocks reference: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- HashiCorp Kubernetes provider `kubernetes_deployment_v1` documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/deployment_v1
- HashiCorp Kubernetes provider `kubernetes_horizontal_pod_autoscaler_v2` documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/horizontal_pod_autoscaler_v2
- HashiCorp Kubernetes provider `kubernetes_pod_disruption_budget_v1` documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/pod_disruption_budget_v1
- HashiCorp Kubernetes provider `kubernetes_ingress_v1` documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/ingress_v1
- HashiCorp Kubernetes provider `kubernetes_network_policy` documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/network_policy
- HashiCorp Kubernetes provider `kubernetes_namespace_v1` documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/namespace_v1

## Issues Found
- The PodDisruptionBudget example used `min_available = 2`, but the current Kubernetes provider schema documents `min_available` as a string value. Changed it to `min_available = "2"`.
- The Ingress example used the deprecated `kubernetes.io/ingress.class` annotation. Changed it to `ingress_class_name = "nginx"` in the Ingress spec while keeping the conditional cert-manager annotation.
- The conditional sidecar example used nested block syntax (`port {}` and `volume_mount {}`) inside Terraform object expressions in `locals`, which is invalid HCL. Changed those objects to use `ports` and `volume_mounts` attributes, then iterated over those attributes in the existing dynamic `port` and `volume_mount` blocks.

## Review Notes
The remaining examples align with Terraform's documented `count`, conditional expression, and dynamic block behavior, and the Kubernetes provider resources and nested block names checked are current. The local environment did not have the Terraform CLI installed, so validation was performed by source review against official documentation rather than by running `terraform validate`.
