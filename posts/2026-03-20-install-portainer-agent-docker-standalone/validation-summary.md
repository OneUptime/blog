# Validation Summary: How to Install Portainer Agent on Docker Standalone

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Agent
- Portainer API
- Docker
- Docker Compose
- cURL

## Sources Consulted
- Portainer Documentation: Install Portainer Agent on Docker Standalone — https://docs.portainer.io/admin/environments/add/docker/agent
- Portainer Documentation: Add an environment via the Portainer API — https://docs.portainer.io/admin/environments/add/api
- Portainer Documentation: Accessing the Portainer API — https://docs.portainer.io/api/access
- Portainer Documentation: How does Portainer secure connectivity to and from Agents and Edge Agents? — https://docs.portainer.io/faqs/getting-started/how-does-portainer-secure-connectivity-to-and-from-agents-and-edge-agents
- Docker Docs: Version and name top-level elements — https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: docker container run — https://docs.docker.com/reference/cli/docker/container/run/
- Portainer source: `endpoint_create.go` in the official Portainer repository — https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/endpoints/endpoint_create.go
- Portainer source: `version.go` in the official Portainer repository — https://raw.githubusercontent.com/portainer/portainer/develop/api/agent/version.go
- Portainer source: agent Linux Dockerfile in the official Portainer Agent repository — https://raw.githubusercontent.com/portainer/agent/develop/build/linux/Dockerfile

## Issues Found
- The Docker Compose example used the top-level `version: "3.8"` key, which Docker now documents as obsolete. I removed it to match the current Compose specification.
- The Portainer API example for creating an agent environment used a JSON body. Portainer’s current handler expects `multipart/form-data` for `/api/endpoints`, so I replaced the request with `--form` fields.
- The API example omitted the TLS fields Portainer requires for standard agent environments. I added `TLS=true`, `TLSSkipVerify=true`, and `TLSSkipClientVerify=true` so the example matches how Portainer connects to the agent over HTTPS with the agent’s self-signed certificate.
- The `AGENT_SECRET` section implied that configuring the agent alone, or entering a UI field, was sufficient. Portainer documents that the same `AGENT_SECRET` must also be set on the Portainer Server container, so I corrected that guidance.
- The verification section referred to container “health” even though the official agent image does not define a Docker `HEALTHCHECK`, and it only checked whether port `9001` was open. I changed this to a status check plus an HTTPS request to the agent’s `/ping` endpoint, which Portainer itself uses to identify the agent.

## Review Notes
- Portainer documents Docker Standalone with the Portainer Agent as a legacy option and recommends the Edge Agent for most new deployments.
