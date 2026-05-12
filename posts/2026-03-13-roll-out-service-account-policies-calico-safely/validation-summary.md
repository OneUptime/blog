# Validation Summary: How to Roll Out Calico Service Account-Based Policies Safely

## Status
validated

## Post Type
Tutorial / Guide (phased rollout strategy with commands and YAML manifests)

## Technologies Covered
- Calico (v3.26+) NetworkPolicy
- Kubernetes ServiceAccounts
- kubectl (patch, rollout, create serviceaccount)
- calicoctl
- Mermaid (gantt chart)

## Sources Consulted
- Calico v3.26 NetworkPolicy reference: https://archive-os-3-26.netlify.app/calico/3.26/reference/resources/networkpolicy
- Calico EntityRule API (`source`/`destination` schema) — confirmed that service-account matching inside rules uses `serviceAccounts.names` / `serviceAccounts.selector`, and that policy-spec-level `serviceAccountSelector` selects the workloads the policy applies to.
- Calico rule action semantics — confirmed `Log` is non-terminating while `Allow` and `Deny` are terminating.
- kubectl patch semantics for embedded JSON strings in bash (quote escaping).

## Issues Found
1. **Phase 2 `kubectl patch` bash quoting was broken.** The outer `"..."` string was immediately terminated by the first inner unescaped `"`, so the patch payload would not be passed to `kubectl` as written. Replaced the multi-line unescaped JSON with a single-line, properly backslash-escaped JSON string so the variable `${deploy}-sa` still expands and the payload is valid JSON.
2. **Phase 3 audit policy used a non-existent EntityRule field.** `source.serviceAccountSelector` is not a field on Calico's `EntityRule`; that name only exists at the policy `spec` level (and selects the workloads the policy applies to, not the source of traffic). Replaced each occurrence inside `source:` with the correct `serviceAccounts.names` form (`serviceAccounts: { names: [backend-sa] }`).
3. **Phase 4 enforce policy had the same error.** Same fix applied: `source.serviceAccountSelector: name == 'backend-sa'` → `source.serviceAccounts.names: [backend-sa]`.

## Review Notes
- The `Log` then `Allow` pattern in the audit policy is correct because Calico's `Log` action is non-terminating; subsequent rules continue to be evaluated.
- The selector `app == 'db'` assumes the database workloads carry an `app: db` label — not stated in the post but consistent with conventional Kubernetes labeling.
- An equivalent and arguably cleaner way to do Phase 2 is `kubectl set serviceaccount deployment/$deploy ${deploy}-sa -n production`; the post's `kubectl patch` approach is left intact per the "minimal changes" guidance, just with correct quoting.
- The post applies two separate `NetworkPolicy` objects (`audit-sa-policy` and `enforce-sa-policy`) with the same `order: 100`. In practice operators usually delete the audit policy when applying enforce; otherwise both run concurrently and the audit policy's final `Allow` would short-circuit the enforce policy depending on ordering. This is a workflow nuance, not a correctness bug in the snippets themselves.
- Calico's `serviceAccountSelector` (spec level) is supported in v3.26+, and `ServiceAccountMatch` (`names`/`selector` inside EntityRule) has been available since well before v3.26, so the prerequisite version is accurate.
