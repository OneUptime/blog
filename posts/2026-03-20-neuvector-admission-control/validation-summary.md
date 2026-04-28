# Validation Summary: How to Configure NeuVector Admission Control

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- NeuVector (container security platform, focus on Admission Control)
- Kubernetes (ValidatingAdmissionWebhook mechanism, Pod security context)
- NeuVector REST API (`/v1/admission/state`, `/v1/admission/rule`, `/v1/event`)
- `kubectl` for verifying webhook registration and testing rules
- `curl` and `jq` for API interaction

## Sources Consulted
- NeuVector Admission Controls docs: https://open-docs.neuvector.com/5.2/policy/admission/
- NeuVector REST API / OpenAPI spec: https://github.com/neuvector/neuvector/blob/main/controller/api/apis.yaml
- NeuVector criteria / operator constants (authoritative source): https://github.com/neuvector/neuvector/blob/main/share/criteria.go
- NeuVector admission control validation logic: https://github.com/neuvector/neuvector/blob/main/controller/rest/admission.go
- Kubernetes Dynamic Admission Control reference: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- SUSE / NeuVector blog on admission control: https://www.suse.com/c/kubernetes-admission-control/

## Issues Found

Several criteria-name and operator-name strings used in the API request bodies and the reference list did not match the actual constants defined in `share/criteria.go`. The wire-format expects the exact string values from those constants — using the wrong values would cause API rejections or rules that never match.

1. **`"op": "biggerEqualThan"` was incorrect.** The `CriteriaOpBiggerEqualThan` constant has the string value `">="`. Changed the cveHighCount rule's operator to `">="`.

2. **`"name": "privileged"` / `"type": "privileged"` was incorrect.** The actual key is `CriteriaKeyRunAsPrivileged = "runAsPrivileged"`. Updated the privileged-container rule to use `runAsPrivileged` for both `name` and `type`.

3. **`"op": "!containsAny"` was incorrect.** The constant is `CriteriaOpNotContainsAny = "notContainsAny"` (no leading `!`). Updated the registry rule's operator to `notContainsAny`. (`!containsAny` is not a valid operator; the negated regex variants exist for `regex`, not `containsAny`.)

4. **Step 5 reference list contained several non-existent or misnamed criteria.** Cross-checked against `share/criteria.go`:
   - `imageTag` — does not exist as a separate criterion; image+tag matching is done via the `image` criterion. Replaced with `image`.
   - `allowedCves` — does not exist. The closest real criterion is `cveNames`. Replaced.
   - `privileged` — should be `runAsPrivileged`.
   - `shareIpcNamespace` — should be `shareIpcWithHost`.
   - `shareNetNamespace` — should be `shareNetWithHost`.
   - `sharePidNamespace` — should be `sharePidWithHost`.
   - `label` — for admission control the constant is `CriteriaKeyLabels = "labels"` (plural). Updated.
   - `cpuLimit`, `memoryLimit`, `noRequestLimit` — these are not separate criteria. NeuVector exposes a single `resourceLimit` criterion (Resource Limit Configuration / RLC) covering CPU/memory limit and request. Collapsed to one entry.

## Review Notes
- The webhook configuration name `neuvector-validating-admission-webhook` is correct and matches the upstream resource name.
- Mode values (`monitor`, `protect`) and `default_action` values (`allow`, `deny`) used in the state-toggle call were verified against `share.AdmCtrlMode*` and `share.AdmCtrlAction*` constants in `controller/rest/admission.go`.
- Rule type values `deny` and `exception` (as well as `cfg_type: user`) are correct, matching `api.ValidatingDenyRuleType` / `api.ValidatingExceptRuleType`.
- The post does not pin a specific NeuVector version. The reviewed criteria/operator names are stable across the 5.x line; if NeuVector ever renames a criterion, the JSON examples may need updating. Adding a version note (e.g., "tested on NeuVector 5.x") would improve future maintainability but is not a technical error.
- The `Rule: Block Images with Critical Vulnerabilities` example matches on `cveHighCount >= 1`, which despite the section heading actually targets *high*-severity CVEs, not *critical*. If the author wants a strict critical-only rule, swapping to `cveCriticalCount` would be more accurate. This is a wording/semantic nit, not a syntactic error, so it was not modified.
