# Validation Summary: How to Use Atlas Online Archive to Reduce Storage Costs

## Status
validated

## Post Type
Tutorial / Cost Optimization Guide

## Technologies Covered
- MongoDB Atlas
- Atlas Online Archive
- Atlas Admin API (REST)
- MongoDB Shell (mongosh)

## Sources Consulted
- MongoDB Atlas Admin API v2 documentation: https://www.mongodb.com/docs/api/doc/atlas-admin-api-v2/
- Create One Online Archive API reference: https://www.mongodb.com/docs/api/doc/atlas-admin-api-v2/operation/operation-creategroupclusteronlinearchive
- Atlas Admin API v1 deprecation notice: https://www.mongodb.com/docs/api/doc/atlas-admin-api-v1/
- Migrate to the New Versioned Atlas Administration API: https://www.mongodb.com/docs/atlas/api/migrate-to-new-version/
- Pause and Resume Archiving: https://www.mongodb.com/docs/atlas/online-archive/pause-resume-online-archive/
- Connect to Your Online Archive: https://www.mongodb.com/docs/atlas/online-archive/connect-to-online-archive/
- Manage Online Archives: https://www.mongodb.com/docs/atlas/online-archive/manage-online-archive/

## Issues Found

1. **Atlas Admin API version deprecated (all three curl commands)**: All API calls used the deprecated `/api/atlas/v1.0/` endpoint. Updated to `/api/atlas/v2/` which is the current supported version. MongoDB has deprecated v1.0 and recommends migrating to v2.

2. **PATCH request missing authentication and headers**: The curl command to pause archiving was missing `--digest -u "{publicKey}:{privateKey}"` and `-H "Content-Type: application/json"`, while the POST and GET examples correctly included them. Without authentication, the API call would fail with a 401 error. Added the missing flags for consistency and correctness.

## Review Notes
- The archive states listed (`PENDING`, `ACTIVE`, `PAUSED`, `DELETED`) are a simplified subset. The actual API may return additional states such as `Archiving`, `Idle`, `Pausing`, and `Orphaned`. The post does not claim this is an exhaustive list, so this is acceptable for a tutorial.
- The `partitionFields` example omits the optional `fieldType` property, which is acceptable for a simplified tutorial.
- The pricing figures (~$0.25/GB for cluster storage, ~$0.023/GB for archive) are reasonable approximations but vary by region and provider. The post correctly uses "~" to indicate these are approximate.
- The cost savings math is verified and correct (82% savings calculation checks out).
- The JavaScript examples for finding large collections use `db.getCollection(c).stats()` which, while functional, is deprecated in newer mongosh versions in favor of the `$collStats` aggregation stage. This is acceptable since `stats()` still works.
