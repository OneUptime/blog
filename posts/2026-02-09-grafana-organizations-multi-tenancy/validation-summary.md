# Validation Summary: How to configure Grafana organizations for multi-tenancy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana organizations
- Grafana legacy HTTP API
- Grafana provisioning
- Grafana Generic OAuth
- Grafana Terraform provider
- Prometheus, Cortex, and Grafana Mimir tenant headers
- Bash, curl, YAML, HCL, and INI configuration

## Sources Consulted
- Grafana Organization HTTP API: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/org/
- Grafana HTTP API authentication and X-Grafana-Org-Id header: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/
- Grafana API tutorial for creating organization-scoped service account tokens: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/examples/create-api-tokens-for-org/
- Grafana User and Org Preferences API: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/preferences/
- Grafana provisioning documentation for data sources and custom HTTP headers: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana Generic OAuth authentication documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-access/configure-authentication/generic-oauth/
- Terraform Registry documentation for grafana_organization: https://registry.terraform.io/providers/grafana/grafana/latest/docs/resources/organization
- Grafana Mimir authentication and authorization documentation: https://grafana.com/docs/mimir/latest/manage/secure/authentication-and-authorization/

## Issues Found
- The post used `homeDashboardId` in the organization preferences API example. Grafana documents this field as deprecated and recommends `homeDashboardUID`, so the example was updated to use `homeDashboardUID`.
- The organization preferences example did not specify an organization context. Added the `X-Grafana-Org-Id` header so the example clearly updates the intended organization.
- The Terraform example pinned the Grafana provider to the old `~> 1.40` series and used `grafana_organization_user`, while the current provider documentation manages organization membership through the `grafana_organization` resource membership fields. Updated the provider constraint and changed the example to use `editors` on `grafana_organization`, plus `org_id` for organization-scoped data source configuration.
- The OAuth example implied that `allowed_organizations` assigns users to Grafana organizations. Grafana documents `org_attribute_path` and `org_mapping` as the settings for organization role mapping, so the snippet and explanation were corrected.
- The organization creation text overstated automatic admin membership for the creating user. It was clarified to align with Grafana's documented behavior around the default admin user and organization context switching.

## Review Notes
Grafana's `/api` HTTP endpoints are legacy endpoints and Grafana 13 starts deprecating them in favor of `/apis`, but the official docs state the legacy endpoints remain functional and some organization-related APIs do not yet have direct replacements. The post's use of legacy APIs is acceptable with that caveat.
