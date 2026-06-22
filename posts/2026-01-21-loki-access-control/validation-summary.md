# Validation Summary: How to Implement Log Access Control in Loki

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Grafana Loki
- Grafana
- Grafana Alloy
- NGINX
- Open Policy Agent (OPA) and Rego
- LogQL
- Python and Flask
- curl
- LDAP / OIDC integration concepts

## Sources Consulted
- Grafana Loki multi-tenancy documentation: https://grafana.com/docs/loki/latest/operations/multi-tenancy/
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki HTTP API reference: https://grafana.com/docs/loki/latest/reference/loki-http-api/
- Grafana Loki TSDB storage documentation: https://grafana.com/docs/loki/latest/operations/storage/tsdb/
- Grafana Promtail EOL notice: https://grafana.com/docs/loki/latest/send-data/promtail/
- Grafana provisioning documentation for data sources: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana RBAC overview and provisioning documentation: https://grafana.com/docs/grafana/latest/administration/roles-and-permissions/access-control/
- Grafana RBAC provisioning documentation: https://grafana.com/docs/grafana/latest/administration/roles-and-permissions/access-control/rbac-grafana-provisioning/
- Grafana configuration reference for `send_user_header`: https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/
- Grafana Alloy `loki.source.file`, `loki.process`, and `loki.write` documentation: https://grafana.com/docs/alloy/latest/reference/components/loki/
- OPA REST API reference: https://www.openpolicyagent.org/docs/rest-api
- OPA policy language documentation: https://www.openpolicyagent.org/docs/policy-language
- NGINX `auth_request` module documentation: https://nginx.org/en/docs/http/ngx_http_auth_request_module.html
- NGINX logging documentation: https://docs.nginx.com/nginx/admin-guide/monitoring/logging/

## Issues Found
- The Loki prerequisite version was too old for the shown TSDB/v13 configuration. Updated the prerequisite to Loki 3.0 or later.
- Per-tenant Loki limit overrides were incorrectly shown as part of the main Loki configuration. Moved them into a separate runtime configuration file and added `runtime_config.file`.
- Multi-tenant admin queries used a pipe-separated tenant header but did not enable `querier.multi_tenant_queries_enabled`. Added the required querier setting.
- The OPA Rego policy defined `deny` but did not apply it to `allow`. Added `not deny` to the allow rules.
- The NGINX OPA example proxied directly to OPA's Data API via `auth_request`, which would not correctly translate OPA boolean decisions into 2xx/403 responses. Updated it to call an OPA-backed authorization service that returns NGINX-compatible status codes and tenant headers.
- Grafana datasource RBAC provisioning used an invalid top-level `accessControl` structure and name-based datasource scopes. Updated it to the documented `apiVersion: 2`, `roles`, `teams`, and `datasources:uid:*` form, and added datasource UIDs.
- The label-filtering proxy escaped neither regex values nor unsupported query shapes, and allowed writes for unknown tenants. Escaped label values, denied unsupported query shapes, and blocked pushes from unmapped tenants or streams missing required restricted labels.
- The audit log pipeline used Promtail, which is EOL as of March 2, 2026. Replaced it with a Grafana Alloy pipeline using `loki.source.file`, `loki.process`, and `loki.write`.
- The access-denial troubleshooting command queried Loki directly and claimed it should fail. Updated it to query through the label-filtering proxy and clarified that the expected result is no data.

## Review Notes
Python snippets were syntax-checked with `ast.parse`. Local `loki`, `opa`, and `alloy` binaries were not available in the workspace, so their snippets were validated against official documentation rather than local command-line validators.
