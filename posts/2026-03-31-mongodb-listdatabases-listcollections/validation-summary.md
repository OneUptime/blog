# Validation Summary: How to Use listDatabases and listCollections Commands in MongoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (administrative commands)
- MongoDB Shell (mongosh)
- `listDatabases` command
- `listCollections` command
- `db.getCollectionInfos()` helper method

## Sources Consulted
- [listDatabases - MongoDB Manual](https://www.mongodb.com/docs/manual/reference/command/listDatabases/)
- [listCollections - MongoDB Manual](https://www.mongodb.com/docs/manual/reference/command/listCollections/)
- [db.getCollectionInfos() - MongoDB Manual](https://www.mongodb.com/docs/manual/reference/method/db.getCollectionInfos/)
- [db.getCollectionNames() - MongoDB Manual](https://www.mongodb.com/docs/manual/reference/method/db.getCollectionNames/)

## Issues Found
No technical issues found.

## Review Notes
- The `listCollections` sample response omits the `info` field (which contains `readOnly` and `uuid` sub-fields) and the `cursor.id`/`cursor.ns` fields. This is acceptable as a simplified illustration but readers should be aware the actual output includes additional fields.
- The `recentLogs` capped collection example omits the `idIndex` field from the sample output. In practice, capped collections also have an `_id` index. This is a minor simplification.
- All command syntax (`db.adminCommand`, `db.runCommand`), options (`nameOnly`, `filter`), response field names (`totalSize`, `totalSizeMb`, `sizeOnDisk`, `empty`, `cursor.firstBatch`), type values (`"collection"`, `"view"`, `"timeseries"`), and helper methods (`db.getCollectionInfos()`, `db.getSiblingDB()`) are accurate and current.
