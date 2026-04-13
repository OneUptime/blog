# Validation Summary: How to Migrate from Compose.io to MongoDB Atlas

## Status
validated

## Post Type
Migration Guide / Tutorial

## Technologies Covered
- MongoDB
- MongoDB Atlas
- Compose.io (IBM)
- mongodump / mongorestore
- mongomirror
- Atlas CLI
- mongosh

## Sources Consulted
- MongoDB mongomirror reference documentation: https://www.mongodb.com/docs/atlas/reference/mongomirror/
- MongoDB Atlas database user management: https://www.mongodb.com/docs/atlas/security-add-mongodb-users/
- Atlas CLI `atlas dbusers create` reference: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-dbusers-create/
- MongoDB mongodump documentation: https://www.mongodb.com/docs/database-tools/mongodump/
- MongoDB mongorestore documentation: https://www.mongodb.com/docs/database-tools/mongorestore/
- Atlas CLI `atlas clusters create` reference: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-clusters-create/

## Issues Found

1. **Incorrect mongomirror CLI flags**: The post used `--from`, `--to`, `--fromSSL`, and `--writeConcern` which are not valid mongomirror flags. Corrected to the documented flags: `--host` (source replica set), `--destination` (Atlas target), `--ssl` (source TLS), `--username`/`--password`, and `--destinationUsername`/`--destinationPassword`. Removed the fabricated `--writeConcern` flag entirely. Source: https://www.mongodb.com/docs/atlas/reference/mongomirror/

2. **mongomirror EOL not mentioned**: mongomirror reached End of Life on July 31, 2025. MongoDB recommends the Atlas Live Migration Service or `mongosync` as replacements. Added a note at the beginning of the mongomirror section to inform readers.

3. **`db.createUser()` does not work on Atlas**: The post suggested creating Atlas database users via `db.createUser()` in mongosh. Atlas automatically rolls back any user modifications made directly through the shell. Replaced with the correct approach using `atlas dbusers create` CLI command. Source: https://www.mongodb.com/docs/atlas/security-add-mongodb-users/

## Review Notes
- The `--ssl` and `--sslAllowInvalidCertificates` flags used with mongodump are legacy (deprecated in favor of `--tls` / `--tlsAllowInvalidCertificates`), but still functional. Since this guide is about migrating from a legacy platform (Compose.io), the legacy flags are acceptable and consistent with the context.
- The `db.collection.stats()` method used in the inventory script wraps the `collStats` command, which was deprecated in MongoDB 6.2. It still works through MongoDB 7.0+ but may be removed in a future version. Acceptable for a one-time migration inventory.
- The Compose.io CA certificate URL (`https://dl.compose.io/ssl/compose-ca-2021.crt`) is illustrative since Compose.io has been sunset; the concept of downloading the CA cert from the Compose dashboard is correct.
- Compose.io itself was deprecated by IBM, so this migration guide addresses a shrinking but still relevant audience of teams on legacy Compose deployments.
