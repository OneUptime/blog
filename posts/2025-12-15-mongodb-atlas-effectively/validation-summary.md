# Validation Summary: How to Use MongoDB Atlas Effectively

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB Atlas
- MongoDB Atlas CLI
- MongoDB Atlas Administration API
- MongoDB Node.js Driver
- MongoDB Atlas Search
- MongoDB backup, restore, monitoring, alerting, and scaling features
- GitHub Actions

## Sources Consulted
- MongoDB Atlas CLI: `atlas accessLists create`: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-accessLists-create/
- MongoDB Atlas CLI: `atlas dbusers create`: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-dbusers-create/
- MongoDB Atlas CLI: `atlas clusters update`: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-clusters-update/
- MongoDB Atlas auto-scaling documentation: https://www.mongodb.com/docs/atlas/cluster-autoscaling/
- MongoDB Atlas CLI: `atlas backups schedule update`: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-backups-schedule-update/
- MongoDB Atlas CLI: `atlas backups restores start`: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-backups-restores-start/
- MongoDB Atlas CLI: `atlas backups snapshots create`: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-backups-snapshots-create/
- MongoDB Atlas CLI: `atlas backups snapshots list`: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-backups-snapshots-list/
- MongoDB Atlas App Services Admin API EOL notice: https://www.mongodb.com/docs/api/doc/atlas-app-services-admin-api-v3/
- MongoDB Node.js Driver connection pool documentation: https://www.mongodb.com/docs/drivers/node/current/connect/connection-options/connection-pools/
- MongoDB Node.js Driver in-use encryption documentation: https://www.mongodb.com/docs/drivers/node/current/security/encrypt-fields/
- MongoDB read concern documentation: https://www.mongodb.com/docs/manual/reference/read-concern/
- MongoDB Search field mappings documentation: https://www.mongodb.com/docs/search/index/define-field-mappings/
- MongoDB Atlas Flex pricing documentation: https://www.mongodb.com/docs/atlas/billing/atlas-flex-costs/
- MongoDB Atlas Flex limitations documentation: https://www.mongodb.com/docs/atlas/reference/flex-limitations/

## Issues Found
- The connection string example declared `const uri` twice in one JavaScript block. Changed the examples to `basicUri` and `productionUri` and updated the client constructor to use `productionUri`.
- The Atlas IP access list command used a non-existent `--entry` flag. Changed it to pass the CIDR block as the positional argument with `--type cidrBlock`.
- The database user examples were in a JavaScript code fence and used incorrect role syntax, including a non-existent `--db` flag. Changed the fence to `bash`, used the built-in role positional argument for `readWriteAnyDatabase`, and used `read@reporting` for the database-scoped read role.
- The encryption snippet was marked as YAML and imported `ClientEncryption` from `mongodb-client-encryption` directly. Changed the fence to JavaScript and imported `ClientEncryption` from the public `mongodb` driver API.
- The Node.js read concern example used a cursor `.readConcern('majority')` method. Changed it to pass `readConcern: { level: 'majority' }` in the `find()` options.
- The auto-scaling example used unsupported `atlas clusters update` flags. Replaced it with the documented `atlas api clusters updateCluster` command that applies an auto-scaling payload file.
- The backup schedule example used unsupported `--snapshotIntervalHours` and `--snapshotRetentionDays` flags. Replaced them with the documented `--policy` format and `--updateSnapshots`.
- The point-in-time restore example omitted the required restore type and used milliseconds instead of the documented `--pointInTimeUTCSeconds` option. Added `pointInTime`, `--targetProjectId`, and seconds-based timestamp syntax.
- The on-demand snapshot example used `--clusterName` and `--description` where the current CLI expects a positional cluster name and `--desc`. Updated the command and added a retention value.
- The snapshot list example used `--clusterName`; the current CLI expects the cluster name as a positional argument. Updated the command.
- The Real-Time Performance Panel section used the deprecated Atlas Data API to query profiler data. Replaced it with Atlas UI guidance and a MongoDB driver query against `system.profile`.
- The Atlas Data API section described enabling and calling the Data API, which reached end-of-life with Atlas App Services on September 30, 2025. Replaced it with a driver-based query example and an EOL note.
- The cost-saving table recommended spot instances, which are not a documented MongoDB Atlas cluster purchasing option. Replaced that row with Flex clusters for low-traffic workloads and noted the shared-resource and feature-limit tradeoff.
- The right-sizing command used an unsupported disk auto-scaling flag. Replaced it with the documented manual disk size update command.

## Review Notes
- Some examples remain illustrative and require project-specific identifiers, policy IDs, cluster details, credentials, and an `autoscaling-payload.json` file before execution.
- The Atlas Data API section is retained only to explain the EOL status and point readers to supported driver or backend API patterns.
