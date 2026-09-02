# Validation Summary: Grant Least-Privilege OpenSearch Dashboards Access

## Status
validated

## Post Type
Technical guide / security configuration tutorial

## Technologies Covered
- OpenSearch
- OpenSearch Dashboards and Discover
- OpenSearch Security plugin
- Role-based access control and backend-role mappings
- OpenSearch Dashboards multi-tenancy and saved objects
- Document-level security (DLS)
- Field-level security (FLS)
- OpenSearch REST APIs, YAML configuration, and NDJSON multi-search requests

## Sources Consulted
- OpenSearch users, roles, mappings, read-only roles, and predefined roles: https://docs.opensearch.org/latest/security/access-control/users-roles/
- OpenSearch Security permissions and permission-testing guidance: https://docs.opensearch.org/latest/security/access-control/permissions/
- OpenSearch default action groups: https://docs.opensearch.org/latest/security/access-control/default-action-groups/
- OpenSearch Security YAML configuration files: https://docs.opensearch.org/latest/security/configuration/yaml/
- Applying Security configuration with `securityadmin.sh`: https://docs.opensearch.org/latest/security/configuration/security-admin/
- OpenSearch Security REST APIs for roles and role mappings: https://docs.opensearch.org/latest/security/access-control/api/
- Authentication Information API: https://docs.opensearch.org/latest/api-reference/security/authentication/auth-info/
- OpenSearch Dashboards multi-tenancy overview: https://docs.opensearch.org/latest/security/multi-tenancy/tenant-index/
- OpenSearch Dashboards multi-tenancy configuration, tenant creation, and tenant permissions: https://docs.opensearch.org/latest/security/multi-tenancy/multi-tenancy-config/
- OpenSearch index-pattern prerequisites and creation: https://docs.opensearch.org/latest/dashboards/management/index-patterns/
- OpenSearch Dashboards Discover behavior and time-range filtering: https://docs.opensearch.org/latest/dashboards/discover/index-discover/
- OpenSearch Dashboards Workspaces and their interaction with Security multi-tenancy: https://docs.opensearch.org/latest/dashboards/workspace/workspace/
- Resolve Index API: https://docs.opensearch.org/latest/api-reference/index-apis/resolve-index/
- Field Capabilities API: https://docs.opensearch.org/latest/api-reference/search-apis/field-caps/
- Search API: https://docs.opensearch.org/latest/api-reference/search-apis/search/
- Multi-Search API and NDJSON request format: https://docs.opensearch.org/latest/api-reference/search-apis/multi-search/
- OpenSearch field-level security and its interactions with DLS and multiple roles: https://docs.opensearch.org/latest/security/access-control/field-level-security/
- OpenSearch document-level security and multiple-role behavior: https://docs.opensearch.org/latest/security/access-control/document-level-security/
- OpenSearch system-index protection and scrubbed read results: https://docs.opensearch.org/latest/security/configuration/system-indices/
- OpenSearch Security audit logs and `MISSING_PRIVILEGES` events: https://docs.opensearch.org/latest/security/audit-logs/index/
- Current built-in `kibana_user` role definition: https://github.com/opensearch-project/security/blob/7b468dc7385ad8a6fda323e30145ab8f5519566f/src/main/resources/static_config/static_roles.yml
- Current tenant-privilege implementation for implicit Global access: https://github.com/opensearch-project/security/blob/7b468dc7385ad8a6fda323e30145ab8f5519566f/src/main/java/org/opensearch/security/privileges/TenantPrivileges.java
- OpenSearch Security issue documenting the legacy `kibana_user` Global-tenant behavior: https://github.com/opensearch-project/security/issues/5356

## Issues Found
- The post implied that the displayed role needed an additional predefined `kibana_user` role for sign-in. The displayed combination of `cluster_composite_ops_ro`, narrow index `read`, and `kibana_all_read` is already OpenSearch's documented equivalent custom read-only Dashboards role. I changed the text to warn against stacking `kibana_user` merely for sign-in because that predefined role grants broader permissions and can implicitly grant read/write access to the Global tenant under the legacy privilege evaluator.
- The workflow granted permissions for an `operations` custom tenant without first saying that the tenant must exist. I added the required tenant-creation step using Dashboards, the Security REST API, or `tenants.yml`.
- The post stated that `kibana_all_write` alone was sufficient for a curator to create an index pattern. Official prerequisites also require Dashboards access and read access to the matched indexes, so I added those requirements.
- The tenant tests treated all unrelated tenants as inaccessible and all saved-object writes as denied. Private tenants are enabled and writable by their owners by default, while Global is enabled by default and can become read/write through `kibana_user`. I documented those defaults and scoped the negative write test to the read-only `operations` tenant.
- The opening implied that missing index permission normally produces empty panels. OpenSearch normally reports an authorization error; empty panels can result when forbidden-index filtering is configured. I corrected that distinction and added forbidden-index filtering to the zero-hit diagnostic.

## Review Notes
- The role and role-mapping YAML fragments are valid. A Security REST API request uses JSON with the resource name in the URL, while `securityadmin.sh` consumes complete configuration files that normally include `_meta`; the post correctly describes the snippets as configuration rather than literal REST request bodies.
- All shown API paths and request bodies are current and valid. Raw `_msearch` clients must send `Content-Type: application/x-ndjson` and terminate the body with a newline; the displayed two-line body has the correct NDJSON structure, and Dashboards Dev Tools handles the transport details.
- FLS wildcard exclusions for keyword subfields and the requirement that DLS-query fields remain visible under FLS are correct. Multiple-role behavior is configuration-sensitive: FLS restrictions are combined with `AND`, while DLS queries are combined with `OR`, subject to the `plugins.security.dfm_empty_overrides_all` setting.
- The implicit Global-tenant grant is legacy behavior that the OpenSearch project has proposed removing in a future major release. Recheck this caveat when updating the post for a later Security plugin version.
- The guide targets Security-plugin tenants and a local/default data source. OpenSearch Workspaces are an alternative saved-object isolation model and require Security multi-tenancy to be disabled; remote data sources can require additional data-source permissions.
- Security audit logging must be enabled and configured before denied actions appear in audit output.
