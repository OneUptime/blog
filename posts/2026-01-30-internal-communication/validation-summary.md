# Validation Summary: How to Build Internal Communication

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Slack Web API
- Slack Bolt for JavaScript
- Slack Block Kit
- Slack Python SDK / Async WebClient style methods
- JavaScript / Node.js
- Python
- Mermaid diagrams
- Incident management and SRE communication workflows

## Sources Consulted
- Slack Developer Docs: `conversations.create` method - https://docs.slack.dev/reference/methods/conversations.create/
- Slack Developer Docs: `conversations.setTopic` method - https://docs.slack.dev/reference/methods/conversations.setTopic/
- Slack Developer Docs: `conversations.history` method - https://docs.slack.dev/reference/methods/conversations.history/
- Slack Developer Docs: Using the Conversations API - https://docs.slack.dev/apis/web-api/using-the-conversations-api/
- Slack Developer Docs: Bolt for JavaScript app creation - https://docs.slack.dev/tools/bolt-js/creating-an-app/
- Slack Developer Docs: Bolt for JavaScript Socket Mode - https://docs.slack.dev/tools/bolt-js/concepts/socket-mode/
- Slack Developer Docs: Block Kit button element - https://docs.slack.dev/reference/block-kit/block-elements/button-element/
- Slack Developer Docs: Python Slack SDK - https://docs.slack.dev/tools/python-slack-sdk/
- Mermaid syntax documentation - https://mermaid.ai/open-source/intro/syntax-reference.html

## Issues Found
- The war room channel name builder could produce invalid Slack channel names when `incident.id` contained uppercase letters or special characters. Slack documents that `conversations.create` channel names may contain only lowercase letters, numbers, hyphens, and underscores, and must be 80 characters or less. I changed the example to sanitize the full generated channel name components and cap the result at 80 characters.
- The war room example called `this.getOnCallResponders()` without defining it. I changed the example to accept an `onCallResponderProvider` dependency and call `getResponders()` on that dependency so the integration boundary is explicit.
- The Incident Bot example called undefined helper methods for timeline retrieval, status update posting, role assignment, and escalation modal creation. I changed those calls to use an injected `incidentService`, making clear that these are application-specific service operations rather than missing Slack Bolt APIs.
- The Handoff Manager example called undefined helper methods for open questions and recommended next steps. I changed those calls to use an injected `handoffAdvisor` dependency.

## Review Notes
- The Slack Web API method names and Block Kit button fields used in the JavaScript examples match current Slack documentation.
- The Python Slack SDK method naming style shown for async Web API calls is consistent with Slack's Python SDK conventions.
- The `conversations.history` example uses cursor-based pagination and a limit of 200, which matches Slack's recommendation.
- Verified JavaScript snippets with `node --check`.
- Verified Python snippets with `python3 -m py_compile`.
