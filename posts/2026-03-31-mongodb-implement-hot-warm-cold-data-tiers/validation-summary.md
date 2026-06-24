# Validation Summary: How to Implement Hot-Warm-Cold Data Tiers in MongoDB

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- MongoDB (aggregation pipeline: `$merge`, `$unionWith`, `$match`, `$addFields`)
- MongoDB TTL indexes (`expireAfterSeconds`)
- WiredTiger storage engine block compression (`block_compressor=zstd`, available since MongoDB 4.2)
- MongoDB Atlas Online Archive (Atlas Admin API v2)

## Sources Consulted
- Atlas Admin API v2 — Create One Online Archive — https://www.mongodb.com/docs/api/doc/atlas-admin-api-v2/operation/operation-creategroupclusteronlinearchive (verified the request path, the `collName`/`criteria`/`partitionFields` body fields, `criteria.type: DATE` with `dateField`/`dateFormat`/`expireAfterDays`, and that `dateFormat` defaults to `ISODATE`; confirmed the current endpoint lives under `/api/atlas/v2/...`)
- MongoDB Atlas Online Archive search results (dateFormat enum: ISODATE, EPOCH_SECONDS, EPOCH_MILLIS, EPOCH_NANOSECONDS, OBJECT_ID; partition field limits — up to three fields for DATE criteria, one of which must be the date field)

## Issues Found
- The Atlas Online Archive example used the deprecated `/api/atlas/v1.0/...` path. Fixed to the current `/api/atlas/v2/groups/{groupId}/clusters/{clusterName}/onlineArchives` endpoint. The request body field names (`collName`, `criteria.type=DATE`, `dateField`, `dateFormat=ISODATE`, `expireAfterDays`, `partitionFields[].fieldName/order`) were all verified correct against the v2 API and left unchanged.

## Review Notes
- `db.collection.stats()` (used in the monitoring snippet, returning `count` and `storageSize`) is deprecated since MongoDB 6.2 in favor of the `$collStats` aggregation stage, but it still works and returns those fields. Left as-is since it is functional and widely used; not an error.
- `$merge` with `whenMatched: "replace"` / `whenNotMatched: "insert"` and `$unionWith` with `coll`/`pipeline` are valid stage/option spellings.
- The TTL index uses `expireAfterSeconds: 2592000` (30 days), which is the correct option name and a correct value.
- `block_compressor=zstd` via `storageEngine.wiredTiger.configString` is valid for collection-level compression (zstd supported since MongoDB 4.2).
- The partition fields in the example (`userId`, `createdAt`) satisfy the DATE-criteria rule that the date field must be included among the (max three) partition fields.
