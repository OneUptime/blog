# Validation Summary: How to Implement Dapr Component Governance Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (component scoping, state store configuration)
- Kubernetes (namespaces, CRDs, kubectl)
- Kyverno (ClusterPolicy for admission control)
- OPA Gatekeeper (ConstraintTemplate, Constraint, Rego policies)
- Helm (Kyverno installation)
- jq (JSON processing in audit scripts)

## Sources Consulted
- Dapr component schema reference: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr component scoping how-to: https://docs.dapr.io/operations/components/component-scopes/
- Dapr Redis state store reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr component secrets reference: https://docs.dapr.io/operations/components/component-secrets/
- Kyverno match/exclude documentation: https://main.kyverno.io/docs/policy-types/cluster-policy/match-exclude/
- OPA Gatekeeper ConstraintTemplate docs: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- OPA Gatekeeper how-to guide: https://open-policy-agent.github.io/gatekeeper/website/docs/howto/
- OPA Gatekeeper required labels library example: https://open-policy-agent.github.io/gatekeeper-library/website/validation/requiredlabels/

## Issues Found

### 1. Kyverno policy used invalid `apiGroups` field in match block
**What was wrong:** Both rules in the Kyverno ClusterPolicy used `apiGroups` as a field under `match.resources`, which is not a valid Kyverno field. Kyverno encodes the API group directly in the `kinds` field using `Group/Version/Kind` format.

**What was changed:** Replaced both instances of:
```yaml
kinds:
- Component
apiGroups:
- dapr.io
```
with:
```yaml
kinds:
- dapr.io/v1alpha1/Component
```

**Why:** The `apiGroups` field does not exist in Kyverno's resource match schema. Using just `Component` without the group qualifier could match unintended resources. The `Group/Version/Kind` format is the documented way to match CRDs in Kyverno.

### 2. OPA Gatekeeper ConstraintTemplate name had a typo
**What was wrong:** The ConstraintTemplate `metadata.name` was `daprcomponentsscoperequired` (double 's') but the kind `DaprComponentScopeRequired` lowercases to `daprcomponentscoperequired` (single 's'). Gatekeeper requires the name to be the exact lowercase of the kind.

**What was changed:** Changed `daprcomponentsscoperequired` to `daprcomponentscoperequired`.

**Why:** A name/kind mismatch causes Gatekeeper to fail reconciliation of the ConstraintTemplate.

### 3. OPA Gatekeeper ConstraintTemplate was missing parameter schema and Rego didn't use parameters
**What was wrong:** The Constraint passed `parameters.requiredLabels` but the ConstraintTemplate had no `spec.crd.spec.validation.openAPIV3Schema` defining the parameter schema, and the Rego code never referenced `input.parameters`. For v1 ConstraintTemplates, the API server rejects Constraints with undeclared parameters.

**What was changed:** Added an `openAPIV3Schema` section defining the `requiredLabels` parameter as an array of strings, and added a second Rego `violation` rule that iterates over `input.parameters.requiredLabels` and checks that each required label exists on the Component resource.

**Why:** Without the schema, the Constraint would be rejected by the API server. Without the Rego rule, the `requiredLabels` parameter would be dead configuration that misleadingly suggests labels are being enforced.

## Review Notes
- The Dapr component YAML (scopes placement, state.redis type, secretKeyRef format, apiVersion) is all correct per current Dapr documentation.
- The Kyverno Helm installation commands are correct.
- The kubectl commands use the correct Dapr CRD resource type (`components`).
- The audit script using jq is syntactically correct and would work as described.
- The Kyverno policy uses the older `match.resources` syntax (pre-1.7). The newer `match.any`/`match.all` syntax is preferred in Kyverno 1.7+, but the older syntax remains supported. This is not an error but could be noted for future updates.
