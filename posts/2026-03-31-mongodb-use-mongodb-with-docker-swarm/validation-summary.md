# Validation Summary: How to Use MongoDB with Docker Swarm

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB 7.0
- Docker Swarm
- Docker Compose v3.8 (Swarm stack deployment)
- Docker Secrets
- mongosh (MongoDB Shell)

## Sources Consulted
- Docker Swarm mode overview: https://docs.docker.com/engine/swarm/
- Docker `docker stack deploy` reference: https://docs.docker.com/reference/cli/docker/stack/deploy/
- Docker Compose v3 reference (deploy, depends_on, secrets): https://docs.docker.com/reference/compose-file/
- Docker Secrets documentation: https://docs.docker.com/engine/swarm/secrets/
- Official MongoDB Docker image documentation: https://hub.docker.com/_/mongo
- MongoDB replica set initiation: https://www.mongodb.com/docs/manual/reference/method/rs.initiate/
- mongosh documentation: https://www.mongodb.com/docs/mongodb-shell/

## Issues Found
1. **`depends_on` used in Swarm mode YAML snippet** — The application service snippet included `depends_on: - mongodb`. Docker's Compose v3 reference explicitly states that `depends_on` is ignored when deploying a stack in Swarm mode with `docker stack deploy`. Including it in a Swarm-focused tutorial is misleading, as readers may assume startup ordering is enforced. **Fix:** Removed the `depends_on` block from the application service YAML snippet.

## Review Notes
- The `version: "3.8"` field in the Compose file is considered obsolete by Docker Compose V2, but it is still accepted and commonly used with `docker stack deploy` for Swarm mode. Not an error, but future posts may want to omit it.
- The `echo "password" | docker secret create ...` pattern includes a trailing newline, but the official MongoDB image's entrypoint strips it via shell command substitution. This is consistent with Docker's own documentation examples.
- The replica set is initialized with a single member on `localhost:27017`, which is appropriate for the basic setup described. The summary correctly notes that production deployments should use multiple nodes.
- The post correctly uses `mongosh` (the current MongoDB shell) rather than the deprecated `mongo` shell.
