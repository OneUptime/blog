# Validation Summary: Why Doesn't Rundeck Retry a Failed Job Reference? Designing Retries at the Right Level

## Status

validated

## Post Type

Technical troubleshooting and retry-design guide

## Technologies Covered

- Rundeck job-level Retry behavior
- Rundeck Job Reference steps and parent workflows
- Rundeck REST API and execution retry chains
- Rundeck `rd` CLI
- Rundeck job options and context variables
- Bash retry loops and exit-status handling
- Idempotency, backoff, retry budgets, and duplicate-start handling

## Sources Consulted

- [Rundeck Creating Jobs: Retry, retry delay, option references, and direct-invocation limitation](https://docs.rundeck.com/docs/manual/jobs/creating-jobs.html#retry)
- [Rundeck API Reference: API version requirements, Running a Job, Retry Based on Execution, and execution statuses](https://docs.rundeck.com/docs/api/)
- [Rundeck Job Workflows: workflow failure behavior and Error Handlers](https://docs.rundeck.com/docs/manual/jobs/job-workflows.html#error-handlers)
- [Rundeck built-in Node Steps: Job Reference](https://docs.rundeck.com/docs/manual/jobs/job-plugins/node-steps/builtin.html#job-reference-step)
- [Rundeck Job JSON v44: `retry` count and delay representation](https://docs.rundeck.com/docs/manual/document-format-reference/job-json-v44.html)
- [Rundeck Job Variables Reference: environment-variable mapping and retry context](https://docs.rundeck.com/docs/manual/jobs/job-variables.html)
- [Rundeck `rd` CLI command reference: `run` and `retry`](https://docs.rundeck.com/docs/rd-cli/commands.html)
- [Rundeck Job Resume plugin: normal Retry starts a fresh execution and Resume on Retry changes the default scope](https://docs.rundeck.com/docs/manual/jobs/job-resume.html#resume-on-retry)
- [Rundeck Retry Failed Nodes plugin](https://docs.rundeck.com/docs/manual/jobs/job-retry-failed-nodes.html)
- [Rundeck source: automatic retry creation and retry-successor linking](https://github.com/rundeck/rundeck/blob/dca20aed8a7b5f9fc854691e9086e60f89e9ff6e/rundeckapp/grails-app/services/rundeck/services/ExecutionService.groovy#L3497-L3533)
- [Rundeck source: `retriedExecution` in execution API responses](https://github.com/rundeck/rundeck/blob/dca20aed8a7b5f9fc854691e9086e60f89e9ff6e/rundeckapp/grails-app/services/rundeck/services/ExecutionService.groovy#L444-L470)
- [GNU Bash manual: `set -e` behavior](https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html)

## Issues Found

1. The direct-invocation list showed `POST /job/ID/run`, but Rundeck requires an API version in every API URL. Changed it to `POST /api/<version>/job/ID/run`.
2. The retry-execution API/UI description did not state that this operation is based on a failed execution. Added that requirement to match the documented endpoint.
3. The post could imply that a Job Reference has its own top-level execution lifecycle. Clarified that the parent owns the top-level execution and the reference is a nested step; Rundeck can still record referenced-execution data for history.
4. The Bash wrapper retried every nonzero exit status, including permanent configuration or authorization failures. Added an explicit command contract for retryable exit status 75, made permanent failures exit immediately, and preserved the transient command's status when the retry budget is exhausted.
5. The statement that any failed Job Reference fails the parent ignored successful Error Handlers, and the statement that parent Retry always repeats everything ignored execution plugins that can change retry scope. Qualified these claims as an unhandled failure and the default retry behavior.
6. The notification guidance suggested the current execution ID as a deduplication key. Because each automatic retry has a new execution ID, changed the guidance to use a stable request or operation ID.
7. The standalone-child pattern said to poll only the execution ID returned by the run-job call. Automatic Retry creates fresh linked executions, so changed the guidance to monitor the complete retry chain through its terminal result.
8. A request ID plus a recent/running-execution lookup was presented as duplicate-start protection, but the run-job API has no documented atomic idempotency-key operation and the lookup can race. Changed the guidance to enforce idempotency atomically in the child or target system and use the lookup only as a recovery aid.
9. The amplification example treated three parent retries and five webhook retries as total attempts and therefore reported 60 calls. Including the initial parent execution and initial webhook delivery produces `4 × 4 × 6 = 96` calls, so the explanation and total were corrected.

## Review Notes

- The central claim is explicitly supported by Rundeck documentation: job-level Retry affects direct invocations and does not affect a Job Reference.
- The revised Bash block passes `bash -n`. Exit status 75 is an example contract for the hypothetical `reconcile-release` command, not a Rundeck-defined status.
- The `RD_OPTION_RELEASE_ID` and `RD_OPTION_REQUEST_ID` names follow Rundeck's documented option-to-environment-variable transformation.
- `rd run`, retry-count option references, retry-delay option references, delays such as `30s` and `5m`, and the `job.retryAttempt` / `job.wasRetry` context variables are current and documented.
- Current official API documentation is version 59, lists 17 as the minimum supported version, and requires callers to include a supported version in the URL. The post uses a version placeholder so it is not tied to one release.
- By default, automatic Retry starts a fresh execution. Commercial Resume on Retry and Retry Failed Nodes plugins can change which workflow state or nodes are repeated, which is why the post now qualifies full-workflow repetition as default behavior.
- Every external documentation link in the post returned HTTP 200 and pointed to the intended official Rundeck page during validation.
