# Validation Summary: How to Implement MTTR Tracking

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Python dataclasses, enums, datetime, and statistics
- Flask webhook endpoints
- PagerDuty webhooks
- Opsgenie webhooks
- Prometheus Alertmanager webhooks
- DORA software delivery metrics
- Mermaid diagrams

## Sources Consulted
- DORA software delivery performance metrics: https://dora.dev/guides/dora-metrics/
- Google Cloud Four Keys / DORA metrics background: https://cloud.google.com/blog/products/devops-sre/using-the-four-keys-to-measure-your-devops-performance
- Python dataclasses documentation: https://docs.python.org/3/library/dataclasses.html
- Python statistics documentation: https://docs.python.org/3/library/statistics.html
- Flask API documentation: https://flask.palletsprojects.com/en/stable/api/
- PagerDuty webhooks documentation: https://support.pagerduty.com/main/docs/webhooks
- Opsgenie Webhook integration documentation: https://support.atlassian.com/opsgenie/docs/integrate-opsgenie-with-webhook/
- Opsgenie alert action data examples: https://support.atlassian.com/opsgenie/docs/opsgenie-edge-connector-alert-action-data/
- Prometheus Alertmanager notification data structures: https://prometheus.io/docs/alerting/latest/notifications/
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/

## Issues Found
- The introduction described MTTR as one of the four key DORA metrics. DORA's current guide identifies five software delivery performance metrics and describes the evolution from the original Four Keys model to Failed Deployment Recovery Time. Updated the wording to reflect both the current model and the earlier Four Keys terminology.
- The PagerDuty normalizer used the incident `created_at` field as the timestamp for every webhook event. PagerDuty V3 webhook payloads include `event.occurred_at`, which is the correct event timestamp for acknowledgments and resolutions. Updated the code to prefer `event.occurred_at` and fall back to `created_at`.
- The PagerDuty normalizer assumed `event.agent` was always an object. PagerDuty test payloads can set `agent` to `null`. Updated the code to handle a null agent safely.
- The Opsgenie normalizer treated `alert.tags` as a dictionary. Official Opsgenie payload examples show `tags` as a list. Updated the code to read service from alert details or from a `service:` tag convention.
- The Opsgenie normalizer used `createdAt` for all lifecycle events. Official alert action examples include `updatedAt` on later actions. Updated the code to use `updatedAt` for non-create actions and handle Opsgenie's nanosecond-style updated timestamp values.
- The Alertmanager normalizer used `startsAt` for resolved alerts. Alertmanager alert objects expose both `StartsAt` and `EndsAt`; resolved events should use the resolution time. Updated the code to use `endsAt` for resolved alerts.
- The sub-metric Mermaid diagram described MTTI/MTTM boundaries using "Root Cause Found," but the code does not track a root-cause-found timestamp and instead uses acknowledgment, mitigation, and resolution timestamps. Updated the diagram labels to match the implemented boundaries.

## Review Notes
The Python snippets compile successfully with `python3`. The webhook collector remains an illustrative example and still requires a real `incident_store` implementation before it can be run as an application.
