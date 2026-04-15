# Validation Summary: How to Audit Dapr Security Configuration

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes (kubectl, CRDs, annotations)
- Dapr CLI (mtls commands)
- jq (JSON processing)
- Bash scripting

## Sources Consulted
- Dapr CLI reference for mtls commands: https://docs.dapr.io/reference/cli/dapr-mtls/
- Dapr CLI reference for mtls expiry: https://docs.dapr.io/reference/cli/dapr-mtls/dapr-mtls-expiry/
- Dapr Component schema reference: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr Configuration schema reference: https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr annotations and arguments overview: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Component CRD definition: https://github.com/dapr/dapr/blob/master/charts/dapr/crds/components.yaml
- jq manual: https://jqlang.org/manual/

## Issues Found

### 1. Invalid `-k` flag on `dapr mtls expiry`
- **What was wrong:** The command `dapr mtls expiry -k` was used in two places (the mTLS audit section and the automated script). The `dapr mtls expiry` subcommand does not accept a `-k`/`--kubernetes` flag; it is Kubernetes-only by default.
- **What was changed:** Removed the `-k` flag, changing to `dapr mtls expiry`.
- **Why:** The command would fail with an unknown flag error. The official CLI reference confirms no `-k` flag is supported for this subcommand.

### 2. Incorrect `.spec.scopes` path for Dapr Components
- **What was wrong:** The jq queries referenced `.spec.scopes` to check component scoping. In Dapr Component CRDs, `scopes` is a root-level field alongside `spec`, not nested within it.
- **What was changed:** Changed `.spec.scopes` to `.scopes` in two jq queries (component security audit and component scoping coverage in the automated script).
- **Why:** The incorrect path would always return `null`, making the scoping audit ineffective. The Dapr Component CRD schema places `scopes` at the top level.

### 3. Label selector used for annotation-based filtering
- **What was wrong:** The command `kubectl get deployments --all-namespaces -l "dapr.io/enabled=true"` used a label selector (`-l`) to filter by `dapr.io/enabled`. However, `dapr.io/enabled` is a pod annotation, not a label. Kubernetes label selectors cannot filter by annotations, so this command would return zero results.
- **What was changed:** Replaced the label-selector approach with a `jq`-based filter that retrieves all deployments as JSON and filters on `.spec.template.metadata.annotations["dapr.io/enabled"]`. Also corrected the config annotation path to use the pod template annotations.
- **Why:** The original command would silently return no results, making the access control audit useless.

## Review Notes
- The `kubectl get configurations` and `kubectl get components` commands could optionally be qualified with the API group (e.g., `configurations.dapr.io`, `components.dapr.io`) to avoid ambiguity if other CRDs use the same plural resource names.
- The jq expression `[.spec.metadata[]?.secretKeyRef] | any` works as intended (returns true if any secretKeyRef is non-null/truthy), though `[.spec.metadata[]? | has("secretKeyRef")] | any` would be more semantically precise.
- The plaintext credential grep in the automated script (`grep -c "value: .*[Pp]assword\|value: .*[Ss]ecret"`) is a heuristic that may produce false positives (e.g., metadata items that happen to contain the word "password" in a non-sensitive context) or false negatives (credentials with non-obvious names). This is acceptable for a quick audit but should not be the sole detection mechanism.
