# Validation Summary: How to Manage Crds Kubernetes with OpenTofu on Kubernetes

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- OpenTofu
- Kubernetes
- HashiCorp Kubernetes provider for OpenTofu/Terraform
- Kubernetes CustomResourceDefinitions (CRDs)
- HCL configuration language

## Sources Consulted
- [OpenTofu provider requirements documentation](https://opentofu.org/docs/language/providers/requirements/)
- [Terraform Kubernetes provider `kubernetes_manifest` resource documentation](https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/manifest)
- [HashiCorp tutorial: Manage Kubernetes resources with Terraform](https://developer.hashicorp.com/terraform/tutorials/kubernetes/kubernetes-provider)
- [Kubernetes documentation: Custom Resources](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/)
- [Kubernetes documentation: Extend the Kubernetes API with CustomResourceDefinitions](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/)

## Issues Found
1. **The article did not actually cover CRDs**: The original code used `kubernetes_namespace` and `kubernetes_deployment`, which are unrelated to CustomResourceDefinitions. Replaced the example with a validated `kubernetes_manifest` CRD definition using `apiextensions.k8s.io/v1`, which is the correct provider/resource pattern for CRDs.
2. **The explanation implied a generic built-in resource workflow**: Managing CRDs with `kubernetes_manifest` has an important plan-time dependency on the live cluster schema. Updated the introduction and conclusion to clarify that the cluster must already be reachable during planning and that custom resources depending on a CRD should be created only after the CRD has been applied.
3. **The variable set was for a Deployment, not a CRD**: Replaced the app/deployment variables with CRD-specific variables (`group`, `kind`, `plural`, `scope`, and version metadata) so the configuration now matches the post topic and the code example.
4. **The provider requirement was implicit**: Added an explicit `required_providers` block so the Kubernetes provider source is clear and aligned with current OpenTofu provider requirement guidance.

## Review Notes
- The corrected CRD example uses `apiextensions.k8s.io/v1`, which is the supported API; the legacy `v1beta1` CRD API was removed in Kubernetes v1.22.
- The `openAPIV3Schema` included in the corrected example is structural, which is required for `apiextensions.k8s.io/v1` CRDs.
- `kubernetes_manifest` is appropriate here because the provider documentation recommends it for custom resources and resources not yet covered by first-class resource types.
