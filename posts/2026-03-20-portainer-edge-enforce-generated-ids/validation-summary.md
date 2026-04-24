# Validation Summary: How to Enforce Portainer-Generated Edge IDs - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Portainer Edge Agent
- Portainer HTTP API
- Docker
- Bash

## Sources Consulted
- Portainer docs: Edge Agent overview - https://docs.portainer.io/advanced/edge-agent
- Portainer docs: API documentation index - https://docs.portainer.io/api/docs
- Portainer docs: Install Edge Agent Standard on Docker Standalone - https://docs.portainer.io/admin/environments/add/docker/edge
- Portainer docs: Updating the Edge Agent - https://docs.portainer.io/start/upgrade/edge
- Portainer docs: Edge Compute settings - https://docs.portainer.io/2.21/admin/settings/edge
- Portainer docs: Auto onboarding - https://docs.portainer.io/2.27/admin/environments/aeec
- Portainer source: settings update payload and `EnforceEdgeID` field - https://github.com/portainer/portainer/blob/develop/api/http/handler/settings/settings_update.go
- Portainer source: endpoint creation handler and edge environment creation flow - https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_create.go
- Portainer source: current UI note that enforcement applies only to manually created environments - https://github.com/portainer/portainer/blob/develop/app/react/portainer/settings/EdgeComputeView/EdgeComputeSettings/EdgeComputeSettings.tsx
- Portainer agent source: Edge agent environment variables and polling behavior - https://github.com/portainer/agent/blob/develop/README.md

## Issues Found
- The `POST /api/endpoints` examples were incorrect. Portainer’s current endpoint-creation API expects `multipart/form-data` fields such as `Name`, `EndpointCreationType`, `URL`, and `ContainerEngine`, not a JSON body with lowercase keys. I updated both API examples accordingly.
- The pre-registration examples omitted the required `URL` field and did not specify `ContainerEngine=docker`, which would not correctly create a Docker Edge environment. I added both fields.
- The response parsing examples used unquoted `echo $NEW_ENV` and `echo $RESPONSE`, which can corrupt JSON in shell pipelines. I changed these to `printf '%s' "$..."`.
- The Docker deployment command was not aligned with Portainer’s documented Edge Agent deployment. It was missing `--restart always`, `-v /:/host`, and `-v portainer_agent_data:/data`, included an unsupported `/var/run/portainer` mount, and had a broken inline comment after a line-continuation backslash. I corrected the command.
- The article used `portainer/agent:latest`, which can drift from the Portainer Server version. I changed the example to `portainer/agent:lts` and clarified that the agent tag should match the Portainer Server version.
- The article claimed the enforcement setting affected auto-onboarding by overriding agent-supplied IDs. Current Portainer docs/source indicate the setting applies only to manually created environments, while auto-onboarding continues to use an agent-generated Edge ID. I rewrote that section and qualified broader claims elsewhere in the post.

## Review Notes
- `EnforceEdgeID` is a Portainer Business Edition feature and, in the current UI, is explicitly described as applying only to manually created environments.
- Self-signed Portainer deployments require `EDGE_INSECURE_POLL=1`, and deployments using a custom `AGENT_SECRET` must pass the same secret to the Edge Agent. These are situational requirements documented by Portainer, so I did not force them into the main examples.
