# Validation Summary: How to Configure PagerDuty Webhooks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PagerDuty V3 webhooks
- PagerDuty REST API
- Python
- Flask
- Node.js
- Express
- HMAC-SHA256 signature verification
- Redis
- ngrok

## Sources Consulted
- PagerDuty Support: Webhooks - https://support.pagerduty.com/main/docs/webhooks
- PagerDuty Developer Docs: V3 webhooks overview - https://developer.pagerduty.com/docs/ZG9jOjQ1MTg4ODQ0-overview
- PagerDuty Developer Docs: Verifying webhook signatures - https://developer.pagerduty.com/docs/verifying-webhook-signatures
- PagerDuty API Reference: Create a webhook subscription - https://developer.pagerduty.com/api-reference/b3A6MjkyNDc4NA-create-a-webhook-subscription
- PagerDuty Developer Docs: Webhook behavior - https://developer.pagerduty.com/docs/ZG9jOjExMDI5NTkx-behavior
- Flask API documentation - https://flask.palletsprojects.com/en/stable/api/
- Python hmac documentation - https://docs.python.org/3/library/hmac.html
- Express API documentation - https://expressjs.com/en/api/
- Node.js crypto documentation - https://nodejs.org/api/crypto.html
- ngrok Agent CLI documentation - https://ngrok.com/docs/agent/cli

## Issues Found
- The setup section used the older `/extensions` API and called the resource a webhook extension. Current PagerDuty V3 webhooks are managed as webhook subscriptions. Updated the UI path, API endpoint, payload shape, and terminology to use `POST /webhook_subscriptions`, `webhook_subscription`, `delivery_method`, `events`, and `filter`.
- The sample code identified `PJFWPEP` as a Generic V3 Webhooks schema ID. PagerDuty documents that ID in the V1/V2 generic webhook extension migration path, not as the V3 subscription model. Removed the extension schema from the sample.
- The webhook payload used `assignments.assignee` and `priority.name`/`service.name`. V3 incident webhook examples use reference-style fields such as `assignees`, `summary`, `self`, and `html_url`. Updated the sample payload and handler logic accordingly.
- The Flask signature verification assumed a single exact `X-PagerDuty-Signature` value and could fail on missing signatures. PagerDuty signatures can contain multiple comma-separated `v1=` values during key rotation. Updated the code to reject missing signatures and compare against each provided signature with `hmac.compare_digest`.
- The Flask handler called `.get()` directly on `request.get_json(silent=True)`, which can return `None`. Added a safe fallback to `{}`.
- The Express signature verification used `JSON.stringify(req.body)`, which may not match the exact signed request body. Updated the example to capture and verify `req.rawBody` via the `express.json()` `verify` option.
- The Express signature check could throw on missing signatures or unequal buffer lengths. Updated it to reject missing signatures and check buffer length before `crypto.timingSafeEqual`.
- The retry section claimed exponential backoff and said returning 4xx stops retries. PagerDuty's official behavior documentation states failed webhooks are periodically retried for up to 48 hours. Updated the text and example to return 2xx for permanent application-level ignores and 5xx for temporary failures.
- The `incident.unacknowledged` description was too narrow. Updated it from "Acknowledgment timed out" to "Incident became unacknowledged."

## Review Notes
- The example handler still references placeholder functions such as `create_jira_ticket`, `createGitHubIssue`, and `process_event`; this is acceptable for an integration tutorial, but a production-ready sample would define or stub those functions explicitly.
- PagerDuty supports additional V3 event types beyond the subset shown in the article. The post presents a practical subset rather than an exhaustive reference.
