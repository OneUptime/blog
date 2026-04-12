# Validation Summary: How to Prepare MongoDB for Production Deployment

## Status
validated

## Post Type
Guide / Checklist

## Technologies Covered
- MongoDB (replica sets, WiredTiger storage engine, mongosh)
- Linux OS tuning (sysctl, ulimits, transparent huge pages)
- MongoDB connection string URI format
- MongoDB user authentication and authorization

## Sources Consulted
- MongoDB Configuration File Options: https://www.mongodb.com/docs/manual/reference/configuration-options/
- MongoDB Connection String URI Format: https://www.mongodb.com/docs/manual/reference/connection-string/
- MongoDB Production Checklist (Operations): https://www.mongodb.com/docs/manual/administration/production-checklist-operations/
- MongoDB Replica Set Configuration: https://www.mongodb.com/docs/manual/reference/replica-configuration/
- MongoDB 6.1 Release Notes (journal option removal)
- MongoDB 8.0 Release Notes (THP guidance reversal)

## Issues Found

### 1. Removed `storage.journal.enabled` config option
- **What was wrong:** The `mongod.conf` example included `storage.journal.enabled: true`. This option was removed in MongoDB 6.1. On MongoDB 6.1+ the WiredTiger journal is always enabled and cannot be toggled. Including this option in the config file can cause an "Unrecognized option" startup error.
- **What was changed:** Removed the `journal: enabled: true` lines from the `storage` section of the config example.
- **Why:** Prevents startup failures on MongoDB 6.1+ and removes misleading guidance suggesting journaling might need to be explicitly enabled.

### 2. Outdated Transparent Huge Pages (THP) guidance
- **What was wrong:** The post unconditionally recommended disabling THP. Starting with MongoDB 8.0, the recommendation reversed — THP should be **enabled** because MongoDB 8.0 uses an upgraded TCMalloc that benefits from THP.
- **What was changed:** Added a comment clarifying that disabling THP applies to MongoDB 7.0 and earlier, and that MongoDB 8.0+ recommends keeping THP enabled.
- **Why:** Prevents readers running MongoDB 8.0+ from making a counterproductive configuration change.

## Review Notes
- The WiredTiger cache size comment says "~50% of available RAM." The precise MongoDB formula is 50% of (RAM - 1 GB) or 256 MB, whichever is larger. The approximation is reasonable for a blog post but readers tuning tight memory budgets should consult the official docs.
- The verification script in Step 7 does not include authentication credentials. With auth enabled (as recommended in Step 2), these `mongosh --eval` commands would require authentication to succeed. Readers should add `--username`/`--password` flags or use a `.mongoshrc.js` config.
- `storage.wiredTiger.indexConfig.prefixCompression` defaults to `true`, so explicitly setting it is redundant but harmless and serves as documentation.
