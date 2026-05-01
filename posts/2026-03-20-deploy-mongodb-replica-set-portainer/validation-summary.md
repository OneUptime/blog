# Validation Summary: How to Deploy a MongoDB Replica Set via Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- MongoDB
- MongoDB replica sets
- Docker
- Docker Compose stack syntax
- `mongosh`

## Sources Consulted
- MongoDB docs: Connection Strings - https://www.mongodb.com/docs/manual/reference/connection-string/
- MongoDB docs: Replica Set Configuration - https://www.mongodb.com/docs/manual/reference/replica-configuration/
- MongoDB docs: `rs.initiate()` - https://www.mongodb.com/docs/manual/reference/method/rs.initiate/
- MongoDB docs: `db.hello()` - https://www.mongodb.com/docs/manual/reference/method/db.hello/
- MongoDB docs: `hello` command - https://www.mongodb.com/docs/manual/reference/command/hello/
- MongoDB docs: `ping` command - https://www.mongodb.com/docs/v7.0/reference/command/ping/
- MongoDB docs: Enforce keyfile access control in an existing replica set - https://www.mongodb.com/docs/manual/tutorial/enforce-keyfile-access-control-in-existing-replica-set/
- MongoDB docs: `mongosh` options - https://www.mongodb.com/docs/mongodb-shell/reference/options/
- MongoDB docs: Read Preference - https://www.mongodb.com/docs/v7.0/core/read-preference/
- Docker docs: `docker container ls` - https://docs.docker.com/reference/cli/docker/container/ls/
- Docker docs: `docker container exec` - https://docs.docker.com/reference/cli/docker/container/exec/
- Docker docs: `docker container stop` - https://docs.docker.com/reference/cli/docker/container/stop/

## Issues Found
- The description claimed the stack provided read scaling. MongoDB replica sets route reads to the primary by default, and read scaling requires a non-primary read preference. I changed the description to focus on automatic failover and data redundancy.
- The authentication section implied that creating a user enabled authentication. In MongoDB replica sets, enforcing authentication requires internal/member authentication such as a shared keyfile or X.509. I renamed the section to creating an admin user and clarified the access-control requirement.
- The `mongosh --eval` user-creation example used `use admin` inside the eval block. I changed it to `db.getSiblingDB('admin').createUser(...)`, which is a clearer non-interactive shell example.
- The external connection string was incorrect for the example user. It used `password` instead of `adminpassword` and omitted `authSource=admin`, which would fail for a user created in the `admin` database when the URI path is `/appdb`. I corrected the URI.
- The post suggested that exposing container ports was sufficient for external replica set access. MongoDB clients use the member addresses advertised by the replica set, so those member hostnames and ports must be resolvable by external clients. I added that clarification.
- The failover test used `rs.isMaster()`, which MongoDB documents say not to use on 5.0+ in favor of `hello` / `db.hello()`. I replaced it with `db.hello()` and updated the test to stop whichever member is actually primary instead of assuming `mongo1` is primary.

## Review Notes
- The compose example is valid for a Portainer-managed standalone Docker environment. If the target environment is Docker Swarm instead, the networking and operational details would need a different walkthrough.
- The post is pinned to `mongo:7.0`. The instructions and commands reviewed here are accurate for MongoDB 7.x, but future revisions may want to move to a newer supported major release.
