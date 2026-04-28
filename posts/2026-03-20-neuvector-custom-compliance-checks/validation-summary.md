# Validation Summary: How to Configure NeuVector Custom Compliance Checks - Checks

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- NeuVector (container security platform)
- NeuVector REST API (`/v1/custom_check`, `/v1/workload/{id}/compliance`)
- Bash / POSIX shell scripting (custom compliance check scripts)
- `curl` and `jq` for API automation
- Linux file permission tooling (`stat`, `id`, `which`)
- Kubernetes service groups (NeuVector group naming convention `nv.<service>.<namespace>`)

## Sources Consulted
- NeuVector Custom Compliance Checks docs: https://open-docs.neuvector.com/policy/customcompliance/
- NeuVector REST API and Automation overview: https://open-docs.neuvector.com/automation/automation/
- NeuVector OpenAPI spec (`apis.yaml`) on GitHub main branch: https://github.com/neuvector/neuvector/blob/main/controller/api/apis.yaml — verified `/v1/custom_check/{group}` (GET, PATCH), `/v1/workload/{id}/compliance` (GET), and the `RESTCustomCheckConfigData` / `RESTCustomCheckConfig` / `RESTCustomChecks` schemas.
- NeuVector controller API types (`controller/api/apis.go`) on GitHub main branch: https://github.com/neuvector/neuvector/blob/main/controller/api/apis.go — verified `RESTBenchItem` field names (`category`, `level`, `message`, etc.) and the `BenchCategoryCustom = "custom"` constant.

## Issues Found

1. **Step 2 — wrong HTTP method and incorrect URL path for adding a custom check.**
   - Original: `curl -sk -X POST "https://neuvector-manager:8443/v1/custom_check/group/nv.webapp.production"`
   - The NeuVector OpenAPI spec defines the endpoint as `PATCH /v1/custom_check/{group}` (no `/group/` segment in the path; the only supported write method is `PATCH`, not `POST`).
   - Fixed to `curl -sk -X PATCH "https://neuvector-manager:8443/v1/custom_check/nv.webapp.production"`.

2. **Step 5 — same wrong method/path repeated in the multi-group loop.**
   - Original: `curl -sk -X POST "https://neuvector-manager:8443/v1/custom_check/group/${GROUP}"`
   - Fixed to `curl -sk -X PATCH "https://neuvector-manager:8443/v1/custom_check/${GROUP}"` for the same reason.

3. **Step 6 — incorrect endpoint and incorrect JSON path for retrieving custom check results.**
   - Original endpoint: `/v1/custom_check/workload/<workload-id>` — this endpoint does not exist in NeuVector's API.
   - Original jq filter referenced `.compliance.customs[]`, which does not match `RESTComplianceData`.
   - The actual endpoint that returns container compliance results (including custom checks) is `GET /v1/workload/{id}/compliance`, returning `RESTComplianceData` with an `items` array of `RESTBenchItem`. Custom check items are identified by `category == "custom"` (per `BenchCategoryCustom`), and pass/fail is reported via `level`.
   - Fixed to `GET /v1/workload/<workload-id>/compliance` with a jq filter that selects `.items[] | select(.category == "custom")` and counts `level == "PASS"` / `level == "FAIL"`.

## Review Notes

- The JSON body shape used in Steps 2 and 5 (`{"config": {"add": {"scripts": [...]}}}`) matches `RESTCustomCheckConfigData` → `RESTCustomCheckConfig` → `RESTCustomChecks`. Per the OpenAPI spec, `RESTCustomChecks` lists `group` and `scripts` as required, but the path parameter `{group}` is the authoritative source for the target group; in practice NeuVector accepts the body without an inner `group` field. Left as-is.
- Per official NeuVector docs, custom checks must be enabled via the `CUSTOM_CHECK_CONTROL` environment variable on Controller and Enforcer pods (default is `disable`; values are `disable`, `strict`, `loose`). The post's prerequisites do not mention this — it is technically correct that "NeuVector installed and running" is necessary, but readers may hit a silent failure if the feature has not been enabled. Worth noting in a future revision but not a factual error in the current text.
- The "Check File Permissions" example uses `[1-7]` to flag SSL key files as "world-readable"; `[1-7]` actually flags any non-zero "others" permission (including execute-only). The label is slightly imprecise, but the underlying intent — flagging any world access on SSL private keys — is sensible and the script behaves as a stricter check than the comment implies. Not changed.
- The `which` based check in "Check No Unnecessary Packages" includes `curl` and `wget`, which are commonly required by application containers. This is a stylistic/operational caveat (the example demonstrates the technique) rather than a technical inaccuracy.
- The shell scripts assume GNU coreutils (`stat -c "%a"`); on minimal/BusyBox-based images (e.g. Alpine), `stat` lacks `-c` and uses `-f` instead. Not changed because the post explicitly targets generic container images and this is a known portability caveat.
- UI navigation strings (`Policy > Groups`, `Custom Check` tab, `Assets > Containers > Compliance`) match the current NeuVector Manager UI conventions and the official docs.
