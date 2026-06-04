# Validation Summary: How to Configure Kubernetes Admission Policies with CEL Expressions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes ValidatingAdmissionPolicy
- Kubernetes ValidatingAdmissionPolicyBinding
- Common Expression Language (CEL)
- Kubernetes admission control
- Kubernetes audit annotations

## Sources Consulted
- Kubernetes Validating Admission Policy documentation: https://kubernetes.io/docs/reference/access-authn-authz/validating-admission-policy/
- Kubernetes ValidatingAdmissionPolicy v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-admission-policy-v1/
- Kubernetes ValidatingAdmissionPolicyBinding v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-admission-policy-binding-v1/
- Kubernetes Common Expression Language documentation: https://kubernetes.io/docs/reference/using-api/cel/
- Kubernetes 1.26 Validating Admission Policies alpha announcement: https://kubernetes.io/blog/2022/12/20/validating-admission-policies-alpha/
- Kubernetes 1.28 release notes for ValidatingAdmissionPolicy beta: https://kubernetes.io/blog/2023/08/15/kubernetes-v1-28-release/
- Kubernetes 1.30 Validating Admission Policy GA announcement: https://kubernetes.io/blog/2024/04/24/validating-admission-policy-ga/

## Issues Found
- The post described ValidatingAdmissionPolicy as beta in Kubernetes 1.26 and implied the stable `admissionregistration.k8s.io/v1` examples worked on Kubernetes 1.26+. Updated the introduction and prerequisites to state that the feature was alpha in 1.26, beta in 1.28, and stable as `admissionregistration.k8s.io/v1` in 1.30.
- The parameterized ConfigMap example stored registries as YAML-list text, but the CEL expression treated each line as a plain prefix. Changed the data to newline-delimited registry prefixes and filtered empty lines so the trailing newline does not allow every image.
- The label validation example used field-style `has()` checks on map keys, including a dashed key. Replaced this with Kubernetes CEL's recommended map-key checks using `in`.
- The service name regex rejected valid one-character service names. Updated it to allow a single lowercase letter while preserving the DNS-1035-style constraints described by the text.
- The memory ratio example used ad hoc string replacement for `Mi` and `Gi`, which produced incorrect unit conversions and missed other Kubernetes quantity formats. Replaced it with the Kubernetes CEL quantity library.
- Several security examples accessed nested `securityContext` fields without first requiring or allowing for the parent field. Added explicit `has(c.securityContext)` checks where needed.
- The audit-mode command implied admission audit events can be read from kube-apiserver pod logs. Reworded the guidance to check the configured audit backend and changed the command to a file-backed audit log example.
- The comprehensive policy only rejected images explicitly ending in `:latest`, while Kubernetes defaults omitted image tags to `latest`. Updated the expression and message to require explicit non-latest tags.

## Review Notes
The examples intentionally validate regular containers only. A production-ready policy should decide whether to apply the same checks to `initContainers` and `ephemeralContainers`.
