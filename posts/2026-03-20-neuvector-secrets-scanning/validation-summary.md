# Validation Summary: How to Scan Kubernetes Secrets with NeuVector - Scanning

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- NeuVector (container security platform, SUSE Rancher)
- Kubernetes Admission Control (ValidatingAdmissionWebhook)
- NeuVector REST API (registry scan, admission rules, custom compliance checks, workload scan)
- Kubernetes Secrets / External Secrets / Vault / AWS Secrets Manager (referenced in best practices)
- jq, curl, bash

## Sources Consulted
- NeuVector source code: [share/criteria.go](https://raw.githubusercontent.com/neuvector/neuvector/main/share/criteria.go) — admission criterion and operator constants
- NeuVector source code: [controller/api/apis.go](https://raw.githubusercontent.com/neuvector/neuvector/main/controller/api/apis.go) — REST type definitions for `RESTScanRepoReport`, `RESTAdmissionRuleConfigData`, `RESTCustomCheckConfigData`, `RESTWorkload`
- NeuVector source code: [controller/rest/rest.go](https://raw.githubusercontent.com/neuvector/neuvector/main/controller/rest/rest.go) — REST route table
- NeuVector source code: [controller/rest/registry.go](https://raw.githubusercontent.com/neuvector/neuvector/main/controller/rest/registry.go) — `handlerRegistryStart`
- NeuVector source code: [controller/rest/admission.go](https://raw.githubusercontent.com/neuvector/neuvector/main/controller/rest/admission.go) — `handlerAddAdmissionRule`
- NeuVector official docs: [open-docs.neuvector.com](https://open-docs.neuvector.com/) (admission control, registries)
- Adjacent post in this blog: `posts/2026-03-20-neuvector-admission-control/README.md` for canonical NeuVector admission rule body shape

## Issues Found

1. **Step 1 — Registry scan trigger took an invalid JSON body.** The post sent `-d '{"secrets": true}'` to `POST /v1/scan/registry/<id>/scan`. The NeuVector handler `handlerRegistryStart` does not read a request body; secrets/setid_perms/layers detection is configured on the registry itself, so secrets scanning runs automatically on every registry scan. **Fix:** removed the JSON body and `Content-Type` header, and clarified in the prose that secrets detection runs as part of every registry scan. Also renamed the path placeholder from `<registry-id>` to `<registry-name>` to match the actual route param (`:name`).

2. **Step 2 — Admission rule body missing the `config` wrapper and contained an invalid `action` field.** The endpoint `POST /v1/admission/rule` unmarshals into `RESTAdmissionRuleConfigData{ Config *RESTAdmissionRuleConfig }` and explicitly errors out if `config` is nil. The post sent fields at the root and an unsupported `"action": "deny"` field. **Fix:** wrapped the rule body in `"config": { … }`, removed the `action` field (deny semantics come from `rule_type: "deny"`), added `cfg_type: "user"` to match the canonical shape used in the adjacent admission-control post, and added a `type` discriminator on the criterion. The criterion key `envVarSecrets` and op `containsAny` are confirmed valid in `share/criteria.go`.

3. **Step 3 — Custom compliance check used a non-existent endpoint and body schema.** There is no `POST /v1/bench/custom_check` route and no `entries[]` schema in NeuVector. The actual route is `PATCH /v1/custom_check/:group`, and the body is `{"config": {"add"|"update"|"delete": {"group": …, "scripts": [{"name": …, "script": …}]}}}`. **Fix:** rewrote the example to use `PATCH /v1/custom_check/<group-name>` with `config.update.scripts[]`, preserving the original test logic as `script` values and giving each script a `name`. The fields `test_number`, `level`, `description`, `type`, and `commands.test` were removed because they are not part of the API.

4. **Step 5 — Workload listing endpoint does not expose a `.secrets` field.** `GET /v1/workload` returns `RESTWorkloadsData{Workloads: []RESTWorkload}`, and `RESTWorkload` carries `scan_summary *RESTScanBrief` (count summaries only) — there is no `.secrets` array on the workload list payload. The actual list of detected secrets lives in the per-workload scan report at `GET /v1/scan/workload/<id>` under `.report.secrets`. **Fix:** changed the example to first show the single-workload report (`/v1/scan/workload/<id> | jq '.report.secrets'`) and then a loop that pulls the workload IDs from `/v1/workload` and queries each scan report for non-empty `secrets`.

## Review Notes

- The `envVarSecrets` admission criterion is documented in `share/criteria.go` as "secrets from yaml resources" — i.e., it detects when a Pod's env vars are sourced from `secretKeyRef` / similar. There is also a related `envVars` criterion that matches env var names/values directly. The post matches by name, so authors building production rules may want to consider `envVars` as well, but `envVarSecrets` is a real criterion and the example as written is valid.
- `GET /v1/workload` is marked obsolete in NeuVector source in favor of `/v2/workload`. Both return the same array shape; future revisions of this post could switch to `v2`.
- The CLI examples use `curl -sk` (insecure TLS). This matches the rest of the NeuVector posts in this blog and is reasonable for a self-signed manager cert in a tutorial, but production scripts should validate the manager's certificate.
- The post does not specify a NeuVector version; all references were verified against the current `main` branch of `github.com/neuvector/neuvector`.
