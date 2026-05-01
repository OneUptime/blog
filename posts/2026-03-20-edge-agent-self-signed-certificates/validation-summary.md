# Validation Summary: How to Configure Edge Agent with Self-Signed Certificates

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer Edge Agent
- Portainer API
- Docker
- Windows named pipe Docker mounts
- TLS / self-signed certificates

## Sources Consulted
- Portainer standard Edge Agent installation on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/edge
- Portainer async Edge Agent installation on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/edge-async
- Portainer API guide for adding environments: https://docs.portainer.io/admin/environments/add/api
- Portainer API specification (BE 2.39.1): https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Portainer Edge Agent architecture and behavior: https://docs.portainer.io/2.27/advanced/edge-agent
- Portainer Edge Agent update guidance and version-matching note: https://docs.portainer.io/start/upgrade/edge
- Portainer ARM support FAQ: https://docs.portainer.io/faqs/installing/which-arm-architectures-does-portainer-support
- Portainer Agent repository README (environment variables and Edge behavior): https://github.com/portainer/agent
- Docker `docker run` reference: https://docs.docker.com/reference/cli/docker/container/run/

## Issues Found
- The post described Edge Agent traffic as outbound WSS on port `8000`. Current Portainer documentation shows standard Edge deployments poll the Portainer API over HTTPS on `9443` and use port `8000` for the secure tunnel, while async mode uses only the API/UI port. I corrected the diagram and explanation.
- The API example for creating an Edge environment was not valid for current Portainer. It used a JSON body, but Portainer documents `POST /api/endpoints` as multipart form data. It also omitted the Portainer URL seen by the agent, the tunnel server address used for standard-mode Edge tunnels, and the Docker container engine, and it did not capture the returned `EdgeKey` / `EdgeID` values needed by the later `docker run` commands. I replaced it with a working multipart example and extracted `EDGE_KEY` and `EDGE_ID`.
- The standard-mode installation example set `EDGE_INSECURE_POLL=0`, which would fail against a Portainer server using a self-signed certificate. Portainer’s documentation requires `EDGE_INSECURE_POLL=1` for this scenario. I corrected that value.
- The async example omitted the self-signed certificate flag and used interval environment variables that are not part of Portainer’s generated Edge Agent deployment command. I removed those unsupported variables, added `EDGE_INSECURE_POLL=1`, and noted that async mode is a Portainer Business Edition feature.
- The Windows example did not match Portainer’s generated Windows deployment command. It used an incomplete named-pipe mount and omitted the data mounts required by the agent. I replaced it with the documented Windows PowerShell form using `--mount` for the Docker named pipe, Docker volumes path, and agent data volume.
- The examples used `portainer/agent:latest`, but Portainer’s update guidance says the agent version should match the Portainer Server version/channel. I aligned the examples to the documented LTS channel example.

## Review Notes
- The corrected examples now match current Portainer documentation as of 2026-05-01. If the deployment uses STS or an exact pinned version instead of LTS, the agent image tag should be changed to the matching Portainer Server version/channel.
- The article’s self-signed certificate approach is now aligned with Portainer’s documented `EDGE_INSECURE_POLL=1` behavior. Portainer also documents mTLS-based options for stricter certificate validation, but that is a different setup path.
- Docker commands were validated against official Portainer documentation, the published Portainer API spec, and Portainer’s generated script/source references. They were not executed in a live Portainer environment during this review.
