# Validation Summary: How to Build Incident Communication

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Python
- Atlassian Statuspage API
- Slack Web API and Python Slack SDK
- PagerDuty REST API
- Mermaid flowchart, sequence diagram, and Gantt syntax
- Incident management and SRE communication practices

## Sources Consulted
- Atlassian Statuspage API documentation: https://developer.statuspage.io/
- Atlassian Statuspage top-level status and incident impact calculations: https://support.atlassian.com/statuspage/docs/top-level-status-and-incident-impact-calculations/
- Slack Web API `conversations.create`: https://docs.slack.dev/reference/methods/conversations.create/
- Slack Web API `conversations.setTopic`: https://docs.slack.dev/reference/methods/conversations.setTopic/
- Slack Web API `conversations.setPurpose`: https://docs.slack.dev/reference/methods/conversations.setPurpose/
- Slack Web API `pins.add`: https://docs.slack.dev/reference/methods/pins.add/
- Slack Web API `users.lookupByEmail`: https://docs.slack.dev/reference/methods/users.lookupByEmail/
- Slack `users:read.email` scope documentation: https://docs.slack.dev/reference/scopes/users.read.email/
- PagerDuty Create an Incident API documentation: https://developer.pagerduty.com/api-reference/a7d81b0e9200f-create-an-incident
- Mermaid Gantt syntax documentation: https://mermaid.ai/open-source/syntax/gantt.html
- Python `datetime` documentation: https://docs.python.org/3/library/datetime.html
- Python 3.12 release notes for `datetime.utcnow()` deprecation: https://docs.python.org/3/whatsnew/3.12.html

## Issues Found
- The Statuspage incident creation example used a dictionary in `incident["component_ids"]`. Statuspage expects `component_ids` to be a list of component IDs and uses the separate `components` object to update component statuses. Changed the example to send `component_ids` as the affected component list and `components` as the component-to-status mapping.
- The Statuspage `IncidentSeverity.SEV4` value was `"informational"`, which is not a valid Statuspage incident impact override. Changed it to `"none"` to match Statuspage's supported incident impact values.
- The Python examples used `datetime.utcnow()`, which is deprecated as of Python 3.12. Replaced it with `datetime.now(timezone.utc)` and added the required `timezone` imports.

## Review Notes
The Python code blocks compile successfully after the fixes. Several integrations remain illustrative and use placeholder values, stubbed sender implementations, and organization-specific assumptions such as deriving Slack email addresses from handles; these are acceptable for the article's example-oriented scope but would need production configuration.
