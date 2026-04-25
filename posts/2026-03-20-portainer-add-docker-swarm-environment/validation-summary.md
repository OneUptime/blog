# Validation Summary: How to Add a Docker Swarm Environment to Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer CE
- Docker Swarm
- Portainer Agent
- Portainer HTTP API
- Docker Swarm stack YAML
- `curl`
- Python 3

## Sources Consulted
- Portainer CE Swarm install docs: https://docs.portainer.io/sts/start/install-ce/server/swarm/linux
- Portainer Swarm agent docs: https://docs.portainer.io/admin/environments/add/swarm/agent
- Portainer Swarm socket docs: https://docs.portainer.io/admin/environments/add/swarm/socket
- Portainer add environment via API docs: https://docs.portainer.io/admin/environments/add/api
- Portainer API docs: https://docs.portainer.io/api/docs
- Portainer CE 2.39.1 OpenAPI spec: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Official Portainer CE Swarm stack manifest: https://downloads.portainer.io/ce2-39/portainer-agent-stack.yml
- Docker Swarm stack deploy docs: https://docs.docker.com/engine/swarm/stack-deploy/
- Portainer Agent repository README: https://github.com/portainer/agent/blob/master/README.md
- Portainer Agent source (`cmd/agent/main.go`): https://github.com/portainer/agent/blob/master/cmd/agent/main.go

## Issues Found
- The recommended in-Swarm deployment used a direct Docker socket mount on the manager node. Current Portainer Swarm installation guidance deploys Portainer Server together with the Portainer Agent; direct Swarm socket connections are documented as a legacy option. I updated the stack example to use the agent-backed Swarm deployment.
- The external agent stack did not publish port `9001`, which would prevent an external Portainer Server from reaching the agent correctly. I updated the stack to publish `9001` in host mode.
- The API authentication example used lowercase `username` and `password` fields. Current Portainer API documentation uses `Username` and `Password`. I corrected the request body.
- The API environment-creation example used a JSON payload with lowercase field names. Current Portainer API documentation defines `POST /api/endpoints` as `multipart/form-data` for this operation, with fields such as `Name`, `EndpointCreationType`, `URL`, `TLS`, `TLSSkipVerify`, and `TLSSkipClientVerify`. I replaced the example with a valid `curl -F` request.
- The verification snippet incorrectly stated that `Type=2` means "Docker Swarm". In the current Portainer API, `Type=2` means an agent-backed Docker environment. Swarm detection is reflected in the snapshot data via the `Swarm` field. I updated the verification snippet to check the snapshot instead.
- The conclusion said the standard agent approach is required when the Swarm is behind a firewall or in a different network. Current Portainer docs recommend using the Edge Agent in that scenario. I corrected that statement.

## Review Notes
- The examples now pin Portainer to `2.39.1` to match the current official docs reviewed on 2026-04-25. Future revalidation should refresh the image tags if Portainer updates its recommended version.
- Docker’s official documentation notes that `docker stack deploy` uses the legacy Compose file version 3 format, so the stack snippets remain in Swarm-compatible Compose syntax.
- Docker was not installed in the review environment, so command validation was documentation-based rather than executed locally.
