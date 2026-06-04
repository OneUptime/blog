# Validation Summary: How to Write CEL Expressions for Complex Field Validation in Admission Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes ValidatingAdmissionPolicy
- Kubernetes admission control
- Common Expression Language (CEL)
- Kubernetes CEL libraries
- Kubernetes resource quantities
- Kubernetes CronJob schedule syntax

## Sources Consulted
- Kubernetes Validating Admission Policy documentation: https://kubernetes.io/docs/reference/access-authn-authz/validating-admission-policy/
- Kubernetes ValidatingAdmissionPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-admission-policy-v1/
- Kubernetes Common Expression Language documentation: https://kubernetes.io/docs/reference/using-api/cel/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- CEL optional types documentation: https://pkg.go.dev/github.com/google/cel-go/cel

## Issues Found
- Several examples used `has()` to test map keys, such as ConfigMap data keys and metadata annotation keys. Kubernetes CEL documentation says `has()` is for field presence and map keys should be checked with the `in` operator. Updated those examples to guard maps with `has()` and check keys with `key in map`.
- The Deployment selector example used a non-standard `subsetOf()` helper. Replaced it with the documented CEL map `all()` macro to verify every selector key and value exists in the pod template labels.
- The unique container name example used a non-standard `unique()` helper. Replaced it with a documented `filter()` and `size()` based uniqueness check.
- Resource quantity examples stripped units with string replacement and integer conversion, which fails for valid Kubernetes quantities such as decimal SI values or fractional quantities. Updated those examples to use Kubernetes `isQuantity()` and `quantity()` functions.
- CPU validation was described as a narrow millicore format check and rejected valid Kubernetes CPU quantities. Updated it to validate Kubernetes quantity syntax.
- Optional map-key examples used incorrect optional index syntax. Updated them to use CEL optional indexing such as `map[?'key']`.
- The CronJob schedule regex accepted unsupported forms such as `@every`, `@reboot`, and 5-7 field schedules. Updated it to match Kubernetes-documented macros and five-field cron-style schedules.
- Label value validation rejected the empty string, which is allowed by Kubernetes label value syntax. Updated the expression to allow empty values while still enforcing the 63-character limit.

## Review Notes
- The snippets are valid YAML after the edits.
- The examples define `ValidatingAdmissionPolicy` resources only. Kubernetes requires a corresponding `ValidatingAdmissionPolicyBinding` for a policy to have an effect, but that is outside the scope of the individual expression examples.
- Some examples use CEL optional types and two-variable map comprehensions, which require sufficiently recent Kubernetes versions.
