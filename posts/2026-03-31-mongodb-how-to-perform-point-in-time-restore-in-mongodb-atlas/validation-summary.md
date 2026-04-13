# Validation Summary: How to Perform Point-in-Time Restore in MongoDB Atlas

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Atlas
- MongoDB Atlas Cloud Backup (Continuous Cloud Backup)
- MongoDB Atlas Admin API (restore jobs endpoint)
- MongoDB oplog

## Sources Consulted
- [MongoDB Atlas Admin API v2 - Create Restore Job](https://www.mongodb.com/docs/api/doc/atlas-admin-api-v2/operation/operation-createbackuprestorejob) — verified `deliveryType` enum values and request body schema
- [MongoDB OpenAPI Spec Repository](https://github.com/mongodb/openapi) — verified `DiskBackupSnapshotRestoreJob` schema fields including restore job response structure
- [(Deprecated) Atlas Admin API v1 Documentation](https://www.mongodb.com/docs/api/doc/atlas-admin-api-v1/) — confirmed v1.0 deprecation status
- [Recover a Point in Time with Continuous Cloud Backup](https://www.mongodb.com/docs/atlas/recover-pit-continuous-cloud-backup/) — verified UI workflow and PITR prerequisites
- Unix timestamp calculation verified manually for `2026-03-30T14:30:00Z`

## Issues Found

1. **Wrong `deliveryType` for PITR** (line 46): The post used `"deliveryType": "automated"`, which is for restoring a full snapshot, not for point-in-time restore. Changed to `"deliveryType": "pointInTime"`, which is the correct enum value for PITR in the Atlas Cloud Backup API.

2. **Incorrect oplog timestamp value** (line 49): The post used `"oplogTs": 1743343800`, which corresponds to approximately `2025-03-30T14:10:00Z` — the wrong year and wrong time. The correct Unix timestamp for `2026-03-30T14:30:00Z` is `1774881000`. Fixed the value.

3. **Wrong restore job status description** (line 86): The post claimed to check a `status` field with values `QUEUED`, `IN_PROGRESS`, `COMPLETED`, or `FAILED`. The Cloud Backup `DiskBackupSnapshotRestoreJob` response does not have a `status` string enum. Instead it uses boolean flags (`failed`, `cancelled`, `expired`) and a `finishedAt` datetime field. Updated the description to reflect the actual API response structure.

## Review Notes
- The post uses Atlas Admin API v1.0 (`/api/atlas/v1.0/...`), which is deprecated in favor of v2 (`/api/atlas/v2/...`). The v1.0 endpoints may still function but readers should be aware that v2 is the current recommended version. This was not changed because the v1.0 endpoint path is still valid and the post does not claim to use v2.
- The API also supports a `pointInTimeUTCSeconds` field as a simpler alternative to the `oplogTs`/`oplogInc` pair. The post's approach of using `oplogTs`/`oplogInc` is valid but `pointInTimeUTCSeconds` may be more practical for most users.
- The `pitEnabled` field name in prerequisites is confirmed correct across multiple Atlas cluster schemas.
