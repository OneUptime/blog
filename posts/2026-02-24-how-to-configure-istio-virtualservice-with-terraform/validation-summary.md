# Validation Summary: How to Configure Istio VirtualService with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService
- Istio Gateway
- Istio DestinationRule subsets
- Terraform
- Terraform Kubernetes provider
- Kubernetes custom resources

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Terraform Kubernetes provider tutorial for `kubernetes_manifest`: https://developer.hashicorp.com/terraform/tutorials/kubernetes/kubernetes-provider
- Terraform `apply` command reference: https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform language syntax reference: https://developer.hashicorp.com/terraform/language/syntax/configuration
- Terraform types and values reference: https://developer.hashicorp.com/terraform/language/expressions/types

## Issues Found
- The canary and header-based routing examples used Istio subsets without mentioning that subsets must be declared in a corresponding DestinationRule. Added short notes before/after those examples so readers understand the prerequisite.
- The retry explanation said `perTryTimeout` multiplied by `attempts` should be less than or equal to the route timeout. Istio defines `attempts` as the number of retries, with a maximum request count of `1 + attempts`, and the actual retries also depend on route timeout and backoff. Reworded the explanation to match the Istio reference.
- The closing paragraph implied Terraform state shows what changed and when, and that Terraform plan catches misconfiguration before it reaches the cluster. Terraform state records current managed configuration, not change history by itself, and planning catches many but not all issues. Reworded the paragraph to describe version control or CI/CD audit trails, current state inspection, and plan-time validation more accurately.

## Review Notes
Terraform CLI was not installed in the local environment, so CLI behavior was verified against the official Terraform command reference instead of local `terraform --help` output. The HCL examples use the current Istio `networking.istio.io/v1` API and the HashiCorp Kubernetes provider's `kubernetes_manifest` pattern for custom resources.
