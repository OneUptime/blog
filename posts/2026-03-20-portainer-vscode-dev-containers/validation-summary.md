# Validation Summary: How to Use Portainer with VS Code Dev Containers

## Status
validated

## Post Type
Guide

## Technologies Covered
- VS Code Dev Containers
- Development Containers Specification (`devcontainer.json`)
- Docker
- Docker Compose
- Portainer
- Python dev container images

## Sources Consulted
- VS Code, Create a Dev Container: https://code.visualstudio.com/docs/devcontainers/create-dev-container
- VS Code, Dev Containers Tips and Tricks: https://code.visualstudio.com/docs/devcontainers/tips-and-tricks
- Development Containers Overview: https://containers.dev/overview
- Development Containers supporting tools and services: https://containers.dev/supporting.html
- Dev Containers base schema: https://raw.githubusercontent.com/devcontainers/spec/main/schemas/devContainer.base.schema.json
- Dev Containers Python image README: https://github.com/devcontainers/images/blob/main/src/python/README.md
- Docker Docs, Version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer Docs, View a container's details: https://docs.portainer.io/user/docker/containers/view
- Portainer Docs, Inspect a container: https://docs.portainer.io/user/docker/containers/inspect
- Portainer Docs, Access a container's console: https://docs.portainer.io/sts/user/docker/containers/console
- Visual Studio Marketplace, Python: https://marketplace.visualstudio.com/items?itemName=ms-python.python
- Visual Studio Marketplace, Pylance: https://marketplace.visualstudio.com/items?itemName=ms-python.vscode-pylance
- Visual Studio Marketplace, Black Formatter: https://marketplace.visualstudio.com/items?itemName=ms-python.black-formatter

## Issues Found
- The `devcontainer.json` examples included comments but were fenced as `json`. I changed both fences to `jsonc` because `devcontainer.json` is defined by the Dev Containers project as JSON with Comments.
- The single-container image tag used `mcr.microsoft.com/devcontainers/python:3.12-bullseye`, which is not listed among the current published Python image variants in the official devcontainers image README. I updated it to `mcr.microsoft.com/devcontainers/python:3.12-bookworm`.
- The Compose example used `version: "3.8"`. Docker now documents the top-level `version` field as obsolete, so I removed it from the example.
- The Portainer identification step implied the dev container name format was fixed. I changed this to "often with names like `vsc-<project-name>-<hash>`" because those names are common, but VS Code documentation identifies managed dev containers more reliably by labels.
- The reconnect instruction used the old VS Code command name `Remote-Containers: Reopen in Container`. I updated it to the current `Dev Containers: Reopen in Container`.
- The sentence saying Dev Containers use Docker "on your host machine" was too narrow. I changed it to "in your development environment" because current VS Code documentation also covers remote Docker hosts and Docker-compatible setups.

## Review Notes
- Portainer visibility assumes Portainer is connected to the same Docker environment that VS Code is using.
- The Compose example still uses `docker-compose.yml`, which remains valid in current VS Code Dev Containers documentation even though Docker generally prefers `compose.yaml` naming in newer Compose guidance.
