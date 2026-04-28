# Validation Summary: How to Configure NeuVector Custom Compliance Checks

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- NeuVector (custom compliance checks, REST API, bench/compliance endpoints)
- Kubernetes / containers (target of compliance scans)
- CIS Benchmarks (Docker, Kubernetes)
- Shell scripting (custom-check script bodies)
- curl / jq (API interaction)

## Sources Consulted
- NeuVector official docs: https://open-docs.neuvector.com/
- NeuVector compliance docs: https://open-docs.neuvector.com/scanning/scanning/compliance
- NeuVector source on GitHub: https://github.com/neuvector/neuvector
  - `controller/rest/rest.go` (route table)
  - `controller/rest/bench.go` (bench/custom-check/compliance handlers)
  - `controller/api/apis.go` (REST type definitions, `RESTCustomCheckConfigData`)
  - `controller/api/apis.yaml` (OpenAPI spec)
  - `agent/bench.go` (script execution semantics)
  - `share/clus_apis.go` (BenchLevel constants, group kinds)

## Issues Found
The original post used a fictional API surface for custom compliance checks. Multiple endpoints, the request schema, and several factual claims were incorrect. Fixes applied:

1. **Custom-check endpoint and method (Steps 1, 2, 3).** Original used `POST /v1/bench/custom_check`. The real endpoint is `PATCH /v1/custom_check/<group>` (no `bench/` prefix, `PATCH` not `POST`, and the path is parameterized by group name). Updated all three curl examples to target `/v1/custom_check/nodes` (or `/containers`).
2. **Custom-check request body schema (Steps 1, 2, 3).** Original payload used a fictitious `entries[]` array with fields `test_number`, `level`, `scored`, `description`, `remediation`, `type`, `commands.test`, `tags`. The actual `RESTCustomCheckConfigData` schema is `{"config": {"add"|"update"|"delete": {"scripts": [{"name": "...", "script": "..."}]}}}` with only `name` and `script` (and optional `configurable`) per script. Rewrote all three payloads to the real schema.
3. **Script semantics (Step 1).** Original described checks as scripts that print `pass`/`fail` strings. The enforcer (in `agent/bench.go`) maps **exit code 0 → PASS, non-zero → WARN, exec failure → ERROR**; stdout/stderr is captured as the report message. Rewrote the example scripts to use exit codes and added an explanation paragraph.
4. **Where scripts run (Step 1 intro).** Original claimed scripts "run inside containers". For the predefined `nodes` group (and any node-kind group) they run in the host's namespaces via `nsrun`, not inside containers. Clarified that scripts run on the enforcer in the host namespaces for node groups and in container context for container groups.
5. **Bench-run endpoint (Step 4).** Original used `POST /v1/bench/run` with `{"host": true, "container": true}`. No such endpoint exists. The real per-host endpoints are `POST /v1/bench/host/<id>/docker` and `POST /v1/bench/host/<id>/kubernetes`, and they accept no request body. Replaced the example with a host-ID lookup followed by a Kubernetes CIS bench trigger, and added a note that custom-check scans run automatically on the enforcer's bench schedule.
6. **Compliance report endpoint (Step 4).** Original used `GET /v1/bench/report`. No such endpoint exists. Switched to `GET /v1/host/<id>/compliance` (which returns merged custom + Docker CIS + Kube CIS items for a host) and mentioned `/v1/compliance/asset` and `/v1/workload/<id>/compliance` as alternatives.
7. **Best Practices.** The first bullet referenced `MY-001`-style test numbers; with the real API, users do not assign `test_number`s — they pick a script `name`. Updated the bullet to recommend a name prefix like `myorg_`. Replaced the "weekly recurring scan" bullet (the post described a scheduling feature that is not configured this way) with guidance about using exit codes and the captured stdout/stderr.

## Review Notes
- The "Built-in vs. Custom Compliance" table is approximately correct: NeuVector does ship CIS benchmarks and labels findings against NIST 800-53, PCI DSS, HIPAA, and GDPR profiles. NIST and PCI DSS are technically profile mappings of CIS findings (and other built-ins) rather than independent check sets, but the table's level of abstraction is acceptable for an introductory section.
- The UI navigation "Security Risks > Compliance" and the "Generate Report" / PDF/CSV export claims match the official documentation.
- Custom-check `:group` values must reference existing groups whose kind is `node` or `container` (validated in `bench.go`'s `cacher.GetGroupBrief`). The post uses the predefined `nodes` group (always present) and the predefined `containers` group, both of which are valid out of the box.
- The bench severity constants in source include `PASS`, `INFO`, `WARN`, `MANUAL`, `HIGH`, `NOTE`, and `ERROR`. For shell-based custom checks, only `PASS`, `WARN`, and `ERROR` are produced (driven by exit code). The post's `jq` filter on `level == "ERROR"` will surface only execution errors; readers may also want to filter `WARN` for failed checks, but this was not added to keep the original example's intent intact.
