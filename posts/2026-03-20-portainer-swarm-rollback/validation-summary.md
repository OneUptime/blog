# Validation Summary: How to Configure Service Rollback Policies in Portainer on Swarm

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Docker Swarm
- Docker Compose deploy configuration (`update_config`, `rollback_config`)
- Docker CLI
- Docker Engine API
- Python (`requests`)

## Sources Consulted
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker Swarm services documentation: https://docs.docker.com/engine/swarm/services/
- `docker service rollback` CLI reference: https://docs.docker.com/reference/cli/docker/service/rollback/
- `docker service update` CLI reference: https://docs.docker.com/reference/cli/docker/service/update/
- Docker Engine API v1.51 reference: https://docs.docker.com/reference/api/engine/version/v1.51.yaml
- Portainer service rollback documentation: https://docs.portainer.io/sts/user/docker/services/rollback
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer CE API specification 2.39.1: https://api-docs.portainer.io/versions/ce/2.39.1.yaml

## Issues Found
1. **Automatic rollback trigger was described too narrowly.** The post said automatic rollback is triggered by failed health checks. Docker's official Swarm docs define automatic rollback around update failures during the configured monitor period and failure ratio. Failed health checks can contribute to task failure, but they are not the sole trigger. Updated the introduction, inline comment, and conclusion to describe update-failure semantics correctly.
2. **Portainer UI rollback workflow was inaccurate.** The post said readers should click Rollback only during an in-progress update and otherwise select the previous image version. Portainer's official documentation shows a direct service rollback action from the service page followed by confirmation. Replaced the UI steps with the documented workflow.
3. **Portainer API example used the wrong endpoint.** The post called `/api/endpoints/1/docker/services/$SERVICE_ID/rollback`, which does not match Docker's official service rollback API. Portainer proxies Docker requests under `/api/endpoints/{id}/docker`, so the correct rollback call is Docker's service update endpoint with `rollback=previous` and the current service version. Updated the example to use `/services/$SERVICE_ID/update?version=$VERSION&rollback=previous`, added the required JSON body, and added the `Content-Type` header.
4. **Service lookup in the API example was unnecessarily ambiguous.** The original command used `docker service ls --filter name=... -q`, which can be broader than directly inspecting the named service. Replaced it with `docker service inspect myapp_api --format '{{.ID}}'` to fetch the exact service ID used by the subsequent API calls.

## Review Notes
- The Compose `deploy.update_config` and `deploy.rollback_config` fields used in the YAML example are valid according to Docker's current Compose Deploy Specification.
- `docker service rollback` is a current supported CLI command and is equivalent in effect to `docker service update --rollback`.
- The Portainer API specification explicitly documents `/endpoints/{id}/docker` as a reverse proxy to the Docker API, which is why the rollback example must use Docker Engine API semantics instead of a Portainer-specific `/rollback` route.
- The example still uses `myapp:latest`. Docker's Swarm documentation recommends stable version tags over frequently changing tags like `latest` for more predictable deployments and rollbacks, but this was left unchanged because the example is still technically valid.
