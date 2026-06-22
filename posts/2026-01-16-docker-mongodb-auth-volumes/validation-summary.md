# Validation Summary: How to Run MongoDB in Docker with Authentication and Volumes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- MongoDB 7
- MongoDB authentication and users
- MongoDB replica sets
- MongoDB backup and restore tools
- MongoDB configuration files

## Sources Consulted
- Docker Official Image for MongoDB: https://hub.docker.com/_/mongo
- Docker Library MongoDB entrypoint source: https://github.com/docker-library/mongo/blob/master/docker-entrypoint.sh
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose deploy resources reference: https://docs.docker.com/reference/compose-file/deploy/
- MongoDB configuration file options: https://www.mongodb.com/docs/manual/reference/configuration-options/
- MongoDB journaling documentation: https://www.mongodb.com/docs/manual/core/journaling/
- MongoDB WiredTiger cache documentation: https://www.mongodb.com/docs/manual/core/wiredtiger/
- MongoDB SCRAM authentication documentation: https://www.mongodb.com/docs/manual/core/security-scram/
- MongoDB mongosh connection documentation: https://www.mongodb.com/docs/mongodb-shell/connect/
- MongoDB rs.initiate documentation: https://www.mongodb.com/docs/manual/reference/method/rs.initiate/
- MongoDB self-managed replica set deployment documentation: https://www.mongodb.com/docs/manual/tutorial/deploy-replica-set/
- MongoDB ping command documentation: https://www.mongodb.com/docs/manual/reference/command/ping/

## Issues Found
- The Docker Compose examples used the top-level `version: '3.8'` field. Docker Compose keeps this field only for backward compatibility and now treats it as obsolete, so the examples were updated to omit it.
- The environment variable table described `MONGO_INITDB_DATABASE` as an initial database to create. The MongoDB Docker image uses it as the database context for initialization scripts, and MongoDB only creates databases on first use, so the wording was corrected.
- The `mongod.conf` example included `storage.journal.enabled: true`. MongoDB removed this option starting in MongoDB 6.1 because journaling is always enabled, so it is invalid for `mongo:7`; the removed option was deleted from the configuration snippet.
- The "From Another Container" Compose example used `depends_on: condition: service_healthy` but the `mongodb` service did not define a healthcheck. A MongoDB ping healthcheck was added so the dependency condition is valid.
- The WiredTiger cache description said MongoDB uses 50% of RAM minus 1GB. MongoDB documents the default as the larger of 50% of (RAM minus 1GB), or 256MB, so the explanation was corrected.

## Review Notes
- The examples are suitable as tutorial snippets, but production deployments should also consider TLS, keyfile or x.509 internal authentication for authenticated replica sets, secret rotation, least-privilege application users, and tested backup restore procedures.
- The `MONGO_INITDB_*` variables and `/docker-entrypoint-initdb.d` scripts only affect initialization of an empty data directory; existing volumes are left untouched by the MongoDB Docker image.
