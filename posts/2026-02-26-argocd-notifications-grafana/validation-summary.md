# Validation Summary: How to Send ArgoCD Notifications to Grafana

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD Notifications
- Kubernetes
- Grafana annotations
- Grafana HTTP API
- YAML
- JSON
- Bash/curl

## Sources Consulted
- Argo CD notifications webhook service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD notifications templates documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- Argo CD notifications triggers documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD notifications subscriptions documentation: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/notifications/subscriptions/
- Grafana annotations HTTP API documentation: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/annotations/
- Grafana service accounts documentation: https://grafana.com/docs/grafana/latest/administration/service-accounts/

## Issues Found
- Updated Grafana authentication setup to use service account tokens instead of creating API keys, because Grafana service accounts are now the primary supported authentication method for HTTP API automation.
- Clarified that organization annotations are available to dashboards that query Grafana annotations, not automatically visible on every dashboard or panel.
- Replaced the unsupported `toUnixMilli` template filter with Argo CD's documented `time.Parse` helper and Go `UnixMilli` method.
- Fixed the region annotation example so `time` uses the sync start timestamp and `timeEnd` uses the sync finish timestamp.
- Added optional chaining to trigger conditions that read `app.status.operationState`, matching Argo CD guidance for optional application status fields.
- Fixed the global webhook subscription recipient from a YAML map (`grafana:`) to the plain webhook recipient string (`grafana`).
- Corrected the annotation JSON wording from panel JSON to dashboard JSON and updated the 403 troubleshooting note to refer to service account permissions.

## Review Notes
- Grafana 13 marks legacy `/api` endpoints as deprecated in favor of `/apis`, but the annotations docs state the legacy `/api/annotations` endpoint remains accessible and there is not necessarily a replacement for every legacy API yet.
