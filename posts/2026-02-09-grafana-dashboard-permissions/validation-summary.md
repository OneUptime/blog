# Validation Summary: How to configure Grafana dashboard permissions and sharing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana dashboard and folder permissions
- Grafana HTTP API
- Grafana teams and organization roles
- Grafana public/shared dashboards and snapshots
- Grafana data source permissions
- Terraform Grafana provider
- LDAP authentication mappings
- Anonymous access
- Grafana Enterprise / Cloud audit logging
- Grafana dashboard variables and LBAC

## Sources Consulted
- Grafana Folder Permissions HTTP API: https://grafana.com/docs/grafana/latest/developers/http_api/folder_permissions/
- Grafana Dashboard Permissions HTTP API: https://grafana.com/docs/grafana/latest/developers/http_api/dashboard_permissions/
- Grafana Folder HTTP API: https://grafana.com/docs/grafana/latest/developers/http_api/folder/
- Grafana Team HTTP API: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/team/
- Grafana Shared Dashboards HTTP API: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/dashboard_public/
- Grafana Snapshot API: https://grafana.com/docs/grafana/latest/developers/http_api/snapshot/
- Grafana Data source permissions HTTP API: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/datasource_permissions/
- Grafana data source management permissions: https://grafana.com/docs/grafana/latest/administration/data-source-management/
- Grafana Organization HTTP API: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/org/
- Terraform Grafana provider folder permission resource: https://registry.terraform.io/providers/grafana/grafana/latest/docs/resources/folder_permission
- Terraform Grafana provider dashboard resource: https://registry.terraform.io/providers/grafana/grafana/latest/docs/resources/dashboard
- Grafana LDAP authentication: https://grafana.com/docs/grafana/latest/setup-grafana/configure-access/configure-authentication/ldap/
- Grafana anonymous authentication: https://grafana.com/docs/grafana/latest/setup-grafana/configure-security/configure-authentication/anonymous-auth/
- Grafana audit logging: https://grafana.com/docs/grafana/latest/setup-grafana/configure-security/audit-grafana/
- Grafana dashboard variables: https://grafana.com/docs/grafana/latest/visualizations/dashboards/variables/add-template-variables/
- Grafana LBAC for data sources: https://grafana.com/docs/grafana/latest/administration/data-source-management/teamlbac/

## Issues Found
- The folder permissions example created a folder without setting the UID but then used `production-dashboards` as the UID in the permissions endpoint. Added `"uid": "production-dashboards"` to make the endpoint match the created folder.
- The public dashboards configuration included `allow_embedding`, which is for iframe embedding and is not required to create an externally shared dashboard link. Removed it and changed the code fence to `ini`.
- The snapshot API payload used `[...]`, which is not valid JSON. Replaced it with an empty `panels` array.
- The data source permissions example used an incorrect/obsolete endpoint and payload shape. Replaced it with the documented `/api/access-control/datasources/:uid/teams/:id` endpoint and `{"permission": "Query"}` payload, and clarified that data source permissions are Grafana Enterprise / Cloud.
- The audit log example used an undocumented `/api/access-control/audit` endpoint. Replaced it with the documented `[auditing]` configuration for file-based audit logs and noted the Enterprise / Cloud availability.
- The row-level permissions section implied dashboard variables enforce authorization and used a non-existent `${__user.tenant}` variable. Reworded the section to state that variables are not an authorization boundary, used documented `${__user.id}` syntax, and pointed to data-source enforcement or LBAC for actual restrictions.

## Review Notes
Grafana's current documentation notes that legacy `/api` endpoints will be deprecated starting in Grafana 13 in favor of `/apis`, but the legacy endpoints used in the post remain documented and operational at the time of review.
