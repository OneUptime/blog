# How to Run a Rundeck Job Through the API with Options and a Dynamic Node Filter

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rundeck, REST API, API, Automation, Security

Description: Call Rundeck's run-job API with a JSON options map and node filter, then capture the execution ID, follow status, and constrain the caller's access.

---

Rundeck exposes a direct endpoint for starting a saved job by UUID. A JSON request can supply job options and a top-level node filter override. The API schedules an execution and returns its identity; the caller must query that execution if it needs the eventual result.

## Prepare the Job and API Identity

Find the saved job's UUID in its definition/page or list project jobs through the API. Use an API token belonging to a dedicated service account, not an administrator. The account needs application access to the project and project-context permission to run the job and targeted nodes.

Store connection values in the caller's secret/configuration system:

```bash
export RUNDECK_URL='https://rundeck.example.net'
export RUNDECK_API_VERSION='59' # use a version supported by your server
export RUNDECK_JOB_ID='3a13fca8-4d42-417e-812b-5f2f700dccb3'
```

Keep `RUNDECK_TOKEN` in a secret injection mechanism rather than a checked-in shell file. Rundeck's current API documentation is at version 59, but older installations support a lower maximum; use the version appropriate to the target server.

In the job, define options such as `environment` and `change_id`. Mark required options required, enforce a short environment list, and validate change IDs with a regex. Prefer options referenced by a saved dynamic filter. The API's documented `filter` request field is an explicit override; do not rely on the GUI's **Editable node filter** setting as a security boundary for API callers.

## Build JSON Without Shell Injection

Assume the job accepts two options and the caller is allowed to choose a filter. Construct the request with `jq`:

```bash
environment='prod'
change_id='CHG-123456'
node_filter='tags: web+prod !maintenance: true'

payload=$(jq -n \
  --arg environment "$environment" \
  --arg change_id "$change_id" \
  --arg filter "$node_filter" \
  '{
    options: {
      environment: $environment,
      change_id: $change_id
    },
    filter: $filter,
    loglevel: "INFO"
  }')
```

Do not interpolate raw values into a quoted JSON string. Node filters contain spaces, colons, backslashes, and regex metacharacters that are easy to corrupt, and untrusted shell interpolation can execute code before the request is sent.

The run-job API accepts either an `argString` or an `options` map. Since API v18, when `options` is present, `argString` is ignored. Use the map: it avoids command-line parsing and keeps each option value distinct.

## Start the Job

Send the request:

```bash
response=$(curl --silent --show-error --fail-with-body \
  --request POST \
  --header "X-Rundeck-Auth-Token: $RUNDECK_TOKEN" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data "$payload" \
  "$RUNDECK_URL/api/$RUNDECK_API_VERSION/job/$RUNDECK_JOB_ID/run")

execution_id=$(jq -er '.id' <<<"$response")
printf 'started Rundeck execution %s\n' "$execution_id"
```

The documented endpoint shape is:

```text
POST /api/V/job/ID/run
```

The JSON request can also include `runAtTime` and `asUser`. `asUser` requires explicit `runAs` authorization and should not be accepted from an untrusted caller. Keep it out unless impersonation is a designed requirement.

## Decide Who Owns the Dynamic Filter

There are two good patterns.

### Saved Filter with Options

Save this in the job:

```text
environment: ${option.environment} application: storefront
```

Then omit `filter` from the API payload and send only the enforced options. This is the preferred public integration because the job owns the targeting policy.

### API Filter Override

Send the top-level `filter` only from an operator-grade integration. Validate the filter in the caller and still apply Rundeck node ACLs. A syntactically valid filter such as `.*` can be dangerously broad, so character validation alone is not a security control. The **Editable node filter** setting controls interactive editing in the job UI; the run-job API reference documents its own `filter` parameter and should be protected with ACLs and caller-side policy.

Rundeck filter syntax uses attribute/value clauses. For tags, `+` means AND and `,` means OR:

```text
tags: web+prod
name: web-prod-01,web-prod-02
hostname: web-prod-.*\.example\.net !maintenance: true
```

Test the fully resolved filter in the project's Nodes page before automating a mutating job.

## Follow the Execution

An accepted run request means an execution was created, not that the job succeeded. Poll the execution endpoint with bounded backoff:

```bash
curl --silent --show-error --fail-with-body \
  --header "X-Rundeck-Auth-Token: $RUNDECK_TOKEN" \
  --header "Accept: application/json" \
  "$RUNDECK_URL/api/$RUNDECK_API_VERSION/execution/$execution_id"
```

Terminal statuses include `succeeded`, `failed`, `aborted`, and `timedout`. Set a caller-side deadline and surface the execution permalink/ID for investigation. Do not immediately POST again after an uncertain network timeout: the first request may have created an execution even though the response was lost. Use an idempotency option such as a change or request ID and check recent/running executions before retrying.

## Diagnose API Failures

- `401` indicates a missing, invalid, or expired token.
- `403` indicates the token's user lacks an ACL action.
- `404` often means an incorrect job UUID or an identity that cannot see the resource.
- `400` usually points to invalid JSON, a required/invalid option, a disabled execution, or an unacceptable filter.
- A successful POST followed by a failed execution is a job/runtime problem; inspect the execution, not the HTTP client.

Use `--fail-with-body` so automation preserves Rundeck's JSON error message. Redact tokens and secure option values from CI logs. HTTPS is essential because the token and request options authorize real operations.

## Conclusion

POST a JSON `options` map to `/api/V/job/ID/run`, include an API `filter` override only for a deliberately trusted integration, and capture the returned execution ID. Keep target selection constrained by saved clauses and node ACLs, generate JSON with a real encoder, and treat an accepted request separately from the final job status.

## Official Documentation

- [Rundeck API Reference: Running a Job](https://docs.rundeck.com/docs/api/#running-a-job)
- [Getting Started with the Rundeck API](https://docs.rundeck.com/docs/api/api_basics.html)
- [Rundeck Node Filter syntax](https://docs.rundeck.com/docs/manual/11-node-filters.html)
- [Rundeck Job Options](https://docs.rundeck.com/docs/manual/jobs/job-options.html)
- [Rundeck Access Control Policy](https://docs.rundeck.com/docs/administration/security/authorization.html)
