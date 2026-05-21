# Validation Summary: How to Validate Istio CRDs with Admission Webhooks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes admission webhooks
- Kubernetes CRDs
- istioctl
- kubectl
- OPA Gatekeeper
- Kyverno

## Sources Consulted
- Istio configuration validation problems: https://istio.io/latest/docs/ops/common-problems/validation/
- Istio dynamic admission webhooks overview: https://istio.io/latest/docs/ops/configuration/mesh/webhook/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio istioctl analyze documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Istio configuration analysis messages: https://istio.io/latest/docs/reference/config/analysis/
- Kubernetes dynamic admission control: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Gatekeeper ConstraintTemplate documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- Gatekeeper usage documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/howto/
- Kyverno validate rules documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics/

## Issues Found
- Updated the sample Istio webhook name from `validation.istio.io` to `rev.validation.istio.io`, matching the current Istio validation webhook example.
- Added the required `admissionReviewVersions` and `sideEffects` fields, plus related service port, scope, and timeout fields, to keep the `admissionregistration.k8s.io/v1` webhook snippet technically valid.
- Clarified the "Reference validation" description. Istio admission validation performs admission-time checks, while broader cross-resource existence checks are more accurately covered by `istioctl analyze`.
- Corrected the `istioctl analyze` example output. `IST0108` is `UnknownAnnotation`, not a DestinationRule subset warning, so the example now uses documented analysis message formats and codes.
- Updated the Kyverno example to use rule-level `validate.failureAction: Enforce` instead of the deprecated top-level `spec.validationFailureAction`.

## Review Notes
The emergency webhook bypass commands are technically valid but operationally risky. The post correctly warns readers to use them carefully and restore validation afterward.
