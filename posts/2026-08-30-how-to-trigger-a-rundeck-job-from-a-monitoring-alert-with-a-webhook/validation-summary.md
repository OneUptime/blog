# Validation Summary: How to Trigger a Rundeck Job from a Monitoring Alert with a Webhook

## Status

validated

## Post Type

Technical tutorial and security-focused integration guide

## Technologies Covered

- Rundeck / PagerDuty Runbook Automation
- Rundeck Run Job and Advanced Run Job webhook handlers
- Rundeck job options and dynamic node filters
- Rundeck access-control policies for projects, jobs, and nodes
- JSON webhook payload mapping and webhook context variables
- HTTP `Authorization` headers, HTTPS, and webhook authentication tokens
- Idempotent alert remediation and execution-status monitoring
- `curl`

## Sources Consulted

- [Rundeck Webhooks](https://docs.rundeck.com/docs/manual/webhooks.html) - verified webhook creation, the logged-in-once user requirement, optional authorization strings, regeneration behavior, and webhook activity logging.
- [Run Job Webhook Plugin](https://docs.rundeck.com/docs/manual/webhooks/run-job.html) - verified JSON-only input, `${data...}` mapping, `${raw}`, webhook context variables, node-filter overrides, option arguments, and the successful kickoff response.
- [Advanced Run Job Webhook](https://docs.rundeck.com/docs/manual/webhooks/advanced-run-job.html) - verified commercial availability and condition-based selective execution.
- [Rundeck Access Control Policy](https://docs.rundeck.com/docs/administration/security/authorization.html) - verified application- and project-context permissions, job visibility and execution actions, and node execution authorization.
- [Rundeck Job Options](https://docs.rundeck.com/docs/manual/jobs/job-options.html) - verified required values, enforced allowed values, regular-expression validation, and `${option.name}` references.
- [Rundeck Node Filters](https://docs.rundeck.com/docs/manual/11-node-filters.html) - verified custom-attribute filter syntax and AND behavior across filter clauses.
- [Rundeck Creating Jobs](https://docs.rundeck.com/docs/manual/jobs/creating-jobs.html#dynamic-node-filters) - verified substitution of job options into saved node filters.
- [Rundeck API: Send Webhook Event and Webhook Management](https://docs.rundeck.com/docs/api/#send-webhook-event) - verified the `POST /api/V/webhook/[AUTH_TOKEN]` endpoint, plugin-defined responses, webhook update restrictions, and execution-status API availability.
- [Rundeck API Version History: Version 33](https://docs.rundeck.com/docs/api/rundeck-api-versions.html#version-33) - verified the API version in which the webhook endpoint was introduced.
- [Rundeck Project Archive](https://docs.rundeck.com/docs/manual/projects/project-archive.html) - verified webhook import with regenerated webhook authentication tokens.
- [Rundeck Job Notifications](https://docs.rundeck.com/docs/manual/jobs/job-notifications.html) - verified success and failure completion notifications.
- [Rundeck Webhook Event Plugin Best Practices](https://docs.rundeck.com/docs/developer/webhook-plugins.html#best-practices) - verified that provider signature validation is handler-specific rather than supplied by the basic Run Job handler.
- [Rundeck Run Job handler source](https://github.com/rundeck/rundeck/blob/dca20aed8a7b5f9fc854691e9086e60f89e9ff6e/grails-webhooks/src/main/groovy/webhooks/plugins/JobRunWebhookEventPlugin.groovy) - cross-checked JSON parsing, template expansion, job lookup, execution kickoff, and response fields.
- [Rundeck Webhook controller source](https://github.com/rundeck/rundeck/blob/dca20aed8a7b5f9fc854691e9086e60f89e9ff6e/grails-webhooks/grails-app/controllers/webhooks/WebhookController.groovy) - verified project-context webhook `post` authorization before handler invocation.
- [Rundeck JobStateService and ExecutionService sources](https://github.com/rundeck/rundeck/blob/dca20aed8a7b5f9fc854691e9086e60f89e9ff6e/rundeckapp/grails-app/services/rundeck/services/JobStateService.groovy) - verified job lookup and visibility authorization; [ExecutionService](https://github.com/rundeck/rundeck/blob/dca20aed8a7b5f9fc854691e9086e60f89e9ff6e/rundeckapp/grails-app/services/rundeck/services/ExecutionService.groovy) was used to verify job `run` and node `read`/`run` checks.
- [Rundeck WebhookService source](https://github.com/rundeck/rundeck/blob/dca20aed8a7b5f9fc854691e9086e60f89e9ff6e/grails-webhooks/grails-app/services/webhooks/WebhookService.groovy) - verified save-time authorization-string replacement and webhook-token regeneration during import.
- [Rundeck authorization-header authenticator source](https://github.com/rundeck/rundeck/blob/dca20aed8a7b5f9fc854691e9086e60f89e9ff6e/grails-webhooks/src/main/groovy/webhooks/authenticator/AuthorizationHeaderAuthenticator.groovy) - verified exact, scheme-free comparison of the supplied `Authorization` header value.
- [curl manual](https://curl.se/docs/manpage.html) - verified `--fail-with-body`, `--request`, `--header`, and `--data @file` behavior.

## Issues Found

1. **Missing webhook-post authorization** - The ACL guidance covered project visibility, job access, and node access but omitted project-context `post` permission on webhooks, which Rundeck checks before invoking the handler. The post now lists that permission and states the job visibility alternatives explicitly; current Run Job execution requires job `view` or `read` plus `run`, and node `read` plus `run`.
2. **Imprecise authorization-string regeneration timing** - The post said regeneration invalidated the previous value immediately, but Rundeck applies and displays the regenerated string when the webhook is saved. The wording now identifies save as the point when the replacement takes effect.
3. **Incomplete Post URL token rotation guidance** - The post recommended rotating the Post URL token without noting that Rundeck's update API ignores `authToken` changes. The operations guidance now explains that rotation requires webhook recreation or a project-archive import that regenerates webhook tokens, while the separate authorization string uses the **Regenerate** control.

## Review Notes

- The post does not target a specific Rundeck release. It was checked against the current API version 59 documentation available on 2026-08-30; the send-webhook endpoint has existed since API version 33.
- The JSON fixture is valid, the option mapping and node-filter expressions use documented syntax, and the sample response matches the Run Job handler's documented kickoff response.
- The `curl` command is syntactically valid. `--fail-with-body` requires curl 7.76.0 or later.
- The returned execution ID acknowledges job kickoff, not completion; querying the authenticated execution API or configuring job completion notifications is correct.
- All four official documentation links already present in the post resolve to the intended current Rundeck pages.
