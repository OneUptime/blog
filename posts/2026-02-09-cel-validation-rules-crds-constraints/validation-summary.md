# Validation Summary: How to Write CEL Validation Rules in CRDs for Complex Field Constraints

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes CustomResourceDefinitions
- Common Expression Language validation rules
- OpenAPI v3 schema validation
- kubectl

## Sources Consulted
- Kubernetes documentation: Extend the Kubernetes API with CustomResourceDefinitions - https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/
- Kubernetes API reference: CustomResourceDefinition apiextensions.k8s.io/v1 - https://kubernetes.io/docs/reference/kubernetes-api/apiextensions/custom-resource-definition-v1/
- Kubernetes documentation: Common Expression Language in Kubernetes - https://kubernetes.io/docs/reference/using-api/cel/

## Issues Found
- The list uniqueness rules compared whole objects with `p1 == p2` / `s1 == s2`, which allowed duplicate names when the duplicate list entries were otherwise identical. Changed them to use the CEL `exists_one` macro so each name must occur exactly once.
- The list and map examples used CEL iteration over unbounded collections. Kubernetes estimates validation rule cost and recommends setting bounds such as `maxItems` and `maxProperties` for collections used in validation rules. Added bounded sizes to the examples that iterate over lists and maps.
- The CPU validation example was under a "Numeric functions" comment even though it uses string regex matching. Renamed the comment to describe quantity-like string validation.
- The timeout example used `type(self.timeout) == duration`, which is not a useful way to validate a CRD field that should be declared with `type: string` and `format: duration`. Replaced it with a duration comparison using `duration('0s')`.
- The dynamic error message example used a static `message` containing a printf-style `%d`, but Kubernetes does not interpolate `message`; `messageExpression` provides dynamic content and overrides `message` when it evaluates successfully. Changed the static message to a valid fallback.
- The performance section said CEL validation runs on every create and update operation without noting transition-rule behavior. Clarified that rules using `oldSelf` run on updates where Kubernetes can compare old and new values.
- The test output showed "admission webhook denied the request", which is misleading for CRD CEL validation enforced by the API server. Updated the sample error to a CRD validation-style invalid field message.

## Review Notes
The post is technically sound after these corrections. The examples remain illustrative and do not include full production CRD schemas with all possible `required` fields, defaults, or controller-specific constraints.
