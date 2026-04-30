# Validation Summary: How to Set Up Health Checks for Microservices in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Dockerfile `HEALTHCHECK`
- Docker Compose
- Docker Swarm
- FastAPI
- Go `net/http`
- PostgreSQL
- MySQL
- MongoDB
- Redis
- RabbitMQ
- Elasticsearch
- Traefik
- Kubernetes probes

## Sources Consulted
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Compose interpolation reference: https://docs.docker.com/reference/compose-file/interpolation/
- Compose startup order: https://docs.docker.com/compose/how-tos/startup-order/
- Compose top-level `version` reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker restart policies: https://docs.docker.com/engine/containers/start-containers-automatically/
- Docker inspect CLI reference: https://docs.docker.com/reference/cli/docker/inspect/
- Docker Swarm services and update behavior: https://docs.docker.com/engine/swarm/services/
- Portainer container details: https://docs.portainer.io/user/docker/containers/view
- Portainer container inspect: https://docs.portainer.io/user/docker/containers/inspect
- FastAPI response handling: https://fastapi.tiangolo.com/advanced/response-directly/
- FastAPI status codes: https://fastapi.tiangolo.com/tutorial/response-status-code/
- asyncpg API reference: https://magicstack.github.io/asyncpg/current/api/index.html
- redis-py asyncio examples: https://redis.readthedocs.io/en/latest/examples/asyncio_examples.html
- Go `net/http` package docs: https://pkg.go.dev/net/http
- Kubernetes probes: https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
- PostgreSQL `pg_isready`: https://www.postgresql.org/docs/16/app-pg-isready.html
- MySQL `mysqladmin`: https://dev.mysql.com/doc/refman/8.0/en/mysqladmin.html
- MongoDB `db.adminCommand()`: https://www.mongodb.com/docs/manual/reference/method/db.adminCommand/
- RabbitMQ monitoring and `rabbitmq-diagnostics ping`: https://www.rabbitmq.com/docs/monitoring
- Elasticsearch cluster health API: https://www.elastic.co/docs/api/doc/elasticsearch/v8/operation/operation-cluster-health-1
- Elasticsearch security settings: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/security-settings
- Traefik Docker provider health behavior: https://doc.traefik.io/traefik/v3.0/providers/docker/

## Issues Found
- The post said Docker health checks inform Kubernetes directly. I corrected the wording because Kubernetes uses its own liveness, readiness, and startup probes rather than Dockerfile `HEALTHCHECK`.
- The Dockerfile probe used `curl` in `python:3.12-slim` without installing it. I added `curl` installation and switched the health check to exec form so the example works as written.
- The Compose example used the obsolete top-level `version` key. I removed it to match the current Compose specification.
- The PostgreSQL and MySQL health checks used `${...}` interpolation in a way that Compose resolves on the host, not inside the container. I changed them to `CMD-SHELL` with escaped `$$...` variables so the checks use the container environment correctly.
- The Elasticsearch example used the CAT health API for an automated health check and assumed unauthenticated HTTP without disabling security. I changed it to `_cluster/health` and added `xpack.security.enabled=false` for the local single-node example.
- The Go example set `Content-Type` after `WriteHeader`. I moved the header write before `WriteHeader`, which is required by Go's `net/http` behavior.
- The Portainer section made UI-specific claims that were broader than the official docs support. I narrowed that section to container status, details, and inspect data that Portainer documents explicitly.
- The Swarm section comment said `start-first` waits for health checks before proceeding. I corrected the explanation and added `monitor: 30s` so the rollback example matches Swarm update behavior more closely.
- The conclusion claimed Docker automatically restarts unhealthy standalone containers. I corrected that to describe Docker health status exposure, Traefik routing behavior, and Swarm task rescheduling more accurately.

## Review Notes
- The pinned `elasticsearch:8.12.0` image tag is an older 8.x release. The corrected example remains valid, but readers may prefer a current 8.x patch release when implementing this in practice.
