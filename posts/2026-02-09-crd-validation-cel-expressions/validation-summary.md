# Validation Summary: How to Implement CRD Validation with CEL Expressions in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes CustomResourceDefinitions
- Kubernetes OpenAPI v3 schemas
- Kubernetes CEL validation rules
- Common Expression Language
- kubectl
- YAML

## Sources Consulted
- Kubernetes documentation: Extend the Kubernetes API with CustomResourceDefinitions - https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/
- Kubernetes API reference: CustomResourceDefinition v1 ValidationRule - https://kubernetes.io/docs/reference/kubernetes-api/apiextensions/custom-resource-definition-v1/
- Kubernetes documentation: Common Expression Language in Kubernetes - https://kubernetes.io/docs/reference/using-api/cel/
- CEL overview - https://cel.dev/overview/cel-overview

## Issues Found
- The list uniqueness rule used the `all()` macro variable as though it were a list index (`self[i]`). Replaced it with element-to-element filtering using distinct macro variables.
- The transition-rule examples used `has(oldSelf)`, but Kubernetes transition rules are skipped on create unless `optionalOldSelf` is used. Removed the invalid guards and clarified that `oldSelf` applies during update validation.
- The transition-rule example used `abs()`, which is not listed in the Kubernetes CEL libraries. Replaced it with two arithmetic comparisons.
- The version transition rule compared strings with `>=`, which would be lexicographic rather than numeric. Changed the `version` field type to integer.
- The metadata examples used namespace, labels, and annotations, but CRD validation rules only expose `apiVersion`, `kind`, `metadata.name`, and `metadata.generateName` from root metadata. Replaced those examples with supported metadata fields and updated the explanation.
- The performance example used a nonexistent `unique()` list function. Replaced it with Kubernetes list-map schema constraints for enforcing unique IDs.
- The existence-check example used `has()` for a map key. Replaced it with the Kubernetes-recommended `in` operator for map key checks.

## Review Notes
The examples remain illustrative partial CRD snippets. For production CRDs, fields referenced by validation rules should usually be marked `required` or guarded with `has()` where optional, and bounded with `maxItems`, `maxLength`, or similar limits when CEL cost estimation depends on collection or string size.
