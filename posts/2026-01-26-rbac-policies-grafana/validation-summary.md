# Validation Summary: How to Configure RBAC Policies in Grafana

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana organization roles
- Grafana folder and dashboard permissions
- Grafana Teams and Team Sync
- Grafana Enterprise / Cloud RBAC
- Grafana HTTP APIs
- Grafana service accounts
- Grafana data source permissions
- Grafana RBAC provisioning
- Grafana audit logging

## Sources Consulted
- Grafana Roles and permissions: https://grafana.com/docs/grafana/latest/administration/roles-and-permissions/
- Grafana RBAC permission actions and scopes: https://grafana.com/docs/grafana/latest/administration/roles-and-permissions/access-control/custom-role-actions-scopes/
- Grafana RBAC HTTP API: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/access_control/
- Grafana Team HTTP API: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/team/
- Grafana Service account HTTP API: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/serviceaccount/
- Grafana service accounts: https://grafana.com/docs/grafana/latest/administration/service-accounts/
- Grafana data source management and data source permissions: https://grafana.com/docs/grafana/latest/administration/data-source-management/
- Grafana Team Sync: https://grafana.com/docs/grafana/latest/setup-grafana/configure-access/configure-team-sync/
- Grafana LDAP authentication: https://grafana.com/docs/grafana/latest/setup-grafana/configure-access/configure-authentication/ldap/
- Grafana RBAC provisioning: https://grafana.com/docs/grafana/latest/administration/roles-and-permissions/access-control/rbac-grafana-provisioning/
- Grafana audit logging: https://grafana.com/docs/grafana/latest/setup-grafana/configure-security/audit-grafana/

## Issues Found
- The Admin role section said organization Admins can install plugins. Updated this to "Configure application plugins" because Grafana distinguishes organization plugin configuration from server-admin plugin installation/update permissions.
- The LDAP team sync example used `grafana_team_ids` inside `ldap.toml`, which is not part of the current LDAP group mapping example. Updated the text to map LDAP groups to organization roles in `ldap.toml` and use Grafana Team Sync's External group sync tab for Grafana team membership.
- The custom-role API example created a role without a stable `uid` but then assigned a role by name as `roleUid`. Added an explicit role `uid` and used a custom-prefixed role name so the assignment payload can work.
- The query-level restrictions snippet used a non-Grafana `secureJsonData.allowedQueries` field. Replaced it with accurate guidance that Grafana data source permissions do not enforce arbitrary PromQL regex patterns and that query restrictions should use data-source-native authorization, a proxy, or supported LBAC.
- The service-account custom-role assignment endpoint used `/api/access-control/serviceaccounts/1/roles`, which is not the documented endpoint. Changed it to `/api/access-control/users/1/roles`, the documented service account RBAC assignment endpoint.
- The RBAC provisioning examples used `apiVersion: 1` and a `roleAssignments` structure that does not match current Grafana RBAC provisioning. Updated them to `apiVersion: 2` and the documented `teams[].roles[]` assignment structure with role UIDs.
- The audit logging config used non-existent `log_dashboard_access` and `log_query_access` options. Replaced them with documented `[auditing]` options: `loggers = file` and `log_datasource_query_request_body = true`.

## Review Notes
- Grafana 13 documentation marks legacy `/api` endpoints as deprecated in favor of `/apis`, but states that legacy APIs remain accessible and operative. The post's `/api` examples remain valid as legacy API examples.
- Some examples remain illustrative YAML rather than full Grafana provisioning or API payloads; this is acceptable for the article's explanatory style.
