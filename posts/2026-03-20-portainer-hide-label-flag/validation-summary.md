# Validation Summary: How to Use the --hide-label Flag to Hide Containers in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer CE
- Docker Engine CLI
- Docker labels
- Docker Compose

## Sources Consulted
- Portainer Documentation: CLI configuration options — https://docs.portainer.io/advanced/cli
- Portainer Documentation: General settings / Hidden containers — https://docs.portainer.io/admin/settings/general
- Portainer source: `api/cli/cli.go` — https://github.com/portainer/portainer/blob/d4114c510dbb4334ef5ebc847f3db58038ba6e65/api/cli/cli.go
- Portainer source: `api/http/proxy/factory/docker/transport.go` — https://github.com/portainer/portainer/blob/d4114c510dbb4334ef5ebc847f3db58038ba6e65/api/http/proxy/factory/docker/transport.go
- Portainer source: `api/http/proxy/factory/docker/containers.go` — https://github.com/portainer/portainer/blob/d4114c510dbb4334ef5ebc847f3db58038ba6e65/api/http/proxy/factory/docker/containers.go
- Docker Docs: `docker run` / `docker container run` — https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs: Docker object labels — https://docs.docker.com/engine/manage-resources/labels/
- Docker Docs: Compose services reference — https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Compose `version` top-level element — https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: `docker compose up` — https://docs.docker.com/reference/cli/docker/compose/up/
- Docker Docs: `docker inspect` — https://docs.docker.com/reference/cli/docker/inspect/

## Issues Found
- Some `docker run` examples placed inline comments after a trailing `\` line continuation. That is invalid shell syntax, so I moved those comments onto standalone comment lines to make the commands executable as written.
- The verification section claimed hidden containers still appear through Portainer's Docker-proxy container list API. Current Portainer source shows `GET /containers/json` is routed through label filtering, so I replaced that section with Docker CLI-based verification instead.
- The Compose snippets used a top-level `version: "3.8"` key. Docker's current Compose Specification marks the top-level `version` field as obsolete, so I removed it.

## Review Notes
- The Portainer Compose example was normalized to list-form `command` syntax so the `--hide-label` argument is passed explicitly.
- Official Portainer install docs currently favor `portainer/portainer-ce:sts` or `:lts`. The post still uses `:latest`, which is currently published and valid, but it is less pinned.
