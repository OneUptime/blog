# Validation Summary: How to Use CEL-Based ValidatingAdmissionPolicy for Kubernetes Native Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes ValidatingAdmissionPolicy
- Kubernetes ValidatingAdmissionPolicyBinding
- Common Expression Language (CEL)
- Kubernetes admission control
- kubectl
- Kubernetes ConfigMaps

## Sources Consulted
- Kubernetes Validating Admission Policy documentation: https://kubernetes.io/docs/reference/access-authn-authz/validating-admission-policy/
- Kubernetes ValidatingAdmissionPolicy v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-admission-policy-v1/
- Kubernetes ValidatingAdmissionPolicyBinding v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-admission-policy-binding-v1/
- Kubernetes Common Expression Language documentation: https://kubernetes.io/docs/reference/using-api/cel/
- Kubernetes Feature Gates documentation: https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/
- Kubernetes v1.28 release notes/blog for beta ValidatingAdmissionPolicy enablement: https://kubernetes.io/blog/2023/08/15/kubernetes-v1-28-release/

## Issues Found
- The pre-1.30 enablement guidance implied that only `--feature-gates=ValidatingAdmissionPolicy=true` was needed and did not mention the beta API version. Updated the text to clarify that Kubernetes 1.30+ uses `admissionregistration.k8s.io/v1`, while Kubernetes 1.28 and 1.29 use `admissionregistration.k8s.io/v1beta1` and require the beta API to be enabled.
- Several CEL examples used `has(map.key)` for labels, resource limits/requests, ConfigMap data, and service selectors. Kubernetes CEL documentation says `has()` is for field presence and map keys should be checked with the `in` operator. Updated those expressions to use `has()` for optional fields and `'key' in map` for map membership.
- The ConfigMap parameter binding omitted `paramRef.parameterNotFoundAction`, which Kubernetes documents as required. Added `parameterNotFoundAction: Deny`.
- The production requirements example accessed `c.securityContext.runAsNonRoot` without first checking that the field exists. Added a `has(c.securityContext.runAsNonRoot)` guard.
- One validation used a multiline `message`, but the Kubernetes API requires validation messages not to contain line breaks. Replaced it with a single-line message.
- The service selector example accessed `object.spec.selector.app` without checking selector existence or using map-key syntax. Updated it to check `has(object.spec.selector)`, test for the `app` key, and use bracket access.
- Updated explanatory prose so it accurately describes `has()` and `in` after the CEL fixes.

## Review Notes
The examples target Kubernetes 1.30+ and the stable `admissionregistration.k8s.io/v1` API. For Kubernetes 1.28 and 1.29, manifests would need to use the beta API version. The API server metric grep is plausible for exploration, but exact metric names can vary by Kubernetes version and enabled metrics stability settings.
