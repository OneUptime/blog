# Validation Summary: How to Manage Network Policies with OpenTofu on Kubernetes

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Kubernetes
- HashiCorp Kubernetes provider
- HCL
- Kubernetes NetworkPolicy API

## Sources Consulted
- OpenTofu provider configuration documentation: https://opentofu.org/docs/language/providers/configuration/
- OpenTofu provider requirements documentation: https://opentofu.org/docs/language/providers/requirements/
- HashiCorp Kubernetes provider documentation for `kubernetes_network_policy_v1`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/network_policy_v1
- HashiCorp Kubernetes provider documentation for `kubernetes_namespace_v1`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/namespace_v1
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The post title and description were about Kubernetes NetworkPolicy, but the code example was a `kubernetes_deployment` resource. I replaced it with a current `kubernetes_network_policy_v1` example so the implementation matches the topic.
- The provider setup only showed a `provider` block. OpenTofu's official documentation requires declaring provider requirements in a top-level `terraform` block, so I added `required_providers` for the Kubernetes provider.
- The original variables block only supported the removed Deployment example and omitted inputs needed for the corrected NetworkPolicy example. I removed the unused deployment-related variables and added `allowed_namespace`.
- The introduction and conclusion described generic Kubernetes resource management rather than NetworkPolicy-specific behavior. I updated them to reflect actual NetworkPolicy semantics, including the requirement for a network plugin that enforces NetworkPolicy.

## Review Notes
- The example assumes the workload pods selected by `app = var.app_name` already exist in the namespace.
- The example uses the standard `kubernetes.io/metadata.name` namespace label to target a namespace in `namespace_selector`, which matches current Kubernetes documentation.
