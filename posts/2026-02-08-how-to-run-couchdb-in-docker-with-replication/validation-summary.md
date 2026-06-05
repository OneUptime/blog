# Validation Summary: How to Run CouchDB in Docker with Replication

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Apache CouchDB 3.x
- Docker and Docker Compose
- CouchDB HTTP API
- CouchDB replication and `_replicator`
- CouchDB MapReduce views
- CouchDB Mango queries

## Sources Consulted
- Apache CouchDB Docker installation documentation: https://docs.couchdb.org/en/stable/install/docker.html
- Apache CouchDB single-node setup documentation: https://docs.couchdb.org/en/stable/setup/single-node.html
- Apache CouchDB base configuration documentation: https://docs.couchdb.org/en/stable/config/couchdb.html
- Apache CouchDB replicator database documentation: https://docs.couchdb.org/en/stable/replication/replicator.html
- Apache CouchDB replication and conflict model documentation: https://docs.couchdb.org/en/stable/replication/conflicts.html
- Apache CouchDB design document and views documentation: https://docs.couchdb.org/en/stable/ddocs/ddocs.html
- Apache CouchDB Mango query documentation: https://docs.couchdb.org/en/stable/ddocs/mango.html
- Apache CouchDB `_find` and `_index` API documentation: https://docs.couchdb.org/en/stable/api/database/find.html
- Docker Official Image documentation for CouchDB: https://hub.docker.com/_/couchdb

## Issues Found
- The Docker examples created admin credentials but did not complete CouchDB's single-node setup. Added commands to create `_users`, `_replicator`, and `_global_changes`, which are required system databases when the setup wizard or `[couchdb] single_node=true` is not used.
- The bidirectional replication example posted documents to `_replicator` before ensuring that `_replicator` existed on both nodes. Added system database creation commands before the replication documents are inserted.
- The replication test used a fixed `sleep 2`, which can fail while CouchDB's replication scheduler is still starting. Replaced it with a polling loop that reads from the replica after replication completes.
- The conflict section used `revs_info=true` as if it returned all current conflicting revisions. Changed it to `open_revs=all`, which the official docs describe for retrieving current leaf revisions, including conflicts.
- The monitoring section read the replication document from `_replicator` as a status check. Changed it to the scheduler document endpoint, which is the official status API for replication documents.

## Review Notes
- The Compose `version: "3.8"` key is still accepted by current Docker Compose, though modern Compose files can omit it.
- The article uses the common phrase "master-master replication"; CouchDB documentation increasingly uses terms such as multi-primary or bidirectional replication, but the technical meaning in this post is clear.
