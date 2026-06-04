# Validation Summary: How to Implement Custom Resource Validation with Transition Rules in CEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes CustomResourceDefinition API (`apiextensions.k8s.io/v1`)
- Kubernetes CEL validation rules (`x-kubernetes-validations`)
- CEL transition rules using `self` and `oldSelf`
- kubectl apply and patch commands

## Sources Consulted
- Kubernetes documentation: Extend the Kubernetes API with CustomResourceDefinitions - https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/
- Kubernetes documentation: Common Expression Language in Kubernetes - https://kubernetes.io/docs/reference/using-api/cel/
- Kubernetes API reference: CustomResourceDefinition `ValidationRule` - https://kubernetes.io/docs/reference/kubernetes-api/apiextensions/custom-resource-definition-v1/
- Kubernetes kubectl reference: `kubectl patch` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes blog: CustomResourceDefinition Validation Rules Graduate to Beta - https://kubernetes.io/blog/2022/09/23/crd-validation-rules-beta/

## Issues Found
- Corrected the explanation that `!has(oldSelf.storageGB)` handles creation. Kubernetes transition rules do not run on create by default; the guard is useful for updates where the old object lacks the field.
- Added `required` declarations to examples where CEL expressions directly access fields such as `self.storageGB`, `self.state`, `self.replicas`, and `self.allowedUsers`. This aligns the schema with the expressions' presence assumptions.
- Changed the database `version` example from a string to an integer so `>=` represents a numeric upgrade check rather than lexicographic string ordering.
- Replaced `oldSelf.nodeCount * 0.5` with `self.nodeCount * 2 >= oldSelf.nodeCount` to avoid mixing Kubernetes CEL integer and double arithmetic.
- Updated the date-time rate-limit rule to subtract `self.lastScaleTime` and `oldSelf.lastScaleTime` directly, because Kubernetes maps `format: date-time` fields to CEL timestamp values.
- Added `maxItems` and `maxLength` bounds to the list validation example so CEL list/string iteration has explicit schema limits.
- Clarified the testing section to state that the sample assumes a `Database` CRD combining the relevant rules, and added the now-required `region` and `version` fields to the sample resource.

## Review Notes
The post is technically relevant and the corrected examples match current Kubernetes CRD CEL validation behavior. Transition rules that use `oldSelf` are update-only by default; Kubernetes v1.33 also provides `optionalOldSelf` for cases that need evaluation when the old value is missing, but that feature is not required for these examples.
