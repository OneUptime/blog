# Validation Summary: How to Create Policy-Based Access Control

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- Open Policy Agent (OPA)
- Rego policy language
- Kubernetes (Deployment, ConfigMap)
- Node.js / Express
- axios HTTP client
- YAML configuration
- Policy-Based Access Control (PBAC) concepts

## Sources Consulted
- Open Policy Agent official documentation (https://www.openpolicyagent.org/docs/)
- OPA REST API reference (https://www.openpolicyagent.org/docs/latest/rest-api/) — for the `/v1/data/<package>/<rule>` endpoint format and response shape (`{"result": ...}`)
- OPA Policy Language / Rego docs (https://www.openpolicyagent.org/docs/latest/policy-language/) — for `default`, rule blocks, `import future.keywords.if`
- OPA Policy Reference, built-in functions (https://www.openpolicyagent.org/docs/latest/policy-reference/) — verified `time.clock(time.now_ns())` returns `[hour, minute, second]`
- OPA Decision Logs docs (https://www.openpolicyagent.org/docs/latest/management-decision-logs/) — for `decision_logs.console` and `reporting.{min,max}_delay_seconds` fields
- OPA Bundles docs (https://www.openpolicyagent.org/docs/latest/management-bundles/) — for `bundles.<name>.{service,resource,polling}` config shape
- OPA Testing docs (https://www.openpolicyagent.org/docs/latest/policy-testing/) — for `opa test -v` behavior and output format
- Kubernetes Deployment / ConfigMap API reference (apps/v1, v1) — sidecar pattern syntax
- Express.js routing & middleware docs (https://expressjs.com/) — `router.use(path, mw)` semantics

## Issues Found
1. **Missing markdown heading prefix on "Resource Ownership"** (was a plain paragraph at line 317). The other two subsections under "Advanced Policy Patterns" use `### `. Fixed by adding `### ` so it renders as a proper subheading consistent with siblings.
2. **OPA test output ordering was reversed.** The post showed the `PASS: 3/3` summary line before the individual test results. Actual `opa test -v` output lists each test result first, then prints a separator line and the summary at the bottom. Reordered the comment block to match real CLI behavior and added the `---...---` separator line.

## Review Notes
- **Rego v0 vs v1 syntax mixing.** The post mixes the older v0 rule body syntax (`allow { ... }`, used in the documents, ownership, hierarchy, and test policies) with the newer v1 `allow if { ... }` syntax (used in the time-based policy via `import future.keywords.if`). Both forms work under OPA v0.x. Under OPA v1.0 (released late 2024), the `if` keyword is required by default for partial rules, so the v0-style examples would need either `import rego.v1` or running OPA in `--v0-compatible` mode. This was not changed since the post does not pin an OPA version and the mixed style is pedagogically illustrative, but a future revision could standardize on v1 syntax with `import rego.v1` for forward compatibility.
- The Node.js middleware example assumes prior middleware populates `req.user` and `req.resource`; this is conventional but worth noting for newcomers.
- The decision-logs YAML uses `reporting.min_delay_seconds` / `max_delay_seconds`, which technically govern remote upload pacing and are inert when only `console: true` is enabled. Not incorrect, just unnecessary in console-only mode.
- The `bundles` configuration snippet references a `service: policy-service`, but the corresponding `services:` block (where that service is defined with a URL and credentials) is not shown. A reader copying this verbatim would get a config error; it is acceptable as a focused snippet but a brief callout could help.
- The decision-log JSON example is a simplified shape; real OPA decision logs include additional fields such as `labels`, `path`, `requested_by`, and `bundles`. This simplification is fine for illustration.
