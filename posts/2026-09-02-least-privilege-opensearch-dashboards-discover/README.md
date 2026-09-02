# How to Grant Least-Privilege Access to OpenSearch Dashboards Without Hiding Discover Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenSearch, Security, Observability, Logging

Description: Combine OpenSearch Dashboards access, tenant permissions, and narrow read permissions so operators can use Discover without receiving write or unrelated-data access.

---

OpenSearch Dashboards authorization has two independent questions:

1. May the user enter Dashboards and read saved objects in this tenant?
2. May the user search the indexes referenced by the index pattern?

Granting only one produces confusing failures: the user can open a dashboard but sees authorization errors (or empty panels when `do_not_fail_on_forbidden` filtering is configured), or can query an index through the API but cannot open its index pattern. Least privilege means satisfying both layers without assigning the server identity or broad `all_access` role.

## Define the data boundary first

Choose a stable, narrow index expression. For a production operations team, that might be `logs-prod-*`, not `logs-*` and never `*`.

Test the target as an administrator:

```http
GET _resolve/index/logs-prod-*
POST logs-prod-*/_field_caps?fields=@timestamp,message,service.name,log.level
```

The user needs to see the time field and any fields used by saved searches, dashboard filters, document-level security (DLS), and visualizations.

## Create a read-only role

A Security plugin role can combine index and tenant permissions:

```yaml
prod_logs_reader:
  cluster_permissions:
    - cluster_composite_ops_ro
  index_permissions:
    - index_patterns:
        - "logs-prod-*"
      allowed_actions:
        - read
  tenant_permissions:
    - tenant_patterns:
        - "operations"
      allowed_actions:
        - kibana_all_read
```

Names containing `kibana` remain in the Security plugin for compatibility even though the UI is OpenSearch Dashboards. Apply configuration using the Security REST API or `securityadmin.sh` procedure appropriate to your deployment; do not edit the Security system index directly.

Map the role to an external backend role rather than maintaining individual users where possible:

```yaml
prod_logs_reader:
  reserved: false
  backend_roles:
    - "oncall-prod"
  hosts: []
  users: []
```

The role above is the equivalent custom read-only Dashboards role for this workflow; do not additionally assign the predefined `kibana_user` role merely for sign-in because its effective permissions are broader. Never assign `kibana_server` to a human; it is the service role used by the Dashboards server for its internal saved-object operations.

## Create objects in the same tenant

Create the `operations` custom tenant first using OpenSearch Dashboards, the Security REST API, or `tenants.yml`. An administrator or curator with Dashboards access, read access to `logs-prod-*`, and `kibana_all_write` for `operations` can create the index pattern there and choose the actual date field, normally `@timestamp`. Readers with `kibana_all_read` can use the object but cannot create or modify it.

Private, global, and custom tenants are separate saved-object spaces. Verify that the index pattern and dashboard are in `operations`, not in the curator's private tenant.

With the default multi-tenancy settings, each Dashboards user also has a writable Private tenant, and the Global tenant is enabled. The predefined `kibana_user` role can also grant implicit read/write access to Global when the legacy privilege evaluator is in use and no role explicitly grants Global access. If `operations` must be the only saved-object space, disable the built-in tenants as appropriate and verify the user's effective tenant memberships.

## Add DLS or FLS only when required

Document-level security is appropriate when one physical index contains multiple authorized populations. Field-level security is appropriate for sensitive fields. Both are filters, not substitutes for choosing a narrow index pattern.

If you use FLS, keep every field required by Discover and the dashboards. For example, exposing only `message` while hiding `@timestamp` and `service.name` can make the time picker and visualizations appear broken. When excluding a text field, remember that wildcard exclusions may be required to cover its keyword subfield too.

If you use DLS, all fields referenced by the DLS query must remain visible under FLS. OpenSearch combines security restrictions, and multiple mapped roles can have interactions that are broader or narrower than a single-role test suggests.

## Test as the real role

The OpenSearch documentation recommends representative requests with a new test user when deriving minimum permissions. Test all of these:

```http
GET _plugins/_security/authinfo

GET logs-prod-*/_search
{
  "size": 1,
  "sort": [{"@timestamp": "desc"}]
}

POST logs-prod-*/_msearch
{}
{"size":0,"query":{"range":{"@timestamp":{"gte":"now-15m"}}}}
```

Then sign in to Dashboards as that user and verify:

- the `operations` tenant is available read-only;
- the intended index pattern appears;
- Discover returns a known document in a wide enough time range;
- saved searches and dashboards render;
- unrelated index names and custom tenants are inaccessible, and any enabled Global or Private access matches policy;
- creating or editing a saved object in `operations` is denied.

Dashboards uses composite operations such as `_msearch`, field capabilities, alias resolution, and saved-object reads. An API test limited to one `_search` call is not representative.

## Diagnose empty Discover results

If the pattern is visible but no rows appear, compare the same query as admin and reader:

- `403` suggests a missing index or cluster action.
- `200` with zero hits can be DLS, the time range, `do_not_fail_on_forbidden` filtering, or system-index protection.
- Missing fields suggest FLS or a mapping conflict.
- A pattern visible only after switching tenant indicates saved-object scope, not index permission.

Use Security audit logs during a controlled test to identify the denied underlying action. Add only the action needed for the verified workflow, then repeat the negative tests for unrelated data.

## Official References

- [OpenSearch users and roles](https://docs.opensearch.org/latest/security/access-control/users-roles/)
- [OpenSearch Security permissions](https://docs.opensearch.org/latest/security/access-control/permissions/)
- [OpenSearch default action groups](https://docs.opensearch.org/latest/security/access-control/default-action-groups/)
- [OpenSearch field-level security](https://docs.opensearch.org/latest/security/access-control/field-level-security/)
- [OpenSearch Dashboards multi-tenancy](https://docs.opensearch.org/latest/security/multi-tenancy/tenant-index/)
- [OpenSearch Dashboards multi-tenancy configuration](https://docs.opensearch.org/latest/security/multi-tenancy/multi-tenancy-config/)
- [OpenSearch index-pattern permissions](https://docs.opensearch.org/latest/dashboards/management/index-patterns/)
- [OpenSearch Security `kibana_user` Global tenant behavior](https://github.com/opensearch-project/security/issues/5356)
