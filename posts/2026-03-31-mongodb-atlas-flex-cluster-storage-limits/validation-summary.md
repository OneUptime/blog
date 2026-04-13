# Validation Summary: How to Configure Storage Limits for Atlas Flex Clusters

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB Atlas Flex Clusters
- MongoDB Atlas Admin API v2
- MongoDB shell commands (`dbStats`, `collStats`, `compact`, `$indexStats`)
- MongoDB Node.js driver
- Atlas billing alerts API

## Sources Consulted
- Atlas Flex Cluster Limitations: https://www.mongodb.com/docs/atlas/reference/flex-limitations/
- Atlas Service Limits: https://www.mongodb.com/docs/atlas/reference/atlas-limits/
- Flex Clusters API (Atlas Admin API v2): https://www.mongodb.com/docs/api/doc/atlas-admin-api-v2/group/endpoint-flex-clusters/
- collStats command reference: https://www.mongodb.com/docs/manual/reference/command/collstats/
- dbStats command reference: https://www.mongodb.com/docs/manual/reference/command/dbstats/
- $indexStats aggregation stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexstats/
- compact command reference: https://www.mongodb.com/docs/manual/reference/command/compact/
- Atlas Online Archive overview: https://www.mongodb.com/docs/atlas/online-archive/overview/
- Atlas cluster sizing and tier selection: https://www.mongodb.com/docs/atlas/sizing-tier-selection/

## Issues Found

1. **Incorrect Flex cluster storage limit (line 133)**: The post claimed to upgrade when "Storage exceeds 5 GB." Flex clusters actually support up to 120 GB of storage. Changed to "Storage is approaching the Flex tier limit of 120 GB."

2. **Atlas Online Archive not available on Flex clusters (line 103)**: The post suggested using "Atlas Online Archive" as an archiving option, but Online Archive is only available for dedicated M10+ clusters. Added a clarifying note that Online Archive is not available for Flex clusters.

3. **Deprecated `force` option on `compact` command (line 125)**: The post used `compact` with `force: true`, which was deprecated in MongoDB 6.0. Since Flex clusters run MongoDB 7.0+, removed the deprecated `force` option.

4. **Summary repeated inaccurate 5 GB claim (line 142)**: Updated the summary to say "approaches the Flex tier limit" instead of "consistently exceeds 5 GB."

## Review Notes
- The `collStats` database command used in the per-collection breakdown is deprecated as of MongoDB 6.2 in favor of the `$collStats` aggregation stage. The command still works, but future versions of MongoDB may remove it. A future update could migrate to the aggregation equivalent.
- The `compact` command may not be available on Flex clusters due to restricted administrative privileges on shared infrastructure. Users should verify they have the required `compact` privilege before attempting this operation.
- The Atlas API `jq` filter references `.storageSize` and `.stateName` from the Flex cluster API response. The exact response schema for Flex cluster endpoints should be verified against the latest API documentation, as field names may differ from dedicated cluster responses.
- The billing alerts API endpoint and event type name (`CREDIT_CARD_CURRENT_MONTH_USAGE_THRESHOLD_EXCEEDED`) could not be definitively verified against current Atlas API documentation. The structure appears plausible but should be confirmed.
