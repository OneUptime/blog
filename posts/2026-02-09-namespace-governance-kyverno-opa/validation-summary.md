# Validation Summary: How to Build Namespace Governance Policies with Kyverno and OPA

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kyverno
- Open Policy Agent
- OPA Gatekeeper
- Rego
- Kubernetes NetworkPolicy
- Kubernetes ResourceQuota
- Prometheus alert rules

## Sources Consulted
- Kyverno installation documentation: https://kyverno.io/docs/installation/installation/
- Kyverno validate rule documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno mutate rule documentation: https://kyverno.io/docs/policy-types/cluster-policy/mutate/
- Kyverno generate rule documentation: https://kyverno.io/docs/policy-types/cluster-policy/generate/
- Kyverno JMESPath documentation: https://kyverno.io/docs/policy-types/cluster-policy/jmespath/
- Kyverno metrics reference: https://kyverno.io/docs/reference/metrics/
- OPA Gatekeeper ConstraintTemplate documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- OPA Gatekeeper installation documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/install/
- OPA Gatekeeper data replication documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/sync/
- OPA Gatekeeper metrics and audit documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/metrics/ and https://open-policy-agent.github.io/gatekeeper/website/docs/audit/
- GitHub release metadata for Kyverno and Gatekeeper: https://github.com/kyverno/kyverno/releases and https://github.com/open-policy-agent/gatekeeper/releases

## Issues Found
- The Kyverno install command referenced Kyverno v1.10.0, which is outdated. Updated it to the current GitHub release manifest URL for v1.18.1.
- Kyverno validation examples used the deprecated top-level `spec.validationFailureAction` field. Moved enforcement mode to `validate.failureAction` and used current `Enforce` / `Audit` values.
- The generated DNS NetworkPolicy selected `kube-system` with a non-standard `name` label. Updated it to the Kubernetes namespace label `kubernetes.io/metadata.name: kube-system`.
- The Kyverno mutation example used invalid JMESPath-style split syntax. Updated it to Kyverno's documented `split(@, '-')` pipeline form.
- The Gatekeeper install command referenced the old release-3.13 branch. Updated it to the current v3.22.2 release manifest URL.
- The Gatekeeper ResourceQuota template attempted to read namespace-scoped ResourceQuota objects from `data.inventory.cluster`, which is the wrong inventory path for namespace-scoped resources and also requires synced data. Reworked the example to validate ResourceQuota objects directly.
- The Gatekeeper pod security template checked only pod-level `runAsNonRoot`, despite the message referring to containers. Updated the Rego to evaluate each container and fall back to pod-level `runAsNonRoot` when the container does not set it.
- The Kyverno Prometheus query used an outdated metric and label combination. Updated it to use `kyverno_policy_results{rule_result="fail"}`.
- The Gatekeeper Prometheus query grouped `gatekeeper_violations` by an undocumented `constraint_kind` label. Removed that grouping and kept the documented `enforcement_action` selector.

## Review Notes
The examples are now aligned with current documented APIs and metric references. Local validation was limited to YAML parsing because `kubectl`, `opa`, and `ruby` were not installed in the environment, so CRD schema validation and Rego compilation were verified against official documentation rather than by live cluster admission tests.
