# Validation Summary: How to Add Docker Hub Credentials to Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Hub
- Docker CLI (`docker login`, `docker pull`)
- Docker Compose / stack YAML

## Sources Consulted
- Portainer Documentation: Add a DockerHub account — https://docs.portainer.io/admin/registries/add/dockerhub
- Portainer Documentation: Registries for Docker environments — https://docs.portainer.io/user/docker/host/registries
- Portainer Documentation: Registries for Swarm environments — https://docs.portainer.io/user/docker/swarm/registries
- Portainer Documentation: Registries for Kubernetes environments — https://docs.portainer.io/user/kubernetes/cluster/registries
- Docker Docs: `docker login` CLI reference — https://docs.docker.com/reference/cli/docker/login/
- Docker Docs: Personal access tokens — https://docs.docker.com/security/access-tokens/
- Docker Docs: Docker Hub usage and limits — https://docs.docker.com/docker-hub/download-rate-limit/

## Issues Found
- The Portainer navigation path was outdated. The post said to use `Settings > Registries`; current Portainer documentation uses the top-level `Registries` menu, so I updated the steps.
- The registry credential instructions were inaccurate. Current Portainer documentation specifies a Docker Hub personal access token rather than a generic password field, and requires a successful `Test connection` before adding the registry, so I corrected both points.
- The Docker Hub token creation flow was outdated. The post referenced `hub.docker.com` and `Account Settings > Security`; current Docker documentation uses Docker Home at `https://app.docker.com` and `Account settings > Personal access tokens`, so I updated that section.
- The environment assignment steps did not match Portainer's current registry access flow. I replaced the `Environments` guidance with the documented `Host/Swarm/Cluster > Registries` and `Manage access` workflow.
- The verification command used `docker login ... -p ...`. While valid, Docker's current documentation recommends `--password-stdin` for safer non-interactive authentication, so I updated the example.

## Review Notes
- The rate-limit explanation is now aligned with Docker's documented limits for unauthenticated users and Docker Personal accounts as of 2026-05-07.
- The stack YAML snippet is syntactically valid, and the private Docker Hub image reference format is correct.
- Portainer's registry-access navigation differs by environment type (`Host`, `Swarm`, or `Cluster`), and the post now reflects that distinction.
