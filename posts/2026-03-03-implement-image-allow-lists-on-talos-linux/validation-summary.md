# Validation Summary: How to Implement Image Allow Lists on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, API server extraArgs)
- Kubernetes (admission controllers, Pod spec, ImagePolicyWebhook)
- Kyverno (ClusterPolicy, pattern matching, conditional anchors, PolicyReports)
- OPA Gatekeeper (ConstraintTemplate, Constraint, Rego)
- Helm (chart installation)
- kubectl / jq (cluster inspection and auditing)

## Sources Consulted
- Kyverno documentation — https://kyverno.io/docs/ (ClusterPolicy spec, pattern matching with `|` OR operator, conditional anchors `=()`, `validationFailureAction`)
- Kyverno Helm chart — https://github.com/kyverno/kyverno/tree/main/charts/kyverno
- OPA Gatekeeper documentation — https://open-policy-agent.github.io/gatekeeper/website/docs/ (ConstraintTemplate `templates.gatekeeper.sh/v1`, Constraint `constraints.gatekeeper.sh/v1beta1`, Rego violation/constraint syntax)
- Gatekeeper Helm chart — https://open-policy-agent.github.io/gatekeeper/charts
- Talos Linux configuration reference — https://www.talos.dev/latest/reference/configuration/ (`cluster.apiServer.extraArgs`)
- Kubernetes API server admission plugin docs — https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/ (`--enable-admission-plugins`, `ImagePolicyWebhook`, `--admission-control-config-file`)
- Kubernetes Policy WG / PolicyReport CRD — https://github.com/kubernetes-sigs/wg-policy-prototypes

## Issues Found
No technical issues found.

The following were specifically verified:
- Kyverno Helm repo URL `https://kyverno.github.io/kyverno/` is correct.
- Kyverno `apiVersion: kyverno.io/v1` and `kind: ClusterPolicy` are correct.
- The `|` OR pattern operator and `=(initContainers)` / `=(ephemeralContainers)` conditional anchors are valid Kyverno pattern syntax.
- The image digest pattern `*@sha256:*` uses Kyverno's `*` wildcard correctly.
- Gatekeeper Helm repo `https://open-policy-agent.github.io/gatekeeper/charts` is correct.
- Gatekeeper API versions (`templates.gatekeeper.sh/v1` for ConstraintTemplate, `constraints.gatekeeper.sh/v1beta1` for the Constraint) are accurate.
- The Rego policy correctly uses `violation[{"msg": msg}]`, `input.review.object.spec.containers`, and `input.parameters.repos`, which match the Gatekeeper input contract.
- Talos config path `cluster.apiServer.extraArgs` with `enable-admission-plugins` and `admission-control-config-file` is the correct way to pass extra flags to the kube-apiserver in Talos machine configuration.
- `kubectl get policyreport -A` is the correct way to inspect Kyverno's `wgpolicyk8s.io/v1alpha2` PolicyReports.

## Review Notes
- In Kyverno v1.11+, the per-rule field `validate.failureAction` is the preferred location and the spec-level `validationFailureAction` is marked as deprecated (still functional, emits a warning). The post's spec-level usage will continue to work but readers using a very recent Kyverno may see a deprecation warning. Not changed because both forms still work and the post's form is widely used in existing documentation.
- The Talos snippet enables `ImagePolicyWebhook,PodSecurity`; `PodSecurity` is already a default admission plugin in Kubernetes 1.25+, so listing it is redundant but harmless. `--enable-admission-plugins` is additive to the defaults.
- The `ImagePolicyWebhook` approach also requires the referenced `admission-control-config-file` to exist on the kube-apiserver filesystem and (on Talos) be supplied via the machine config's file-injection mechanism — the post intentionally keeps this at the high level, which is reasonable for an overview.
- Test commands (`kubectl run test-allowed --image=...`) demonstrate the admission step; the "Should succeed" comment refers to admission acceptance, not image-pull success (the example registry/image may not actually resolve).
