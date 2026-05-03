# Validation Summary: How to Deploy MongoDB via Portainer

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- Portainer (stack deployment)
- MongoDB 7.0 (official `mongo:7.0` Docker image)
- Mongo Express (browser-based MongoDB admin UI)
- Docker Compose (v3.8 schema)
- mongosh (MongoDB Shell)
- MongoDB Database Tools (mongodump, mongorestore)
- WiredTiger storage engine

## Sources Consulted
- Official MongoDB Docker image documentation: https://hub.docker.com/_/mongo
- MongoDB 7.0 Manual — Authentication and `mongod` options: https://www.mongodb.com/docs/v7.0/reference/program/mongod/
- MongoDB WiredTiger cache sizing docs: https://www.mongodb.com/docs/v7.0/core/wiredtiger/#memory-use
- mongosh reference: https://www.mongodb.com/docs/mongodb-shell/
- mongodump / mongorestore reference: https://www.mongodb.com/docs/database-tools/
- mongo-express GitHub README (env var names): https://github.com/mongo-express/mongo-express
- Docker Compose `depends_on` with `condition: service_healthy`: https://docs.docker.com/compose/compose-file/05-services/#depends_on
- MongoDB `db.createUser`, `db.createCollection` (with `$jsonSchema`), and `createIndex` reference docs

## Issues Found
- **WiredTiger default cache description was mathematically ambiguous.** The original text read "MongoDB's WiredTiger cache defaults to 50% of RAM - 1GB", which can be parsed as `(50% of RAM) - 1GB`. The official formula is `max(50% of (RAM - 1GB), 256MB)`. Updated the sentence to: "MongoDB's WiredTiger cache defaults to the larger of 50% of (RAM - 1GB) or 256MB."

## Review Notes
- The `mongo:7.0` image's docker-entrypoint script automatically appends `--auth` whenever `MONGO_INITDB_ROOT_USERNAME` is set, so the explicit `--auth` in the `command:` override is redundant but harmless. Left as-is because it makes the auth posture explicit to readers.
- Init scripts in `/docker-entrypoint-initdb.d` already execute against `MONGO_INITDB_DATABASE` by default, so `db = db.getSiblingDB('myapp');` is redundant but defensive — also left as-is.
- The `version: "3.8"` field at the top of the compose file is now considered obsolete by the Compose Specification (Compose v2 ignores it). It still parses without error, so this is a future-cleanup note rather than a bug.
- The post's description claims it covers "replica set configuration", but the body does not include any replica set setup. This is a description/body mismatch, not a code error, so it was not modified per the "do not add new sections" rule.
- `mongo-express:latest` is convenient for a tutorial but pinning to a tagged version is generally safer for production stacks.
- The TTL index example: `expireAfterSeconds: 2592000` correctly equals 30 days (30 × 86400).
- `mongodump` and `mongorestore` are bundled with the official `mongo:7.0` Linux image (via the `mongodb-org-tools` meta-package), so the backup/restore commands work without additional installation.
