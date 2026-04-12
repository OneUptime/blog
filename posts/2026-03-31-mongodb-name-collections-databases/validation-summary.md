# Validation Summary: How to Name Collections and Databases in MongoDB

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (database and collection naming conventions)
- Node.js MongoDB driver (`mongodb` package)
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB Manual — Naming Restrictions: https://www.mongodb.com/docs/manual/reference/limits/#naming-restrictions
- MongoDB Manual — Restriction on Collection Names: https://www.mongodb.com/docs/manual/reference/limits/#restriction-on-collection-names
- MongoDB Manual — system.* Collections: https://www.mongodb.com/docs/manual/reference/system-collections/

## Issues Found
1. **Incorrect database name maximum length.** The post stated "Maximum length: 38 bytes on some older systems; keep names short." The actual MongoDB limit is 64 bytes. Changed to "Maximum length: 64 bytes."
2. **Incorrect namespace limit in summary.** The summary referenced a "63-character limit" for collection names, which does not correspond to any MongoDB limit. The actual full namespace limit (database.collection) is 255 bytes for unsharded collections (235 bytes for sharded). Changed to "255-byte namespace limit."

## Review Notes
- The restricted characters list for database names (`/\. "$*<>:|?`) includes characters that are only restricted on Windows (`*<>:|?`). On Linux/Unix, only `/\."$` and the null character are restricted. The post does not distinguish between platforms for this list. This is conservative and not incorrect as a best-practice recommendation, so it was left as-is.
- The runtime validation function uses a 120-character max for collection names. This does not correspond to an exact MongoDB limit (the namespace limit is 255 bytes in MongoDB 4.4+, previously 120 bytes for the full namespace). As a practical guard in application code it is reasonable, but readers should be aware it is stricter than MongoDB's actual limit.
- `system.js` is deprecated as of MongoDB 8.0. The post lists it as a reserved system collection, which is still accurate, but worth noting for future updates.
