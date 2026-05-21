# Validation Summary: How to Establish Istio Governance Policies in Your Organization

## Status
validated

## Post Type
Guide

## Technologies Covered
- Istio service mesh
- Istio networking and security APIs
- Kubernetes RBAC
- Kyverno admission policies
- OPA Gatekeeper ConstraintTemplates
- istioctl CLI
- jq
- GitHub CODEOWNERS

## Sources Consulted
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio configuration validation documentation: https://istio.io/latest/docs/ops/common-problems/validation/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio Sidecar reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kyverno validate rule documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno match and exclude documentation: https://kyverno.io/docs/policy-types/cluster-policy/match-exclude/
- OPA Gatekeeper ConstraintTemplate documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- GitHub CODEOWNERS documentation: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners

## Issues Found
- The naming convention snippet used repeated `name` keys in a single YAML mapping, which is not valid YAML. Changed the examples to a YAML list of `name` objects.
- The Kyverno examples used policy-level `spec.validationFailureAction`, which Kyverno documents as deprecated. Moved enforcement to `validate.failureAction: Enforce` in each validate rule.
- The Kyverno EnvoyFilter restriction used `exclude.subjects`, which depends on AdmissionReview user information and is not available during background scans. Added `background: false`.
- The Kyverno EnvoyFilter restriction used `deny: {}`, but Kyverno deny rules require conditions under `any` or `all`. Added an explicit deny condition for CREATE and UPDATE operations.
- The offline `istioctl analyze` command used `--use-kube=false -A` without passing local files or a directory. Changed it to analyze the current directory, matching the documented offline usage.
- The VirtualService example used `networking.istio.io/v1beta1`. Updated it to the current documented `networking.istio.io/v1` API version.
- The audit command labeled `istioctl analyze | grep "Referenced"` as finding unused DestinationRules. It actually finds broken resource reference analyzer messages, so the comment was corrected.
- The audit command for overly permissive AuthorizationPolicies checked for `spec.rules == null`, but Istio documents that missing rules under ALLOW/default action match nothing. Changed the check to flag ALLOW/default policies containing an empty rule (`{}`), which is the documented allow-all pattern.

## Review Notes
- The Gatekeeper example uses the long-standing Rego syntax shown in current Gatekeeper documentation. Gatekeeper 3.19+ also supports Rego v1 syntax via the `code` field, but the existing example remains a valid documented style.
- Kyverno's newer CEL-based policy types may be preferable for new deployments, but the corrected `ClusterPolicy` examples remain aligned with Kyverno's documented validate-rule behavior.
