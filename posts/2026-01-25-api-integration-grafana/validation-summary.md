# Validation Summary: How to Integrate with APIs in Grafana

## Status
validated

## Post Type
Technical tutorial / integration guide

## Technologies Covered
- Grafana HTTP API
- Grafana service accounts and legacy API keys
- Grafana dashboard, data source, and alerting provisioning APIs
- cURL
- Python requests
- GitHub Actions
- Terraform Grafana provider

## Sources Consulted
- Grafana service accounts documentation: https://grafana.com/docs/grafana/latest/administration/service-accounts/
- Grafana API key migration documentation: https://grafana.com/docs/grafana/latest/administration/service-accounts/migrate-api-keys/
- Grafana legacy HTTP API notice: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/
- Grafana Dashboard HTTP API: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/dashboard/
- Grafana Dashboard Versions HTTP API: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/dashboard_versions/
- Grafana Data source HTTP API: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/data_source/
- Grafana Alerting Provisioning HTTP API: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/alerting_provisioning/
- Grafana Folder/Dashboard Search HTTP API: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/folder_dashboard_search/
- Grafana Terraform dashboard management guide: https://grafana.com/docs/grafana/latest/as-code/infrastructure-as-code/terraform/dashboards-github-action/
- Terraform Grafana provider registry listing: https://registry.terraform.io/providers/grafana/grafana/latest

## Issues Found
- API keys were presented as a normal current authentication option with an outdated UI path. Updated the section to call them legacy/deprecated and point readers toward migration to service account tokens.
- The service account UI path was incomplete. Updated the steps to match the documented Administration > Users and access > Service accounts flow.
- The post used legacy `/api` endpoints without noting current Grafana 13 deprecation status. Added a short caveat that the examples use legacy routes that remain available but are deprecated in favor of `/apis`.
- One JSON response example used `[...]`, which is not valid JSON inside a `json` fenced block. Replaced it with an empty array.
- Dashboard examples used `folderUid: "general"`, but the root/General folder UID is represented as an empty string in Grafana examples and responses. Updated the request body and Python client default to use `""`.
- The data source update example used the older numeric ID route. Updated it to the documented UID route, `PUT /api/datasources/uid/:uid`, and added a stable UID to the create/update payloads.
- The alert rule creation payload omitted fields required by the provisioning API shape, including `ruleGroup`, `orgId`, query metadata, and an expression model compatible with Grafana-managed alerts. Updated the payload to a complete example.
- The dashboard restore request lacked a JSON content type header. Added `Content-Type: application/json`.
- The Terraform provider version constraint targeted the old major version 2 line. Updated it to `>= 4.0.0` so the example tracks the current provider generation.

## Review Notes
- Python and JSON fenced code blocks were parsed locally and are syntactically valid.
- Terraform was not installed in the review environment, so the HCL snippet was reviewed against official provider documentation but not run through `terraform validate`.
- Some examples still use legacy Grafana `/api` routes intentionally because Grafana has not provided exact replacements for every legacy API shown, and the official docs state those legacy routes remain operational.
