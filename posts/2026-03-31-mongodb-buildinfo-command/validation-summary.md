# Validation Summary: How to Use the buildInfo Command in MongoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (server version 7.0.x)
- mongosh (MongoDB Shell)
- Bash scripting (CI/CD pipeline example)

## Sources Consulted
- MongoDB `buildInfo` command documentation: https://www.mongodb.com/docs/manual/reference/command/buildInfo/
- MongoDB 7.0 Release Notes (removed features — ephemeralForTest storage engine): https://www.mongodb.com/docs/manual/release-notes/7.0/
- MongoDB `db.version()` shell helper documentation: https://www.mongodb.com/docs/manual/reference/method/db.version/
- MongoDB storage engine documentation: https://www.mongodb.com/docs/manual/core/storage-engines/

## Issues Found
1. **Incorrect `storageEngines` in sample output for MongoDB 7.0.6**: The sample `buildInfo` output listed `"storageEngines": ["devnull", "ephemeralForTest", "wiredTiger"]`. The `ephemeralForTest` storage engine was removed in MongoDB 7.0. For a 7.0.6 build, the correct value is `["devnull", "wiredTiger"]`. Fixed by removing `"ephemeralForTest"` from the array.

## Review Notes
- The `allocator` field description mentions `tcmalloc` or `system` as possible values. In newer MongoDB builds, this could also be `tcmalloc-google` or `tcmalloc-gperftools`, but the two listed values cover the most common cases and the description is not incorrect.
- The scripting version check example attributes "clustered collections" to MongoDB 7.0+. Clustered collections were actually introduced in MongoDB 5.3, but they are indeed available in 7.0+, so the code is not wrong — just slightly imprecise in its implication. The compound wildcard indexes reference for 7.0 is accurate.
- The CI/CD bash script uses `sort -V` for version comparison, which is a GNU coreutils extension. It works on Linux but may not be available on all systems (e.g., older macOS without GNU coreutils). This is a minor portability caveat, not an error.
