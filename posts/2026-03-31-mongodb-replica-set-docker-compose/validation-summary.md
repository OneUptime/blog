# Validation Summary: How to Set Up a MongoDB Replica Set with Docker Compose

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB 7.0
- Docker / Docker Compose
- MongoDB Replica Sets
- mongosh (MongoDB Shell)
- Node.js MongoDB Driver

## Sources Consulted
- MongoDB Replica Set Configuration documentation: https://www.mongodb.com/docs/manual/reference/replica-configuration/
- MongoDB mongod --port option: https://www.mongodb.com/docs/manual/reference/program/mongod/#std-option-mongod.--port
- MongoDB Node.js Driver Transactions API: https://www.mongodb.com/docs/drivers/node/current/fundamentals/transactions/
- MongoDB Connection String URI Format: https://www.mongodb.com/docs/manual/reference/connection-string/
- MongoDB Driver Server Discovery and Monitoring (SDAM) specification: https://github.com/mongodb/specifications/blob/master/source/server-discovery-and-monitoring/server-discovery-and-monitoring.md
- Docker Compose depends_on documentation: https://docs.docker.com/compose/how-tos/startup-order/
- mongosh output format: https://www.mongodb.com/docs/mongodb-shell/

## Issues Found

### 1. Replica set member ports not accessible from host (Major)
**What was wrong:** All three replica set members were configured with port 27017 in `rs.initiate()` (`mongo1:27017`, `mongo2:27017`, `mongo3:27017`), but the host port mappings were 27017, 27018, and 27019 respectively. After initial connection, the MongoDB driver performs topology discovery and replaces the seed list with the member addresses from the replica set config. Since `/etc/hosts` maps all three hostnames to `127.0.0.1`, the driver would try to reach `mongo2:27017` → `127.0.0.1:27017`, which actually hits the mongo1 container — not mongo2.

**What was changed:** Configured mongo2 to listen on port 27018 and mongo3 on port 27019 by adding `--port` flags to the `mongod` command. Updated port mappings to `27018:27018` and `27019:27019`. Updated `rs.initiate()` member hosts to `mongo2:27018` and `mongo3:27019`. This ensures replica set member addresses match the host-accessible addresses, so the driver's topology discovery works correctly from both inside the Docker network and from the host machine.

### 2. rs.status() expected output format incorrect (Minor)
**What was wrong:** The expected output of `rs.status()` used the old `mongo` shell format (`"name" : "mongo1:27017", "stateStr" : "PRIMARY"`), but MongoDB 7.0 ships with `mongosh` which uses a different output format (`name: 'mongo1:27017', stateStr: 'PRIMARY'`).

**What was changed:** Updated the expected output comments to match `mongosh` output format, and updated the member ports to reflect the corrected replica set configuration.

### 3. Missing session.endSession() in transaction example (Minor)
**What was wrong:** The transaction example did not call `session.endSession()` after the transaction completed or aborted. This leaks the server-side session resource.

**What was changed:** Added a `finally` block with `await session.endSession()` to ensure the session is cleaned up regardless of whether the transaction succeeds or fails.

## Review Notes
- The `version: "3.8"` field in the Docker Compose file is deprecated in Docker Compose V2 (the current standard) and is silently ignored. It does not cause errors but could be removed in a future update.
- The post uses `docker-compose` (hyphenated, V1 syntax) rather than `docker compose` (space, V2 plugin syntax). Both work if the V1 compatibility shim is installed, but V2 is the current standard.
- The `mongo-init` service only declares a `depends_on` for `mongo1` (with `service_healthy` condition), not for `mongo2` or `mongo3`. In practice this is fine because `rs.initiate()` is tolerant of members coming online later, and the healthcheck delay gives the other nodes time to start. The `restart: on-failure` policy also provides resilience if the init runs before all nodes are ready.
