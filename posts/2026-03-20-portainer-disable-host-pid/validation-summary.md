# Validation Summary: How to Disable Host PID Access for Non-Admin Users in Portainer (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker API
- Docker Compose
- Bash
- `curl`
- `jq`

## Sources Consulted
- Portainer Host Setup docs: https://docs.portainer.io/user/docker/host/setup
- Portainer Swarm Setup docs: https://docs.portainer.io/user/docker/swarm/setup
- Portainer Docker security policy docs: https://docs.portainer.io/admin/environments/policies/docker-policies/security-policy
- Portainer API docs overview: https://docs.portainer.io/api/docs
- Portainer official source: endpoint settings update payload and field names: https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_settings_update.go
- Portainer official source: endpoint security settings and defaults: https://github.com/portainer/portainer/blob/develop/api/portainer.go
- Portainer official source: Docker container creation enforcement for host PID and related restrictions: https://github.com/portainer/portainer/blob/develop/api/http/proxy/factory/docker/containers.go
- Portainer official source: stack/Compose validation for `pid: "host"`: https://github.com/portainer/portainer/blob/develop/api/stacks/stackutils/validation.go
- Portainer official source: Docker proxy API description: https://github.com/portainer/portainer/blob/develop/api/api-description.md
- Docker Compose services reference (`pid`): https://docs.docker.com/reference/compose-file/services/
- Docker `docker run` reference (`--pid`): https://docs.docker.com/reference/cli/docker/container/run/
- Docker Compose version top-level element reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker user namespace remap limitations (`--pid=host`): https://docs.docker.com/engine/security/userns-remap/

## Issues Found
- The Portainer API examples used nonexistent `disable...` payload fields such as `disableHostPidForRegularUsers`. I changed them to Portainer’s actual `allow...` fields, for example `allowHostNamespaceForRegularUsers: false`, based on the official endpoint settings payload and security settings model.
- The UI navigation and wording were inaccurate. I corrected the instructions to use the documented `Host > Setup` or `Swarm > Setup` path and the `Docker Security Settings` section, and updated the save action to `Save configuration`.
- The post implied the restriction was purely opt-in. I corrected the introduction to note that Portainer enables this restriction by default for new environments.
- The Compose-related claim used the wrong field name. I changed the text from Docker API-style `PidMode` wording in Compose to the actual Compose field `pid: "host"`.
- The multi-environment automation example filtered only environment types `1` and `2` while claiming to cover all Docker environments. I updated it to include type `4` as well, matching Portainer’s Docker, Agent, and Edge Agent Docker environment types.
- The automation examples referenced a nonexistent Portainer host-network restriction field. I removed those references and replaced them with real Portainer security settings such as stack management, container capabilities, and `security-opt`.
- The Compose sample included the obsolete top-level `version` key. I removed it to match current Docker Compose guidance.
- The “monitor logs” section relied on speculative log-grep behavior. I replaced it with a concrete non-admin validation request through Portainer’s Docker proxy API and the expected `HTTP 403` result.
- The “legitimate use cases” examples used fragile or incomplete commands. I replaced them with simpler Docker-valid host PID examples.
- The conclusion referenced host-network restrictions that this Portainer settings API does not provide. I updated the conclusion to reference the actual Portainer restrictions that were verified.

## Review Notes
- These restrictions are enforced for actions performed through Portainer. They do not protect a system from users who already have direct access to the Docker socket, Docker API, or the host itself.
- Portainer’s Docker proxy path under `/api/endpoints/{id}/docker` is an official Portainer capability, but it is described in Portainer’s source/API description rather than fully expanded in the public Swagger UI.
