# Validation Summary: How to Assign Dashboard Permissions in Grafana Helm Values

## Status
validated

## Post Type
Technical tutorial / configuration guide

## Technologies Covered
- Grafana
- Grafana Helm chart
- Kubernetes ConfigMaps and containers
- Grafana dashboard provisioning
- Grafana folder permissions
- Grafana Enterprise RBAC provisioning
- Generic OAuth role mapping
- Grafana HTTP API

## Sources Consulted
- Grafana provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana RBAC overview: https://grafana.com/docs/grafana/latest/administration/roles-and-permissions/access-control/
- Grafana RBAC file provisioning: https://grafana.com/docs/grafana/latest/administration/roles-and-permissions/access-control/rbac-grafana-provisioning/
- Grafana RBAC actions and scopes: https://grafana.com/docs/grafana/latest/administration/roles-and-permissions/access-control/custom-role-actions-scopes/
- Grafana RBAC configuration options: https://grafana.com/docs/grafana/latest/administration/roles-and-permissions/access-control/configure-rbac/
- Grafana folder permissions HTTP API: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/folder_permissions/
- Grafana service accounts documentation: https://grafana.com/docs/grafana/latest/administration/service-accounts/
- Grafana service account HTTP API: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/serviceaccount/
- Grafana Generic OAuth documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-access/configure-authentication/generic-oauth/
- Grafana Helm chart values: https://raw.githubusercontent.com/grafana/helm-charts/main/charts/grafana/values.yaml

## Issues Found
- The Helm example used `rbac.enabled: true`, which is not the Grafana Helm chart key. Changed it to `rbac.create: true` and clarified that this controls Kubernetes RBAC resources, not Grafana RBAC.
- The folder provisioning section claimed dashboard provider provisioning could define folder permissions. Updated the text to state that dashboard providers create folders, while permissions must be handled through RBAC provisioning or the folder permissions API.
- The team-based access section claimed teams could be provisioned and used an invalid RBAC provisioning schema. Updated it to assign custom RBAC roles to existing teams using Grafana's `apiVersion: 2` RBAC provisioning format with role UIDs and a `teams` grant block.
- The OAuth example claimed OAuth settings sync Grafana teams. Removed that claim and kept it scoped to organization role mapping with `role_attribute_path`.
- The dashboard JSON example included `meta.folderUid`, `canAdmin`, `canEdit`, and `canSave` as if they provision permissions. Removed the `meta` block and clarified that dashboard JSON does not define permissions.
- The RBAC provisioning example used `apiVersion: 1`, `roleGrants`, and role-name strings where Grafana's file provisioning expects `apiVersion: 2`, role UIDs, and user/team/service-account assignment blocks. Replaced the grant structure with valid `teams` assignments.
- The API initialization example used a Kubernetes init container to wait for Grafana on `localhost:3000`. Init containers run before the Grafana container, so this would hang. Changed it to a sidecar container using the chart's `extraContainers` value.
- The service account section showed a non-existent file provisioning format for service accounts. Replaced it with documented HTTP API calls to create a service account and token.

## Review Notes
Grafana RBAC provisioning is an Enterprise self-managed feature. Grafana OSS supports basic organization roles and folder/dashboard permissions, but custom RBAC roles and file-based RBAC provisioning require Grafana Enterprise for self-managed deployments.
