# Validation Summary: How to Use MongoDB Atlas Online Archive for Cold Data

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas
- MongoDB Atlas Online Archive
- MongoDB Atlas Data Federation
- MongoDB Atlas Admin API (v2)
- MongoDB Node.js Driver
- Cloud Object Storage (S3)

## Sources Consulted
- MongoDB Atlas Online Archive Documentation: https://www.mongodb.com/docs/atlas/online-archive/configure-online-archive/
- Atlas Admin API v2 - Online Archive: https://www.mongodb.com/docs/api/doc/atlas-admin-api-v2/operation/operation-creategroupclusteronlinearchive
- Atlas Admin API v1 (Deprecated) Documentation: https://www.mongodb.com/docs/api/doc/atlas-admin-api-v1/
- Migrate to Versioned Atlas Administration API: https://www.mongodb.com/docs/atlas/api/migrate-to-new-version/
- Connect to Your Online Archive: https://www.mongodb.com/docs/atlas/online-archive/connect-to-online-archive/
- Restore Specific Documents from Online Archive: https://www.mongodb.com/docs/atlas/online-archive/restore-archived-data-with-merge/
- $out Stage (Atlas Data Federation): https://www.mongodb.com/docs/atlas/data-federation/supported-unsupported/pipeline/out/
- $merge Stage (Atlas Data Federation): https://www.mongodb.com/docs/atlas/data-federation/supported-unsupported/pipeline/merge/
- Online Archive Costs: https://www.mongodb.com/docs/atlas/billing/online-archive/
- Optimize Query Performance (Data Federation): https://www.mongodb.com/docs/atlas/data-federation/admin/optimize-query-performance/

## Issues Found

1. **Deprecated API version (v1.0 -> v2)**: All Atlas Admin API endpoint references used `/api/atlas/v1.0/` which is deprecated. Updated to `/api/atlas/v2/` in Steps 5 and 6. The Atlas Admin API v1 is explicitly deprecated and MongoDB recommends migrating to v2.

2. **Fabricated `$arch.status` field**: Step 4 referenced filtering on `$arch.status` described as "the internal archive flag." This field does not exist in any official MongoDB documentation. Replaced with the correct approach: connecting to the archive-only federated database instance, which Atlas creates as a separate connection string alongside the combined cluster + archive endpoint.

3. **`$out` replaced with `$merge` for data restoration**: Step 7 used `$out` to restore archived data back to the cluster. MongoDB's official documentation specifically recommends `$merge` for this use case (documented at `/docs/atlas/online-archive/restore-archived-data-with-merge/`). Updated to use `$merge` with proper `into.atlas` syntax including `clusterName`, `whenMatched`, and `whenNotMatched` options. Also added prerequisite notes: pause the archive and use the archive-only connection string before restoring.

4. **Incorrect cost model terminology**: The cost model listed "Data scanned" and "Compute for the federated query engine" as billing dimensions. Official billing documentation uses "Data processed" ($5/TB, 10 MB minimum per query) and "Data returned/transferred" — there is no separate "compute" line item. Updated to match official pricing terms.

## Review Notes
- The archival rule JSON in Step 2 omits the `fieldType` property from partition field objects (valid values: `date`, `int`, `long`, `objectId`, `string`, `uuid`). While it may be auto-inferred, including it would be more complete. Left as-is since the API may accept the request without it.
- The post correctly notes that Atlas auto-creates a federated database instance but does not mention it creates two (one for archive-only, one for cluster + archive). The fix in Step 4 addresses this partially.
- Partition fields cannot be modified after creation — this limitation is not mentioned in the post but would be a useful addition for a future update.
