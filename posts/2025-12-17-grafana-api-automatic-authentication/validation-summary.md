# Validation Summary: How to Configure Automatic Authentication with Grafana API

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Grafana HTTP API
- Grafana service accounts and service account tokens
- Legacy Grafana API keys
- Basic authentication
- OAuth/OIDC login configuration
- GitHub Actions
- GitLab CI
- Terraform Grafana provider
- Python `grafana-client`
- Node.js with Axios
- AWS Secrets Manager
- `curl` and `jq`

## Sources Consulted
- Grafana HTTP API authentication documentation: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/authentication/
- Grafana service accounts documentation: https://grafana.com/docs/grafana/latest/administration/service-accounts/
- Grafana service account HTTP API documentation: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/serviceaccount/
- Grafana API key migration documentation: https://grafana.com/docs/grafana/latest/administration/service-accounts/migrate-api-keys/
- Grafana Generic OAuth documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-access/configure-authentication/generic-oauth/
- Grafana dashboard HTTP API documentation: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/dashboard/
- Grafana audit logging documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-security/audit-grafana/
- Grafana Terraform provider documentation: https://registry.terraform.io/providers/grafana/grafana/latest/docs
- `grafana-client` README: https://github.com/grafana-toolbox/grafana-client

## Issues Found
- The post described OAuth/OIDC access tokens as direct Grafana API bearer credentials. Grafana's documented HTTP API authentication options are service account tokens and, for on-prem Grafana, basic authentication. I changed the OAuth section to describe OAuth/OIDC as user login configuration and to use service account tokens for API automation.
- The post claimed API keys were automatically migrated to service accounts as of Grafana 12.3 in early 2025. Official docs say API keys are deprecated and can be migrated to service accounts, but do not support that version/timeline claim. I removed the unsupported version-specific statement.
- The service account and API key UI navigation paths were outdated. I updated them to the current Administration > Users and access paths.
- The dashboard deployment examples posted bare dashboard JSON to `/api/dashboards/db`. The legacy dashboard API expects a wrapper object containing `dashboard`, so I changed the `curl` examples to build the required payload with `jq`.
- The Terraform provider example pinned `~> 2.0`, which is outdated for current use. I updated it to `~> 4.0`.
- The Python `grafana-client` example used an incorrect header tuple for bearer authentication. I changed it to use the documented `TokenAuth` helper.
- The audit logging snippet used general security and auth session settings rather than Grafana audit logging settings. I replaced it with the documented `[auditing]` configuration for self-managed Grafana Enterprise.

## Review Notes
Grafana 13 deprecates legacy `/api` routes in favor of `/apis`, but the legacy routes used in several examples remain accessible and operative according to Grafana documentation. Some service account APIs are still documented under the legacy HTTP API.
