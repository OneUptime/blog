# Validation Summary: How to Run MongoDB in a Podman Container

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman containers and named volumes
- MongoDB 7
- Official MongoDB container image
- mongosh
- MongoDB configuration files
- MongoDB Database Tools (`mongodump`, `mongorestore`)

## Sources Consulted
- MongoDB Manual v7.0: Self-Managed Configuration File Options - https://www.mongodb.com/docs/v7.0/reference/configuration-options/
- MongoDB Manual: Self-Managed Configuration File Options - https://www.mongodb.com/docs/manual/reference/configuration-options/
- Docker Official Image: mongo - https://hub.docker.com/_/mongo
- Podman Manual: podman-run - https://docs.podman.io/en/v4.3/markdown/podman-run.1.html
- MongoDB Database Tools: mongodump - https://www.mongodb.com/docs/database-tools/mongodump/
- MongoDB Database Tools: mongorestore - https://www.mongodb.com/docs/database-tools/mongorestore/

## Issues Found
- Removed `storage.journal.enabled: true` from the sample `mongod.conf`. MongoDB removed the `storage.journal.enabled` option starting in MongoDB 6.1 because journaling is always enabled, so the option is invalid for `mongo:7`.
- Changed the custom configuration example to use a separate `mongo-custom-data` named volume instead of reusing `mongo-data`. Reusing the same database path while `mongo-persistent` is still running can cause MongoDB data-file lock conflicts and also makes initialization behavior depend on prior state.
- Updated the cleanup command to remove `mongo-custom` and `mongo-init`, and to remove both named volumes created or auto-created by the examples.

## Review Notes
- Podman was not installed in the local environment, so Podman flags were checked against official Podman documentation rather than local `podman --help` output.
- Docker was available locally, but the review relied on official MongoDB and Podman documentation for version-specific behavior.
