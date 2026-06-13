# Validation Summary: How to Set Up PagerDuty for Incident Management

## Status
validated

## Post Type
Tutorial / setup guide

## Technologies Covered
- PagerDuty Incident Management
- PagerDuty services, integrations, schedules, escalation policies, incident priorities, Event Orchestration, and Incident Workflows
- Prometheus Alertmanager
- Datadog PagerDuty integration
- PagerDuty Events API v2
- Python requests
- YAML and JSON configuration snippets

## Sources Consulted
- PagerDuty Escalation Policy Basics: https://support.pagerduty.com/main/docs/escalation-policies
- PagerDuty Services and Integrations: https://support.pagerduty.com/main/docs/services-and-integrations
- PagerDuty Configurable Service Settings: https://support.pagerduty.com/main/docs/configurable-service-settings
- PagerDuty Event Management: https://support.pagerduty.com/main/docs/event-management
- PagerDuty Incident Priority: https://support.pagerduty.com/main/docs/incident-priority
- PagerDuty Incident Workflows: https://support.pagerduty.com/main/docs/incident-workflows
- PagerDuty Prometheus Integration Guide: https://www.pagerduty.com/docs/guides/prometheus-integration-guide/
- PagerDuty Events API v2 documentation: https://developer.pagerduty.com/docs/send-alert-event
- Prometheus Alertmanager configuration reference: https://prometheus.io/docs/alerting/latest/configuration/
- Datadog PagerDuty integration documentation: https://docs.datadoghq.com/integrations/pagerduty/
- PagerDuty Manage Users documentation for free-plan user limit: https://support.pagerduty.com/main/docs/manage-users

## Issues Found
- The Prometheus Alertmanager route examples used the older `match` mapping form. Updated them to current `matchers` list syntax so the snippet aligns with the current Alertmanager configuration reference and UTF-8 matcher guidance.
- The Datadog setup steps said to add a PagerDuty API key. Datadog's current PagerDuty integration expects a PagerDuty integration key per service, so the steps now say to add each service and paste its integration key.
- The priority-routing section referred to Event Rules. PagerDuty's current documentation uses Event Orchestration for inbound-event routing and setting incident priority at creation, so the terminology was updated.
- The automation section used the older Response Plays terminology. PagerDuty's current feature is Incident Workflows, so the heading, example label, and explanatory text were updated.

## Review Notes
The PagerDuty Events API v2 Python example is syntactically valid and uses the documented endpoint, `routing_key`, `event_action`, `payload.summary`, `payload.source`, `payload.severity`, and `dedup_key` fields. Incident Workflows and some workflow actions vary by PagerDuty plan, so teams should confirm plan availability before relying on those features.
