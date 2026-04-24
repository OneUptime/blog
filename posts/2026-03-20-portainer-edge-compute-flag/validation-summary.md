# Validation Summary: How to Use the --edge-compute Flag to Enable Edge Features

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Community Edition
- Portainer Edge Compute
- Portainer Edge Agent Standard
- Portainer Edge Agent Async
- Portainer HTTP API
- Docker CLI
- Docker Compose

## Sources Consulted
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Install Portainer CE with Docker on Linux: https://docs.portainer.io/start/install-ce/server/docker/linux
- The Portainer Edge Agent: https://docs.portainer.io/advanced/edge-agent
- Install Edge Agent Standard on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/edge
- Install Edge Agent Standard on Docker Swarm: https://docs.portainer.io/admin/environments/add/swarm/edge
- Install Edge Agent Async on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/edge-async
- Edge Compute settings: https://docs.portainer.io/admin/settings/edge
- General settings: https://docs.portainer.io/admin/settings/general
- Edge Groups: https://docs.portainer.io/user/edge/groups
- Edge Jobs: https://docs.portainer.io/user/edge/jobs
- Edge Stacks: https://docs.portainer.io/user/edge/stacks
- Accessing the Portainer API: https://docs.portainer.io/api/access
- Portainer CE API specification 2.39.1: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Docker run reference: https://docs.docker.com/engine/containers/run/
- Docker port publishing reference: https://docs.docker.com/get-started/docker-concepts/running-containers/publishing-ports/

## Issues Found
- The primary `docker run` example was not valid shell because it placed an inline comment after a line-continuation backslash. I moved the commentary off the continued line so the command is executable.
- The post used legacy HTTP access on port `9000` as the main path. Current Portainer install docs default to HTTPS on `9443`, with `9000` only needed for legacy HTTP access. I updated the server, API, and Compose examples to use `9443` and HTTPS.
- The post used `latest` image tags. Current Portainer install docs use release-channel tags. I updated the examples to `:sts` for both Portainer Server and the Edge Agent.
- The Edge environment creation steps implied the tunnel server address field is always configurable in the UI. Current docs show that explicit tunnel address field is only available in Portainer Business Edition. I qualified that step accordingly.
- The Edge Agent deployment example treated `EDGE_INSECURE_POLL=1` as mandatory. Portainer documents it as required only when the Portainer server uses a self-signed TLS certificate. I corrected the example to make it conditional.
- The Edge Groups API example used lowercase JSON fields. The official API schema uses `Name`, `Dynamic`, and `Endpoints`. I corrected the payload.
- The async-mode section was inaccurate. Portainer documents Edge Agent Async as a separate deployment mode, not a toggle on an existing standard Edge environment, and it is only available in Business Edition. I corrected the workflow and noted that async mode does not use port `8000`.
- The Edge Jobs API example used the wrong endpoint and request body. The official CE API uses `POST /api/edge_jobs/create/string` with `FileContent`, and a recurring schedule should include `Recurring: true`. I corrected the endpoint and payload.
- The Edge Jobs section did not mention the documented platform restriction. Portainer currently documents Edge Jobs as available for Docker Standalone edge environments that use `/etc/cron.d`. I added that constraint.
- The original conclusion said port `8000` should always be exposed. That is true for standard Edge Agent tunnels, but not for Edge Agent Async mode. I narrowed the statement so it matches the current documentation.

## Review Notes
- Portainer currently documents both `sts` and `lts` release channels. The examples are now internally consistent on `sts`, but any future edits should keep Portainer Server and Edge Agent tags aligned to the same release channel.
- Portainer generates a self-signed certificate on `9443` by default, so command-line API examples need `-k` unless the certificate is trusted by the client.
