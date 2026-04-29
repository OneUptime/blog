# Validation Summary: How to List and Manage Environments via the Portainer API

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer REST API
- Docker
- Portainer Agent
- Kubernetes
- Bash
- `curl`
- `jq`

## Sources Consulted
- Portainer API documentation: https://docs.portainer.io/api/docs
- Add an environment via the Portainer API: https://docs.portainer.io/admin/environments/add/api
- Environments: https://docs.portainer.io/admin/environments/environments
- Install Portainer Agent on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/agent
- Install Portainer Agent on Docker Swarm: https://docs.portainer.io/admin/environments/add/swarm/agent
- Portainer CE 2.39.1 OpenAPI spec: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer 2.39.1 `endpoint_create.go`: https://github.com/portainer/portainer/blob/2.39.1/api/http/handler/endpoints/endpoint_create.go
- Portainer 2.39.1 `endpoint_update.go`: https://github.com/portainer/portainer/blob/2.39.1/api/http/handler/endpoints/endpoint_update.go
- Portainer 2.39.1 `endpointgroup_list.go`: https://github.com/portainer/portainer/blob/2.39.1/api/http/handler/endpointgroups/endpointgroup_list.go
- Portainer 2.39.1 environment creation client: https://github.com/portainer/portainer/blob/2.39.1/app/react/portainer/environments/environment.service/create.ts
- Portainer 2.39.1 Kubernetes configure form submit logic: https://github.com/portainer/portainer/blob/2.39.1/app/react/kubernetes/cluster/ConfigureView/ConfigureForm/handleSubmitConfigureCluster.ts

## Issues Found
- The remote Docker TLS creation example used incorrect multipart field names for certificate uploads. I changed `TLSCACert`, `TLSCert`, and `TLSKey` to `TLSCACertFile`, `TLSCertFile`, and `TLSKeyFile` to match Portainer's documented API and request parser.
- The Portainer Agent example used `https://...:9001` and omitted the TLS flags Portainer expects for agent environments. I changed it to `tcp://...:9001` and added `TLS=true`, `TLSSkipVerify=true`, and `TLSSkipClientVerify=true`, matching Portainer's current API behavior.
- The Kubernetes security update example sent only a partial `Kubernetes.Configuration` object. Portainer's update handler replaces the full `Kubernetes` object, so that example could overwrite unrelated Kubernetes settings. I replaced it with a read-modify-write example that fetches the existing environment, edits the configuration with `jq`, and sends the full `Kubernetes` object back.
- The environment-group listing example referenced `.Endpoints`, but `/api/endpoint_groups` returns `EndpointGroup` objects that do not include an `Endpoints` array. I changed the example to output fields that actually exist: `Id`, `Name`, and `TagIds`.
- The health-check example treated every non-`1` status as `down`. I changed the fallback to `unknown` so the example does not mislabel the API's zero/default enum value.
- The automation example incorrectly described new Docker Swarm workers as separate Portainer environments. Portainer's official Swarm guidance says not to add each node individually. I rewrote the script to onboard standalone Docker hosts via the Portainer Agent instead, added the required TLS flags, added the `/host` bind mount used by Portainer's deployment command, and replaced `portainer/agent:latest` with a versioned `AGENT_VERSION` variable.

## Review Notes
- Validated against Portainer CE 2.39.1 LTS documentation and the official 2.39.1 source tree on 2026-04-29.
- Portainer's current documentation treats the classic Portainer Agent as a legacy option and recommends the Edge Agent for most new deployments, but the classic Agent examples in this post remain valid when used intentionally.
- Portainer recommends matching the Portainer Agent version to the Portainer Server version. The automation example now exposes `AGENT_VERSION` for that reason.
- Portainer's generated OpenAPI schema names the update payload field `TagIDs`, while Portainer's own frontend sends `TagIds`. The server accepts the frontend form, so the post's JSON update example was left in the `TagIds` style for consistency with current UI-generated requests.
