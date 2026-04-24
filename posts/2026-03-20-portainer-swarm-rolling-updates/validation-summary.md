# Validation Summary: How to Set Up Rolling Update Policies for Swarm Services in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Swarm
- Docker Compose / Docker stack file deployment settings
- Docker Engine API
- Traefik Swarm provider
- Shell commands with `curl`, `jq`, and `python3`

## Sources Consulted
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker Swarm rolling updates tutorial: https://docs.docker.com/engine/swarm/swarm-tutorial/rolling-update/
- Docker CLI reference for `docker service update`: https://docs.docker.com/reference/cli/docker/service/update/
- Docker Engine API v1.50 reference (`/services/{id}/update`): https://docs.docker.com/reference/api/engine/version/v1.50.yaml
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer API access documentation: https://docs.portainer.io/api/access
- Portainer Services documentation: https://docs.portainer.io/user/docker/services
- Portainer Configure service options documentation: https://docs.portainer.io/user/docker/services/configure
- Traefik Swarm provider documentation: https://doc.traefik.io/traefik/v3.4/providers/swarm/

## Issues Found
- The Portainer UI steps did not match the current documented service workflow. I updated them to use the current **Services** view and **Apply changes** flow.
- The Portainer API example sent only a partial service spec and referenced an undefined `$VERSION` variable. Docker's service update API requires the current object version and a full `ServiceSpec`, so I changed the snippet to fetch the current service, extract `Version.Index`, update `.Spec`, and POST the full spec back.
- The monitoring snippet assumed `UpdateStatus` always exists and would fail with a `KeyError` when no update status was present. I made the JSON access defensive.
- The Traefik example used top-level `labels`, but in Swarm mode Traefik reads service labels from `deploy.labels`. I moved the labels to the `deploy` section.
- The Traefik example also omitted the required `traefik.http.services.<service_name>.loadbalancer.server.port` label for Swarm. I added the explicit backend port label.
- The conclusion overstated `start-first` as guaranteeing that new tasks are healthy before old ones are removed. I corrected the wording to match Docker's documented behavior: new tasks start before old tasks are stopped.

## Review Notes
- The API example now uses `jq` to rewrite the live service spec before sending it back to the Docker API through Portainer.
- The blue-green section is a simplified Traefik-based cutover example rather than an atomic traffic-switch implementation.
- The health check example assumes the container image includes `curl`.
