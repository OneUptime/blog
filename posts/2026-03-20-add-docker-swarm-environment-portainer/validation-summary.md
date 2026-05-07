# Validation Summary: How to Add a Docker Swarm Environment to Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Swarm
- Portainer HTTP API
- `curl`

## Sources Consulted
- Portainer Documentation: Add a Docker Swarm environment - https://docs.portainer.io/admin/environments/add/swarm
- Portainer Documentation: Install Portainer Agent on Docker Swarm - https://docs.portainer.io/admin/environments/add/swarm/agent
- Portainer Documentation: Connect to the Docker API for Docker Swarm - https://docs.portainer.io/admin/environments/add/swarm/api
- Portainer Documentation: Add an environment via the Portainer API - https://docs.portainer.io/admin/environments/add/api
- Portainer Documentation: API documentation - https://docs.portainer.io/api/docs
- Portainer source: `endpoint_create.go` - https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_create.go
- Portainer source: `portainer.go` endpoint enums and status fields - https://github.com/portainer/portainer/blob/develop/api/portainer.go

## Issues Found
- The UI instructions were too generic for a Docker Swarm environment. I updated them to match Portainer's documented Swarm flow: select `Docker Swarm`, start the wizard, then choose `Agent`, `API`, or local `Socket`.
- The API example posted JSON to `/api/endpoints`, but Portainer's current endpoint creation API expects `multipart/form-data`. I changed the request to use `curl --form`, matching Portainer's documented and implemented API contract.
- The API example targeted `unix:///var/run/docker.sock`, which adds a local Docker socket connection rather than an existing Swarm manager reachable over the network. I changed it to a Swarm manager Docker API URL (`tcp://swarm-manager.example.com:2375`) so the example aligns with the post's stated goal.
- The reference table used incorrect and outdated numeric values, and it described them as environment types rather than endpoint creation types. I corrected the section title and updated the values to the current `EndpointCreationType` enum used by Portainer (`1` through `5`).
- The verification text said the environment should appear "healthy", while the API returns numeric environment status values that map to up/down. I changed the wording to "online" to match the status check shown in the example.

## Review Notes
- Portainer documents Docker API and socket connections for Swarm as legacy options and recommends the Agent or Edge Agent for most use cases.
- The `Status` field returned by `GET /api/endpoints` is currently `1` for up and `2` for down in Portainer's source, so the post's online/offline check is reasonable.
- The external links in the post were reachable at review time.
