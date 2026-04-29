# Validation Summary: How to Deploy a MongoDB Replica Set via Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- MongoDB 7.0 (replica set, keyfile internal authentication, PV1 election)
- Docker / Docker Compose (compose schema 3.8, custom bridge network with IPAM)
- Portainer (container orchestration UI)
- mongosh (MongoDB Shell — `rs.initiate`, `rs.status`, `db.hello`)
- mongo-express (admin web UI)
- pymongo (Python MongoDB driver, replica set URI, read preferences)
- mongodump (backup tool)
- OpenSSL (keyfile generation)

## Sources Consulted
- MongoDB `hello`/`isMaster` reference: https://www.mongodb.com/docs/manual/reference/command/hello/
- MongoDB internal authentication / keyfile: https://www.mongodb.com/docs/manual/core/security-internal-authentication/
- MongoDB replica set protocol versions: https://www.mongodb.com/docs/manual/reference/replica-set-protocol-versions/
- MongoDB `ping` command: https://www.mongodb.com/docs/manual/reference/command/ping/
- Official `mongo` Docker image (Docker Hub + 7.0 Dockerfile): https://hub.docker.com/_/mongo and https://github.com/docker-library/mongo/blob/master/7.0/Dockerfile
- pymongo `MongoClient` reference: https://pymongo.readthedocs.io/en/stable/api/pymongo/mongo_client.html

## Issues Found
1. **Deprecated `rs.isMaster()` call (Step 6).** `rs.isMaster()` / `db.isMaster()` have been deprecated since MongoDB 5.0 in favor of the `hello` command. Replaced the `--eval "rs.isMaster()"` invocation with `--eval "db.hello()"`, which is the documented modern equivalent and returns the same primary/secondary information.
2. **Missing parent directory creation (Step 1).** The `openssl rand -base64 756 > /opt/mongodb/keyfile` redirect would fail on a fresh host because `/opt/mongodb` does not exist. Added `mkdir -p /opt/mongodb` before the `openssl` command so the snippet is reproducible from a clean slate.

## Review Notes
- `--auth` in each `mongod` command is technically redundant when `--keyFile` is already specified — `--keyFile` implicitly enforces client access control. Leaving it in is harmless and arguably more explicit, so I did not change it.
- `openssl rand -base64 756` produces ~1004 base64 characters, which is within MongoDB's required keyfile length (6–1024 chars after whitespace stripping). This matches the canonical example in the official docs.
- The official `mongo:7.0` Docker image runs as UID 999 / GID 999, so `chown 999:999 /opt/mongodb/keyfile` is correct.
- The Docker entrypoint creates the root user from `MONGO_INITDB_ROOT_USERNAME`/`PASSWORD` on first startup even when `--replSet` and `--keyFile` are set in the custom command — the entrypoint temporarily starts `mongod` without `--replSet` (on a Unix socket) to bootstrap the user, then execs the requested command. This works, though only `mongo1`'s root user becomes meaningful once the replica set is initiated and replication overwrites the data on `mongo2`/`mongo3`.
- The `db.adminCommand('ping')` healthcheck is valid even with `--auth` enabled, because `ping` is on MongoDB's list of commands runnable without authentication.
- pymongo kwargs (`read_preference`, `maxPoolSize`, `minPoolSize`, `serverSelectionTimeoutMS`, `connectTimeoutMS`) are all valid in pymongo 4.x.
- Describing MongoDB's election as "Raft-based" is accurate — PV1 is derived from Raft with modifications (no log-completeness vetoes, oplog-based replication).
- The Compose `version: "3.8"` field is no longer required by modern Compose specs and is generally ignored, but it does not cause errors. Not changed since it is not technically wrong.
- `read_preference=ReadPreference.SECONDARY_PREFERRED` overrides any `readPreference` parameter that would otherwise be supplied via the URI; this is the intended behavior and is fine here.
