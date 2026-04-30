# Validation Summary: How to Hide Specific Containers from Portainer Using Labels

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Docker Compose
- Portainer HTTP API

## Sources Consulted
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer general settings, including Hidden containers: https://docs.portainer.io/admin/settings/general
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer official source for settings updates: https://github.com/portainer/portainer/blob/develop/api/http/handler/settings/settings_update.go
- Portainer official source for hidden-container filtering logic: https://github.com/portainer/portainer/blob/develop/api/http/proxy/factory/docker/containers.go
- Portainer official source for the `--hide-label` CLI flag: https://github.com/portainer/portainer/blob/develop/api/cli/cli.go
- Docker object labels: https://docs.docker.com/engine/manage-resources/labels/
- Docker Compose `version` top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose service `labels` reference: https://docs.docker.com/reference/compose-file/services/

## Issues Found
- The post incorrectly stated that `io.portainer.agent.hide=true` is a built-in Portainer hide label. I changed the post to explain that Portainer hides containers only when its configured hidden-container filters match an exact label name and value, and updated the examples to use a custom label, `hide-from-portainer=true`.
- The post suggested `com.docker.compose.oneoff=true` as an alternative hide label. I removed this because Portainer does not document it as a built-in hide mechanism, and Docker Compose reserves the `com.docker.compose` label prefix for its own use.
- The Compose example used a top-level `version: "3.8"` key. I removed it because current Docker Compose documentation marks the `version` top-level element as obsolete.
- The "Hiding Portainer Itself" example only applied a Docker label to the Portainer container, which is not sufficient by itself. I added Portainer's `-l hide-from-portainer=true` startup flag so the example configures the matching hidden-container filter and works as described.

## Review Notes
Portainer's hidden-container matching is exact on both label name and label value. Also, Portainer documents the Docker Standalone Agent as a legacy option and recommends the Edge Agent for most new deployments.
