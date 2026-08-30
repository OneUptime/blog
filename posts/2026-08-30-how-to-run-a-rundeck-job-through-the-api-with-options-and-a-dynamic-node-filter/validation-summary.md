# Validation Summary: How to Run a Rundeck Job Through the API with Options and a Dynamic Node Filter

## Status
validated

## Post Type
Technical tutorial / API integration guide

## Technologies Covered

- Rundeck and its REST API (API version 59)
- Rundeck jobs, options, executions, node filters, and ACL policies
- Bash
- `curl`
- `jq`
- JSON over HTTPS

## Sources Consulted

- [Rundeck API Reference — API version, authentication, errors, running a job, and execution status](https://docs.rundeck.com/docs/api/)
- [Rundeck API Version History](https://docs.rundeck.com/docs/api/rundeck-api-versions.html)
- [Getting Started with the Rundeck API](https://docs.rundeck.com/docs/api/api_basics.html)
- [Rundeck Node Filter syntax](https://docs.rundeck.com/docs/manual/11-node-filters.html)
- [Rundeck Creating Jobs — Dynamic node filters](https://docs.rundeck.com/docs/manual/jobs/creating-jobs.html#dynamic-node-filters)
- [Rundeck Job Options](https://docs.rundeck.com/docs/manual/jobs/job-options.html)
- [Rundeck Access Control Policy](https://docs.rundeck.com/docs/administration/security/authorization.html)
- [Rundeck Activity — execution status definitions](https://docs.rundeck.com/docs/manual/08-activity.html)
- [Rundeck v6.1.0 run-job controller source](https://github.com/rundeck/rundeck/blob/v6.1.0/rundeckapp/grails-app/controllers/rundeck/controllers/ScheduledExecutionController.groovy)
- [Rundeck v6.1.0 execution-info controller source](https://github.com/rundeck/rundeck/blob/v6.1.0/rundeckapp/grails-app/controllers/rundeck/controllers/ExecutionController.groovy)
- [Rundeck v6.1.0 API authentication interceptor source](https://github.com/rundeck/rundeck/blob/v6.1.0/rundeckapp/grails-app/controllers/rundeck/interceptors/AuthorizationInterceptor.groovy)
- [curl command-line manual](https://curl.se/docs/manpage.html)
- [jq 1.8 manual](https://jqlang.org/manual/v1.8/)
- [GNU Bash Reference Manual — Shell Expansions](https://www.gnu.org/software/bash/manual/html_node/Shell-Expansions.html)
- [GNU Bash Reference Manual — Simple Command Expansion](https://www.gnu.org/software/bash/manual/html_node/Simple-Command-Expansion.html)
- [RFC 9110, Section 9.2.2 — Idempotent Methods](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2)

## Issues Found

1. **Incomplete ACL requirements** — The post only said the identity needed general project access and permission to run the job and nodes. It now names application-context project `read`, project-context job `run` plus `view`/`read`, node `read` plus `run`, and event `read` when listing recent/running executions. These permissions cover launching, polling, node authorization, and the suggested duplicate pre-check.
2. **Unchecked `curl` and `jq` failures** — `curl --fail-with-body` returns a nonzero status for HTTP errors, and `jq -e` returns nonzero when `.id` is absent. The original assignments ignored both statuses and could print a blank execution ID after a failed request. Added explicit failure blocks that preserve the response body, report the error, and exit nonzero.
3. **Incorrect shell-injection explanation** — Ordinary quoted Bash variable expansion does not execute shell syntax contained in the variable. Reworded the warning to describe the actual risks of hand-built JSON: invalid JSON and JSON-structure injection. Shell execution is now correctly tied to a second parsing step such as `eval` or `sh -c`.
4. **Ambiguous `asUser` semantics** — Calling `asUser` impersonation could imply that Rundeck adopts the named user's permissions. Clarified that it changes execution attribution while authorization remains based on the API caller, and retained the documented `runAs` permission requirement.
5. **Incomplete execution-status handling** — The original polling guidance named only four terminal statuses. Added the documented `failed-with-retry` and `other`/`customStatus` cases, identified `scheduled`, `queued`, and `running` as non-terminal, and advised surfacing unknown values instead of polling forever.
6. **Overstated idempotency guarantee** — A change/request-ID job option is ordinary input; Rundeck's run-job request has no documented idempotency key. Clarified that the job or a durable external store must atomically reject duplicate IDs for true retry idempotency and that a history pre-check is only a best-effort guard.
7. **Incorrect HTTP-status diagnosis** — Current Rundeck returns `403` both for invalid API-token authentication and for ACL denial, so `401` versus `403` cannot distinguish those causes. Also, the run-job endpoint returns `403` for an existing job the caller cannot run rather than hiding it with `404`. Updated the bullets to reflect current behavior and to recommend inspecting the JSON error body.

## Review Notes

- API version 59 is current in the reviewed Rundeck documentation. The endpoint `POST /api/V/job/ID/run`, JSON fields (`options`, `filter`, `loglevel`, `runAtTime`, and `asUser`), v18 option-map precedence, top-level execution response, and `GET /api/V/execution/ID` polling endpoint were verified.
- The top-level API `filter` is a replacement override even when the job's interactive **Editable node filter** setting is disabled. The post correctly treats ACLs and caller-side policy—not that UI setting—as the security controls.
- The saved dynamic-filter substitution and all three node-filter examples are valid. The documented tag semantics are `+` for AND and `,` for OR.
- `--fail-with-body` is current and non-deprecated but requires curl 7.76.0 or newer.
- All five links in the post's Official Documentation section resolve to the intended Rundeck documentation.
