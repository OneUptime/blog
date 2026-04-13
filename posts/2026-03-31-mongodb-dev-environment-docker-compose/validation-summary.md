# Validation Summary: How to Set Up a MongoDB Development Environment with Docker Compose

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB 7.0
- Docker Compose
- mongo-express 1.0
- mongosh

## Sources Consulted
- MongoDB Docker image entrypoint script: https://github.com/docker-library/mongo/blob/master/docker-entrypoint.sh
- MongoDB `ping` command documentation: https://www.mongodb.com/docs/manual/reference/command/ping/
- MongoDB localhost exception: https://www.mongodb.com/docs/manual/core/localhost-exception/
- Docker Compose specification (version field obsolescence): https://docs.docker.com/compose/compose-file/
- mongo-express Docker Hub: https://hub.docker.com/_/mongo-express
- mongo-express config.default.js (current master): https://github.com/mongo-express/mongo-express/blob/master/config.default.js

## Issues Found

### 1. `rs.initiate()` command missing authentication credentials
- **What was wrong:** The command `docker exec mongo-dev mongosh --eval "rs.initiate()"` did not include authentication flags. Since the container has auth enabled (root user is created by the entrypoint), the localhost exception is already closed by the time a user can exec into the container. The command would fail with an authentication error.
- **What was changed:** Added `-u admin -p devpassword --authenticationDatabase admin` flags to the `mongosh` command.
- **Why:** `rs.initiate()` requires admin privileges, and authentication is mandatory once the root user has been created.

### 2. Removed deprecated `ME_CONFIG_MONGODB_ADMINUSERNAME` and `ME_CONFIG_MONGODB_ADMINPASSWORD` from mongo-express config
- **What was wrong:** The mongo-express service included `ME_CONFIG_MONGODB_ADMINUSERNAME` and `ME_CONFIG_MONGODB_ADMINPASSWORD` environment variables. These env vars were removed from mongo-express in version 1.0+ and are no longer read by the application. The connection is handled entirely by `ME_CONFIG_MONGODB_URL`, which was already correctly specified.
- **What was changed:** Removed the two deprecated environment variables, leaving only `ME_CONFIG_MONGODB_URL` for the database connection.
- **Why:** These variables are silently ignored in mongo-express 1.0+, making them misleading to readers who might think they are required or functional.

## Review Notes
- The `version: "3.8"` field in `docker-compose.yml` is obsolete in Docker Compose V2 and generates a deprecation warning. It is still accepted and does not cause errors, but modern practice is to omit it entirely. Not changed since it is functional and commonly seen in existing documentation.
- The healthcheck uses `mongosh --eval "db.adminCommand('ping')"` without credentials. The `ping` command is specifically exempted from authentication requirements in MongoDB, so this works correctly. Some environments may log auth warnings, but the check succeeds.
- The `MONGO_INITDB_DATABASE` variable does not create the database by itself; it only sets the database context for init scripts in `/docker-entrypoint-initdb.d/`. The blog post correctly explains this behavior ("MongoDB runs them on first container start").
- The mongo-express Docker image has been marked as deprecated on Docker Hub due to maintainer inactivity. The image still works but readers should be aware it may not receive future updates.
