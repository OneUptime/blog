# Validation Summary: How to Configure the Agent Secret Between Portainer Server and Agent - Config

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Server
- Portainer Agent
- Portainer HTTP API
- Docker
- Docker Compose
- OpenSSL
- Python 3

## Sources Consulted
- Portainer docs: How does Portainer secure connectivity to and from Agents and Edge Agents? https://docs.portainer.io/faqs/getting-started/how-does-portainer-secure-connectivity-to-and-from-agents-and-edge-agents
- Portainer docs: Install Portainer Agent on Docker Standalone https://docs.portainer.io/admin/environments/add/docker/agent
- Portainer docs: Why have my agents stopped working after upgrading Portainer? https://docs.portainer.io/faqs/upgrading/why-have-my-agents-stopped-working-after-upgrading-portainer
- Portainer docs: API documentation https://docs.portainer.io/api/docs
- Portainer Agent source: README https://github.com/portainer/agent/blob/develop/README.md
- Portainer Server source: endpoint creation handler https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_create.go
- Portainer Server source: endpoint update handler https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_update.go
- Portainer Server source: server startup and `AGENT_SECRET` handling https://github.com/portainer/portainer/blob/develop/api/cmd/portainer/main.go

## Issues Found
- The introduction incorrectly stated that the Portainer Agent accepts connections from any Portainer server by default. I corrected this to Portainer's documented claim-first behavior and clarified that `AGENT_SECRET` must be set on both the Portainer Server and the agent.
- The post incorrectly instructed readers to enter an agent secret in the environment connection settings. I corrected this to the current model where `AGENT_SECRET` is configured on the Portainer Server container itself, not per environment in the UI.
- The API example used JSON with lowercase field names and an `AgentSecret` property that is not part of the current endpoint create or update payload. I replaced it with a current multipart form example using `Name`, `EndpointCreationType`, `URL`, `TLS`, `TLSSkipVerify`, and `TLSSkipClientVerify`.
- The rotation section incorrectly updated `/api/endpoints/{id}` with `AgentSecret`. I corrected this to rotating the secret by recreating the agent and Portainer Server with the same new `AGENT_SECRET` value.
- The log-grep verification example was not a reliable or documented way to validate secret authentication. I replaced it with a reachability check for `/ping` and clarified that successful Portainer-to-agent connection is the actual secret validation.
- The conclusion implied the secret should be unique per environment. I corrected this to reflect Portainer's current server-global `AGENT_SECRET` behavior for agents managed by the same Portainer instance.

## Review Notes
- Portainer's current docs describe the Docker Standalone agent as a legacy option and recommend the Edge Agent for many use cases.
- The local review environment did not have the `docker` CLI installed, so command verification was done against Portainer's official docs and source rather than live local execution.
