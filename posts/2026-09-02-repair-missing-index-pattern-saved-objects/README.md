# Why Does an OpenSearch Dashboard Show “Could Not Locate That Index Pattern”? Repairing Saved Objects Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenSearch, Troubleshooting, Index Management, Observability

Description: Repair a dashboard whose saved visualizations reference a deleted or inaccessible index-pattern object without editing OpenSearch Dashboards system indexes directly.

---

“Could not locate that index pattern” usually describes a missing **saved object**, not a missing OpenSearch index. A visualization stores a reference to an index-pattern object by saved-object ID. Recreating the same wildcard with a new object generates a different ID, so the old visualization can remain broken.

Permissions and scope can produce the same symptom. Index patterns, visualizations, and dashboards live in a tenant or workspace context; an object visible in one context may not exist in another.

## Diagnose the data and object layers separately

First prove the data target exists:

```http
GET _resolve/index/logs-prod-*

POST logs-prod-*/_field_caps?fields=@timestamp,message,service.name
```

If that fails, repair the alias, stream, or indexes before touching saved objects. If it succeeds, check the Dashboards layer:

1. Confirm the active tenant or workspace.
2. Open **Dashboards Management > Index patterns** and look for the expected pattern.
3. Open **Saved objects** and locate the dashboard and its visualizations.
4. Confirm the user's role has read access to the data plus access to the tenant/workspace objects.

The index pattern may exist under the same title in a different tenant. Copying only the dashboard between tenants does not necessarily copy every reference.

## Back up before repairing

Use **Dashboards Management > Saved objects** to export the affected dashboard and related objects as NDJSON. Export from the tenant/workspace in which the error occurs. Also take the normal snapshot or backup required by your change process.

Do not update `.opensearch_dashboards*` documents with the Index or Update Document APIs. OpenSearch explicitly treats system indexes as component-owned state; direct edits can corrupt saved-object migrations and become incompatible across Dashboards versions.

## Choose the least destructive repair

### Case 1: The pattern exists in the wrong scope

Switch to the correct tenant/workspace or use the supported saved-object/workspace copy workflow with references included. Then retest as the affected user. This preserves object IDs and is safer than recreating objects manually.

### Case 2: The pattern was deleted, but an export contains it

Import the known-good NDJSON into a test tenant/workspace first. Use the import conflict controls to avoid overwriting unrelated objects. The export is most useful when it includes the original index-pattern object and its ID alongside dependent visualizations.

Validate the imported index pattern's wildcard and time field against the target cluster. An import can restore the reference graph while still pointing at the wrong data.

### Case 3: No copy of the original object remains

Create a new index pattern in **Dashboards Management > Index patterns** using the correct expression and timestamp. Then reopen each affected saved search or visualization, select the new pattern, verify its fields, and save it as a new or reviewed object. Finally replace the dashboard panels.

This takes longer but stays within supported APIs and makes schema incompatibilities visible. Merely creating a new pattern with the same display text is insufficient when dependencies still reference the deleted ID.

For a large object set, export to NDJSON and inspect it under version control. Any automated reference rewrite should operate on a disposable copy, change only understood `index-pattern` references, and be imported into a test scope before production. Saved-object schemas and migrations are version-sensitive; do not treat an NDJSON file as a stable hand-authored API contract.

## Validate the repaired graph

Check more than whether the error banner disappears:

- dashboard opens in the intended tenant/workspace;
- every panel renders for the target time range;
- filters apply to panels with compatible fields;
- the pattern resolves only intended indexes, aliases, or streams;
- the selected time field is a `date` everywhere;
- a read-only user can open the dashboard and Discover;
- the exported backup can be reimported into a clean test scope.

If fields are missing after the pattern is restored, query `_field_caps`. A rollover may have introduced a type conflict, or the pattern may point at a data stream's backing index rather than the stable stream name.

## Prevent recurrence

- Move saved objects with related references, not as isolated dashboard records.
- Export reviewed saved-object bundles before upgrades or tenant/workspace migrations.
- Point patterns at stable aliases or data stream names.
- Restrict index-pattern deletion to maintainers with tenant write access.
- Test imports on the destination Dashboards version before a production migration.

## Official References

- [OpenSearch Dashboards management](https://docs.opensearch.org/latest/dashboards/management/management-index/)
- [OpenSearch index patterns](https://docs.opensearch.org/latest/dashboards/management/index-patterns/)
- [OpenSearch workspace APIs](https://docs.opensearch.org/latest/dashboards/workspace/apis/)
- [OpenSearch Dashboards multi-tenancy](https://docs.opensearch.org/latest/security/multi-tenancy/tenant-index/)
- [OpenSearch system indexes](https://docs.opensearch.org/latest/security/configuration/system-indices/)
