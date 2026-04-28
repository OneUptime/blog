# Validation Summary: How to Migrate NeuVector Policies Between Clusters

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- NeuVector (container security platform)
- NeuVector REST API (v1)
- NeuVector Custom Resource Definitions (CRDs): NvSecurityRule, NvClusterSecurityRule, NvAdmissionControlSecurityRule, NvDlpSecurityRule, NvWafSecurityRule
- Kubernetes / kubectl
- Bash, curl, jq
- Python 3 (PyYAML)
- Git / GitOps

## Sources Consulted
- [NeuVector REST API and Automation](https://open-docs.neuvector.com/automation/automation/)
- [NeuVector CRD - Custom Resource Definitions](https://open-docs.neuvector.com/policy/usingcrd/)
- [NeuVector Helm CRD definitions (master)](https://github.com/neuvector/neuvector-helm/blob/master/charts/crd/templates/crd.yaml)
- [NeuVector Controller API spec (apis.yaml)](https://raw.githubusercontent.com/neuvector/neuvector/main/controller/api/apis.yaml)
- [NeuVector Modes: Discover, Monitor, Protect](https://open-docs.neuvector.com/policy/modes/)
- [NeuVector Groups](https://open-docs.neuvector.com/policy/groups/)

## Issues Found

1. **Incorrect process profile endpoint path.** Step 1 used `/v1/process/profile`. The correct path defined in the NeuVector controller API spec is `/v1/process_profile` (underscore, single segment). Updated.

2. **Incorrect admission rules endpoint path.** Step 1 used `/v1/admission/rule` for listing all rules. The collection endpoint is `/v1/admission/rules` (plural); the singular `/v1/admission/rule/{id}` is for a specific rule. Updated to `/v1/admission/rules`.

3. **Wrong HTTP method for policy rule import.** Step 6 used `curl -X POST` against `/v1/policy/rule`. Per the NeuVector API spec, only `PATCH` is defined on this endpoint for the `insert`/`delete`/`move` actions on rules. Changed to `-X PATCH`. Also added `jq -c` so each rule emerges as a single line for the `while read -r` loop, which would otherwise break on multi-line pretty-printed JSON.

4. **Missing `policies/` directory in Git step.** Step 8 ran `mkdir neuvector-policies && cd neuvector-policies` and then redirected output into `policies/security-rules.yaml`, but the `policies` subdirectory was never created — the redirect would fail. Added `mkdir policies` after `git init`.

## Review Notes

- The blog uses both the REST API and the CRD-based approach, and correctly identifies CRDs as the more reliable migration path. This matches NeuVector's own guidance in the "Security Policy as Code" documentation.
- The CRD names (`nvsecurityrules`, `nvclustersecurityrules`, `nvadmissioncontrolsecurityrules`, `nvdlpsecurityrules`, `nvwafsecurityrules`) all match the resources defined in `neuvector-helm/charts/crd/templates/crd.yaml`. kubectl is case-insensitive for plural resource names, so the mixed-case `nvclusterSecurityrules` form in the post still resolves correctly.
- The `.token.token` jq path against `/v1/auth` is the correct nesting and matches public NeuVector automation examples.
- `policy_mode == "Protect"` is the correct case-sensitive value — NeuVector exposes `Discover`, `Monitor`, `Protect` (capitalized).
- The `start` / `limit` query parameters are not formally documented in the public OpenAPI spec for these collection endpoints, but they are widely used in NeuVector automation examples and the controller honors them; left as-is.
- Future caveat: NeuVector also exposes a higher-level `/v1/file/config` import/export endpoint (used by the UI's full-config export). For very large policy sets a config-bundle import is often more reliable than per-rule PATCH calls; worth mentioning in a future revision but not a correctness issue.
