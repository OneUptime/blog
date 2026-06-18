# Validation Summary: How to Implement Action Item Tracking

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Python
- TypeScript
- Jira Cloud REST API
- Atlassian Document Format
- GitHub Issues REST API
- Octokit
- Slack incoming webhooks
- YAML
- Mermaid flowcharts

## Sources Consulted
- Atlassian Jira Cloud REST API v3 issue documentation: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/
- Atlassian basic authentication for Jira Cloud REST APIs: https://developer.atlassian.com/cloud/jira/platform/basic-auth-for-rest-apis/
- Atlassian Document Format structure documentation: https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/
- Octokit REST.js documentation: https://octokit.github.io/rest.js/
- GitHub REST API documentation for issues: https://docs.github.com/en/rest/issues/issues
- Slack incoming webhooks documentation: https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/
- Python statistics module documentation: https://docs.python.org/3/library/statistics.html#statistics.median
- Python datetime module documentation: https://docs.python.org/3/library/datetime.html#datetime.datetime.fromisoformat
- Mermaid flowchart syntax documentation: https://mermaid.js.org/syntax/flowchart.html
- YAML 1.2.2 specification: https://yaml.org/spec/1.2.2/

## Issues Found
- The Jira example used `Authorization: Bearer <api_token>` with a Jira Cloud API token. Jira Cloud API tokens use HTTP Basic authentication with an email address and API token, so the example now builds a Basic auth header from `email:api_token`.
- The Jira example used `/rest/api/2/issue` and a wiki-markup description string. The current Jira Cloud v3 API uses `/rest/api/3/issue`, and rich text fields such as `description` use Atlassian Document Format, so the example now builds an ADF document.
- The Jira example assigned issues with `assignee: {"name": ...}`. Jira Cloud user identifiers now use `accountId`, so the example now accepts `owner_account_id` and sends `assignee: {"accountId": ...}`.
- The GitHub Issues example used `this.octokit.issues.create`. Current Octokit REST examples use the `octokit.rest` namespace, so the code now calls `this.octokit.rest.issues.create`.
- The GitHub example did not call `main()` and silently allowed an empty GitHub token. The example now validates `GITHUB_TOKEN` and invokes `main()` with error handling.
- The metrics example calculated the median by selecting the upper middle value for even-sized samples. It now uses Python's `statistics.median`.
- The aging counters were exclusive buckets even though the metric names read as cumulative thresholds. The code now counts items over 90 days in the over-60 and over-30 totals as well.
- The weekly report labeled `total_complete` as "Completed (30d)", but the metric is all completed items. The label now reads "Completed Items".
- The post included an unsupported exact claim that 60% of post-incident action items never get completed. The wording was changed to a non-numeric statement.

## Review Notes
Python snippets were syntax-checked with `ast.parse`. A full TypeScript typecheck was not run because this repository has TypeScript installed but not `@octokit/rest`; the Octokit call pattern was verified against the official Octokit and GitHub REST API documentation instead.
