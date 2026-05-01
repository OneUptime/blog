# Validation Summary: How to Deploy Stacks with Health Checks for All Services in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose / Compose Specification
- Docker health checks
- Docker restart policies
- PostgreSQL
- Redis
- RabbitMQ
- Apache Kafka
- Python / Flask-style health endpoint example

## Sources Consulted
- Docker Docs, Control startup and shutdown order in Compose: https://docs.docker.com/compose/how-tos/startup-order/
- Docker Docs, Compose file services reference (`depends_on`, `healthcheck`, `restart`): https://docs.docker.com/reference/compose-file/services/
- Docker Docs, Version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs, Dockerfile `HEALTHCHECK` reference: https://docs.docker.com/reference/builder
- Docker Docs, Restart policies: https://docs.docker.com/engine/containers/start-containers-automatically/
- Docker Docs, Deploy a stack to a swarm: https://docs.docker.com/engine/swarm/stack-deploy/
- Portainer Docs, Add a new stack: https://docs.portainer.io/user/docker/stacks/add
- Portainer Docs, Stack/application updates in Docker Standalone vs Swarm: https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work
- Portainer Docs, Inspect a container: https://docs.portainer.io/user/docker/containers/inspect
- Docker Official Image docs for Postgres: https://hub.docker.com/_/postgres/
- PostgreSQL 16 docs for `pg_isready`: https://www.postgresql.org/docs/16/app-pg-isready.html
- Redis CLI docs: https://redis.io/docs/latest/develop/tools/cli/
- RabbitMQ diagnostics docs: https://www.rabbitmq.com/docs/3.13/man/rabbitmq-diagnostics.8
- Apache Kafka quickstart: https://kafka.apache.org/quickstart
- Apache Kafka Docker image usage guide: https://github.com/apache/kafka/blob/trunk/docker/examples/README.md
- NGINX official image Dockerfile template: https://raw.githubusercontent.com/nginx/docker-nginx/master/Dockerfile-debian.template

## Issues Found
- The post claimed health checks would provide "self-healing container restarts" and that failed containers would be automatically replaced. I changed the description, introduction, and summary to state that health checks expose container health, while restart policies only apply when the container exits.
- The post treated `depends_on.condition: service_healthy` as if it applied to Portainer stacks in general. I scoped the startup-order claim to Portainer Docker Standalone / Compose deployments, because Portainer uses Compose for Docker Standalone and `docker stack deploy` for Swarm.
- The PostgreSQL example would not start correctly as written. The official `postgres` image requires initialization settings such as `POSTGRES_PASSWORD`, and the health check referenced `mydb` without creating it. I added `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD`, and updated the health check to use `pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}`.
- The Compose snippet used top-level `version: "3.8"`, which current Docker Compose documentation marks as obsolete. I removed it to align the example with the current Compose specification.
- The "Last N health check results" wording was overly specific. I changed it to "Recent health check results" and "Failure output" to match what Docker stores in health status and what Portainer exposes via Inspect.

## Review Notes
- The generic examples for HTTP, TCP, RabbitMQ, Kafka, and custom app health checks assume the probe binary is present in the target image. For custom images, the command may need to be adapted to available tooling.
- The pinned image tags in the sample are valid examples, but they will age over time and may need periodic refreshes in future reviews.
