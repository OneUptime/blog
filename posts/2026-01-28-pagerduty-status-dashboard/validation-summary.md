# Validation Summary: How to Use PagerDuty Status Dashboard

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PagerDuty Status Pages
- PagerDuty External Status Page
- PagerDuty Private Status Page
- PagerDuty Business Services and service dependencies
- PagerDuty REST API
- Python requests
- JSON and YAML examples
- Mermaid diagrams

## Sources Consulted
- PagerDuty Status Pages Overview: https://support.pagerduty.com/main/docs/status-pages-overview
- PagerDuty External Status Page documentation: https://support.pagerduty.com/main/docs/external-status-page
- PagerDuty Internal Status Page documentation: https://support.pagerduty.com/main/docs/internal-status-page
- PagerDuty Private Status Page documentation: https://support.pagerduty.com/main/docs/private-status-page
- PagerDuty Business Services documentation: https://support.pagerduty.com/main/docs/business-services
- PagerDuty Service Dependencies documentation: https://support.pagerduty.com/main/docs/service-dependencies
- PagerDuty REST API OpenAPI schema: https://github.com/PagerDuty/api-schema
- PagerDuty Create a status update on an incident API reference: https://developer.pagerduty.com/api-reference/594c9ed714b93-create-a-status-update-on-an-incident
- PagerDuty Status Pages API reference: https://developer.pagerduty.com/api-reference/cc01037564658-list-status-pages
- PagerDuty Create a Status Page Subscription API reference: https://developer.pagerduty.com/api-reference/fd9e92810c604-create-a-status-page-subscription
- PagerDuty Maintenance Windows API reference: https://developer.pagerduty.com/api-reference/b3A6Mjc0ODE1OA-create-a-maintenance-window

## Issues Found
- The post used "Status Dashboard" for a public/private customer-facing status page. PagerDuty's current documentation describes these as Status Pages, with External, Private, and Internal Status Page products. Updated the title, description, headings, architecture diagram, and closing language to use Status Pages.
- The setup path incorrectly used **Status > Status Dashboard**. Updated it to **Status > External Status Page**, matching PagerDuty's current External Status Page setup flow.
- The architecture and subscription text mentioned SMS updates for status page subscribers. PagerDuty's External Status Page subscription documentation and API support email, Slack, and webhook channels, while the REST subscription API supports email and webhook. Updated the text and diagram accordingly.
- The status-level table used non-PagerDuty status labels such as Operational, Degraded Performance, Partial Outage, and Major Outage. Updated the status flow to PagerDuty's documented External Status Page impact levels: All Good, Minor, and Major.
- The service dependency example used a nonexistent endpoint under `/business_services/{id}/service_dependencies`. Updated it to the documented `/service_dependencies/associate` endpoint and added the current PagerDuty API Accept header.
- The impact mapping example implied configurable severity-to-status fields that are not documented for Status Pages. Updated it to describe PagerDuty's documented default that P1 and P2 incidents are considered impacting, with account-wide incident priority settings controlling the behavior.
- The subscription example used a nonexistent `/status_dashboards/{id}/subscriptions/config` endpoint and unsupported SMS configuration fields. Replaced it with a documented `POST /status_pages/{id}/subscriptions` example using the documented request body shape.
- The incident status update example wrapped the payload in `status_update` and included an unsupported `status` field. Updated it to the documented `POST /incidents/{id}/status_updates` request body with `message` and the required `From` header.
- The scheduled maintenance example used a dashboard ID even though PagerDuty maintenance windows and status page maintenance notices are separate concepts. Replaced it with a Status Page maintenance post example using `POST /status_pages/{id}/posts` and status/severity IDs supplied from the Status Pages API.
- The private dashboard section claimed private pages show detailed technical status, internal dependencies, and incident links. Updated this to match Private Status Page behavior around OpenID SSO, controlled audiences, and selected business services.

## Review Notes
The examples are written as illustrative Python helpers and use placeholder PagerDuty IDs. The Python snippets compile with `python3`, and all JSON snippets parse successfully. Status Page status and severity identifiers are account/page-specific API resources, so the maintenance example correctly uses placeholders that should be populated from the Status Page statuses and severities endpoints.
