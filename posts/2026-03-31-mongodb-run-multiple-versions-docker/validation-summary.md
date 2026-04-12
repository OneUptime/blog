# Validation Summary: How to Run Multiple MongoDB Versions with Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (versions 5.0, 6.0, 7.0)
- Docker / Docker Compose
- mongosh (MongoDB Shell)
- mongodump / mongorestore (MongoDB Database Tools)
- GitHub Actions (CI matrix strategy)
- Node.js (MongoDB Node.js driver)

## Sources Consulted
- MongoDB official Docker image documentation: https://hub.docker.com/_/mongo
- MongoDB `$setWindowFields` aggregation stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/
- MongoDB `buildInfo` command: https://www.mongodb.com/docs/manual/reference/command/buildInfo/
- MongoDB connection string URI format: https://www.mongodb.com/docs/manual/reference/connection-string/
- `mongodump` documentation: https://www.mongodb.com/docs/database-tools/mongodump/
- `mongorestore` documentation: https://www.mongodb.com/docs/database-tools/mongorestore/
- Docker Compose file reference: https://docs.docker.com/compose/compose-file/
- GitHub Actions service containers: https://docs.github.com/en/actions/using-containerized-services/about-service-containers

## Issues Found
- **Section heading mismatch**: The heading "Running Two Versions Side by Side" was incorrect — the Docker Compose example defines three MongoDB versions (5.0, 6.0, 7.0), not two. Changed to "Running Multiple Versions Side by Side."

## Review Notes
- The `version: "3.8"` field in Docker Compose is deprecated in Compose V2 and is silently ignored. Modern usage omits it entirely. The file still works, but readers using current Docker Compose may see a deprecation warning.
- The `mongodump` and `mongorestore` commands are run inside the MongoDB containers via `docker exec`. Starting with MongoDB 4.4, the database tools were separated into the `mongodb-database-tools` package. Depending on the specific Docker image build, these tools may not be present in the `mongo:6.0` or `mongo:7.0` images. If they are missing, users would need to install them inside the container or run the tools from the host instead.
- The version check logic `if (major >= 5 && minor >= 0)` works correctly for the specific "5.0+" threshold since `minor >= 0` is always true. However, this pattern would produce incorrect results if adapted for a non-zero minor version (e.g., checking for "5.2+" with `major >= 5 && minor >= 2` would incorrectly reject "6.0"). A more robust approach would compare `major > 5 || (major === 5 && minor >= 0)`, but for the stated use case the code is correct.
- The `mongosh` connection strings omit `?authSource=admin`, which is fine because when no database is specified in the URI path, `mongosh` defaults the auth source to `admin`. This matches the `MONGO_INITDB_ROOT_USERNAME` setup.
