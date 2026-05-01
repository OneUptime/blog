# Validation Summary: How to Fix 'Custom Registry Credentials Ignored' in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker registries
- Docker CLI (`docker login`)
- Docker daemon configuration (`daemon.json`, `dockerd`)
- Portainer HTTP API
- `curl`
- `jq`

## Sources Consulted
- Portainer registries access for Docker environments: https://docs.portainer.io/user/docker/host/registries
- Portainer custom registry setup: https://docs.portainer.io/admin/registries/add/custom
- Portainer stack deployment and registry selection: https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer API access documentation: https://docs.portainer.io/api/access
- Portainer API documentation index: https://docs.portainer.io/api/docs
- Portainer source for registry matching: https://github.com/portainer/portainer/blob/develop/api/docker/images/registry.go
- Portainer source for stack deployment registry handling: https://github.com/portainer/portainer/blob/develop/api/stacks/deployments/deploy.go
- Portainer source for registry list endpoint: https://github.com/portainer/portainer/blob/develop/api/http/handler/registries/registry_list.go
- Portainer source for registry JSON fields: https://github.com/portainer/portainer/blob/develop/api/portainer.go
- Docker CLI reference for `docker login`: https://docs.docker.com/reference/cli/docker/login/
- Docker daemon reference for insecure registries: https://docs.docker.com/reference/cli/dockerd/

## Issues Found
- The post described registry assignment using `Environments > Edit > Registries`, but current Portainer documentation manages registry access from the environment view itself (`Host` or `Swarm` > `Registries` > `Manage access`). I updated the steps accordingly and clarified that this matters for non-admin users.
- The draft said Portainer "matches only by hostname", which is too strong for current Portainer behavior. I corrected the explanation to focus on the registry host and port used by the image reference, and I removed the unsupported claim about re-assignment after environment creation.
- The original Fix 3 section was an invalid `bash` snippet and duplicated the port-mismatch point. I replaced it with current Portainer guidance about explicitly selecting the intended registry during stack deployment when multiple similar registries exist, while keeping the port note inline.
- The `docker login` example used literal `<your-username>` and `<your-password>` placeholders in a shell command, which would not run correctly if copied as-is. I changed it to a working `--password-stdin` example using environment variables.
- The `daemon.json` example included a JavaScript-style comment inside a `json` code block, which is invalid JSON. I removed the comment from the snippet.
- The Portainer API example used legacy HTTP on port `9000`, used the wrong header style for an access token example, and queried lower-case JSON fields that do not match Portainer's registry response schema. I corrected the command to current HTTPS `9443` usage with `X-API-Key` and the proper `jq` field names.

## Review Notes
- The guide remains technically relevant for current Portainer releases, but the registry-access UI and deployment behavior are better described by the current 2.39/2.40 docs than by older environment-edit flows.
- Portainer's current documentation says stack deployments use all configured registries by default, and explicitly selecting the target registry can avoid credential mix-ups when multiple registries share the same provider or host.
- Docker's `insecure-registries` setting should be treated as a last resort for HTTP or untrusted-cert registries. When possible, trusting the registry CA is the safer option.
