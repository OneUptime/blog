# Validation Summary: How to Set Up Cross-Region Backup for MongoDB Atlas

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- MongoDB Atlas (Cloud Backup)
- MongoDB Atlas Admin API v1.0
- Cross-region snapshot distribution
- AWS regions (US_EAST_1, US_WEST_2, EU_WEST_1)
- curl / Python for API interaction

## Sources Consulted
- [Configure Atlas to Automatically Copy Snapshots to Other Regions](https://www.mongodb.com/docs/atlas/backup/cloud-backup/snapshot-distribution/) — official Atlas docs on snapshot distribution and copySettings
- [Cloud Backups | Atlas Admin API v2 documentation](https://www.mongodb.com/docs/api/doc/atlas-admin-api-v2/group/endpoint-cloud-backups) — API response schema for snapshot objects confirming `copyRegions` field
- [Return One Sharded Cluster Cloud Backup | Atlas Admin API v2 documentation](https://www.mongodb.com/docs/api/doc/atlas-admin-api-v2/operation/operation-getgroupclusterbackupsnapshotshardedcluster) — snapshot response fields reference
- [Migrate to the New Versioned Atlas Administration API](https://www.mongodb.com/docs/atlas/api/migrate-to-new-version/) — v1 to v2 migration guide
- [Cloud Backup Restore Jobs — MongoDB Atlas](https://docs.atlas.mongodb.com/reference/api/cloud-backup/restore/restores/) — restore job endpoint and AUTOMATED_RESTORE payload
- [Remove All Cloud Backup Schedules | (Deprecated) Atlas Admin API v1 documentation](https://www.mongodb.com/docs/api/doc/atlas-admin-api-v1/operation/operation-deleteallbackupschedules) — confirmation that v1.0 backup schedule endpoints exist

## Issues Found
1. **Step 5 — Incorrect snapshot response field name**: The Python script used `s.get('copyRegion', [])` (singular) to access copy region data from the snapshot response. The correct field name in the Atlas API is `copyRegions` (plural). Additionally, each element in `copyRegions` is a plain region name string (e.g., `"US_WEST_2"`), not an object with `regionName`/`status` properties. Fixed the code to use `s.get('copyRegions', [])` and iterate over strings directly.

## Review Notes
- The post uses the Atlas Admin API v1.0, which MongoDB has deprecated. The recommended approach is to use the versioned Atlas Admin API v2 (`/api/atlas/v2/`) with version headers (e.g., `application/vnd.atlas.2023-02-01+json`). The v1.0 endpoints still function but may be removed in the future.
- In API v2, the `copySettings` field `replicationSpecId` has been replaced by `zoneId`. The v1.0 usage in this post is correct for that API version.
- The copy lag estimate of "15-60 minutes" is a reasonable approximation but actual times vary by snapshot size and region distance. This is presented as an estimate so it is acceptable.
- The DR test script in Step 7 is a pseudocode outline with placeholder comments rather than working code. This is acceptable as a conceptual framework but readers should be aware it requires implementation.
