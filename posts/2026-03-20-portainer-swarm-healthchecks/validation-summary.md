# Validation Summary: How to Configure Swarm Service Healthchecks in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Swarm
- Docker Compose stack files
- Docker health checks
- NGINX
- PostgreSQL
- Redis
- Elasticsearch
- Python
- Flask

## Sources Consulted
- Docker Docs, How services work: https://docs.docker.com/engine/swarm/how-swarm-mode-works/services/
- Docker Docs, Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Docs, Compose interpolation reference: https://docs.docker.com/reference/compose-file/interpolation/
- Docker Docs, Dockerfile `HEALTHCHECK` reference: https://docs.docker.com/reference/dockerfile/#healthcheck
- Docker Docs, `docker service create`: https://docs.docker.com/reference/cli/docker/service/create/
- Docker Docs, `docker stack deploy`: https://docs.docker.com/reference/cli/docker/stack/deploy/
- Portainer Docs, Services: https://docs.portainer.io/user/docker/services
- Portainer Docs, View the status of a service task: https://docs.portainer.io/sts/user/docker/services/tasks
- Portainer Docs, View a container's details: https://docs.portainer.io/user/docker/containers/view
- Elastic Docs, Install Elasticsearch with Docker: https://www.elastic.co/guide/en/elasticsearch/reference/8.19/docker.html
- Elastic Docs, Cluster health API: https://www.elastic.co/guide/en/elasticsearch/reference/8.19/cluster-health.html
- Redis Docs, Redis CLI: https://redis.io/docs/latest/develop/tools/cli/
- PostgreSQL Docs, `pg_isready`: https://www.postgresql.org/docs/current/app-pg-isready.html
- NGINX official Dockerfile source: https://github.com/nginx/docker-nginx/blob/master/Dockerfile-debian.template
- Elasticsearch official Dockerfile source: https://raw.githubusercontent.com/elastic/elasticsearch/main/distribution/docker/src/docker/Dockerfile

## Issues Found
- The `nginx:latest` example checked `http://localhost/health`, but the default NGINX image does not expose that path. I changed it to `http://localhost/`.
- The API example matched a specific JSON fragment even though the sample Flask endpoint already signals health using HTTP `200` and `503`. I changed the probe to check the endpoint response directly with `wget`.
- The Redis example used `redis-cli --no-auth-warning ping`. I simplified it to `redis-cli ping`, which is sufficient and aligns with the documented `PING` usage.
- The Elasticsearch example used `elasticsearch:8.10.0` instead of Elastic's official registry image and depended on `curl` and `python3` inside the container. I changed the image to `docker.elastic.co/elasticsearch/elasticsearch:8.10.0` and replaced the probe with `nc -z localhost 9200`, which matches tooling present in the published Dockerfile.
- The authenticated healthcheck used `${HEALTH_TOKEN}` in a Compose string and wrapped the header in shell single quotes. That would either be interpolated by Compose or not expanded by the shell. I changed it to `$$HEALTH_TOKEN` inside shell double quotes.
- The Portainer navigation text described UI wording that is not reflected in the current documentation. I changed it to the documented Containers and Services task-status views.

## Review Notes
- Docker's current Swarm docs support the post's main claim: if a task fails its health check, the task terminates and the orchestrator creates a replacement task.
- The Elasticsearch probe is now a TCP-level readiness check because the official image does not include the original `curl` and `python3` combination used in the post.
- Several example images still use floating tags such as `latest`. They are technically valid, but pinning versions would make the guide more reproducible.
