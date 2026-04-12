# Validation Summary: How to Set Up MongoDB with Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB 7.0
- Docker (container runtime)
- Docker Compose V2
- mongosh (MongoDB Shell)
- mongodump / mongorestore (backup utilities)
- WiredTiger storage engine configuration

## Sources Consulted
- Official MongoDB Docker image documentation: https://hub.docker.com/_/mongo
- MongoDB mongod.conf configuration file options: https://www.mongodb.com/docs/manual/reference/configuration-options/
- MongoDB `MONGO_INITDB_ROOT_USERNAME` / `MONGO_INITDB_ROOT_PASSWORD` environment variables: https://hub.docker.com/_/mongo (Environment Variables section)
- MongoDB `operationProfiling.mode` valid values: https://www.mongodb.com/docs/manual/reference/configuration-options/#mongodb-setting-operationProfiling.mode
- MongoDB `ping` command authentication requirements: https://www.mongodb.com/docs/manual/reference/command/ping/
- Docker Compose specification (`depends_on`, `healthcheck`): https://docs.docker.com/reference/compose-file/
- mongodump / mongorestore CLI reference: https://www.mongodb.com/docs/database-tools/mongodump/ and https://www.mongodb.com/docs/database-tools/mongorestore/

## Issues Found
No technical issues found.

## Review Notes
- The `version: "3.8"` field in the Docker Compose file is obsolete in Docker Compose V2 (which the post uses via `docker compose` without hyphen). It is silently ignored and does not cause errors, but modern practice is to omit it entirely. Not a correctness issue.
- The custom `mongod.conf` sets `systemLog.destination: file`, which redirects all MongoDB logs to `/var/log/mongodb/mongod.log` inside the container. This means `docker logs mongodb` will show no MongoDB output. This is valid configuration but worth noting as an operational consideration — readers using this config should be aware they need to read logs from the file or mount the log directory.
- The healthcheck uses `mongosh --eval "db.adminCommand('ping')"` without credentials. This works correctly because the `ping` command does not require authentication in MongoDB, even when auth is enabled.
- All `docker run` commands, environment variables, volume mounts, connection strings, and init script patterns are accurate for the official `mongo:7.0` Docker image.
