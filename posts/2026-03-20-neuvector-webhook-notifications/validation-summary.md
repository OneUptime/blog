# Validation Summary: How to Configure NeuVector Webhook Notifications

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- NeuVector (container security platform)
- NeuVector Controller REST API (`/v1/system/webhook`, `/v1/response/rule`)
- Slack Incoming Webhooks
- Microsoft Teams Incoming Webhooks (Office 365 connectors)
- PagerDuty Events API v2
- Python (Flask) for a custom webhook receiver
- Elasticsearch (event indexing)
- Kubernetes (Deployment manifest, apps/v1)
- curl / jq

## Sources Consulted
- NeuVector REST API reference for system webhook configuration and response rules
- Slack Incoming Webhooks documentation: https://api.slack.com/messaging/webhooks
- Microsoft Teams Incoming Webhook (Office 365 connector) documentation
- PagerDuty Events API v2 documentation: https://developer.pagerduty.com/docs/events-api-v2/overview/
- Flask documentation: https://flask.palletsprojects.com/
- Kubernetes apps/v1 Deployment reference: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
No technical issues found.

- Slack webhook URL pattern (`https://hooks.slack.com/services/T.../B.../...`) is correct.
- PagerDuty Events API v2 endpoint (`https://events.pagerduty.com/v2/enqueue`) and the trigger payload (`routing_key`, `event_action`, `dedup_key`, `payload.summary`, `payload.severity`, `payload.source`, `payload.custom_details`) match the official spec.
- Microsoft Teams Incoming Webhook URL pattern (`*.webhook.office.com/webhookb2/...`) is accurate.
- NeuVector webhook payload shape with `config: {name, url, type, enable, cfg_type}` and types `Slack`, `Teams`, `PagerDuty`, `JSON` matches NeuVector's controller API conventions; `cfg_type: "user"` is a valid value alongside `learned`/`federal`.
- Flask receiver code is syntactically valid; routes, JSON parsing, and the f-string formatting are all correct.
- Kubernetes Deployment YAML uses valid `apps/v1` schema with proper selector/template alignment and a single container spec.

## Review Notes
- Microsoft has been migrating Teams Incoming Webhook (Office 365 connectors) functionality toward Workflows / Power Automate. The connector approach still works in many tenants but is deprecated for new use; readers configuring Teams in greenfield environments should be aware they may need to use Workflows instead in the future.
- The example Flask receiver does not implement authentication or signature verification on inbound NeuVector requests. For production, readers should add a shared-secret check or mTLS in front of the receiver.
- The hardcoded `routing_key: "YOUR_INTEGRATION_KEY"` placeholder in the Python forwarder is intentional but would obviously need to be sourced from a secret/env var in production.
- Response rule condition formatting (`conditions: [{"type": "level", "value": "critical"}]`) is consistent with NeuVector's documented condition shape; severity strings are typically capitalized in events themselves (e.g., "Critical"), but the response-rule matcher accepts the lowercased form shown.
