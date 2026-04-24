# Validation Summary: How to Set Up Docker Security Policies in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer CE / BE
- Portainer HTTP API
- Docker Engine
- Docker daemon configuration (`daemon.json`)
- Bash
- `curl`
- `jq`
- Portainer App Templates

## Sources Consulted
- Portainer Host Setup: https://docs.portainer.io/user/docker/host/setup
- Portainer Swarm Setup: https://docs.portainer.io/user/docker/swarm/setup
- Portainer Policies overview: https://docs.portainer.io/admin/environments/policies
- Portainer Docker security policy docs: https://docs.portainer.io/admin/environments/policies/docker-policies/security-policy
- Portainer registry management: https://docs.portainer.io/admin/registries
- Portainer environment registry access: https://docs.portainer.io/user/docker/host/registries
- Portainer settings and App Templates UI: https://docs.portainer.io/admin/settings/general
- Portainer App template JSON format: https://docs.portainer.io/advanced/app-templates/format
- Portainer API access: https://docs.portainer.io/api/access
- Portainer API docs landing page: https://docs.portainer.io/api/docs
- Portainer CE 2.39.1 API spec: https://api-docs.portainer.io/?edition=ce&version=2.39.1
- Docker `dockerd` reference: https://docs.docker.com/reference/cli/dockerd/
- Docker user namespace remapping: https://docs.docker.com/engine/security/userns-remap/
- Docker seccomp guidance: https://docs.docker.com/engine/security/seccomp/

## Issues Found
- The post overstated Portainer's enforcement scope as applying to all deployments and users. I corrected the introduction and conclusion to reflect that these Docker security settings apply to non-administrator users, and that BE policies are a separate feature for supported Edge Agent environment groups.
- The "Available Security Policies" table listed unsupported or undocumented controls such as host network restriction, public-image restriction, and required image signing. I replaced those with controls Portainer currently documents, including stack management and container capabilities restrictions.
- The UI navigation in Step 1 was inaccurate. I updated it to the documented `Host -> Setup` or `Swarm -> Setup` path and pointed readers to the `Docker Security Settings` section.
- The Step 2 API example used incorrect field names (`disable...`) and bearer-token authentication. I replaced it with the documented `allow...` payload fields and the `X-API-Key` header used for Portainer API access.
- The Step 3 registry section used an incorrect `/api/settings` payload unrelated to registry control. I rewrote the section to match Portainer's documented registry workflows and used the documented `/api/settings/default_registry` endpoint for hiding anonymous Docker Hub in the UI.
- The original registry section implied Portainer could fully block Docker Hub pulls. I added the official caveat that hiding anonymous Docker Hub in Portainer does not fully disable Docker Hub access because anonymous access is built into Docker.
- The App Templates example was not in the documented Portainer template wrapper format. I changed it to use the `version` and `templates` wrapper object and corrected the upload location to `Settings -> General -> App Templates`.
- The `daemon.json` snippet contained comments, which are invalid JSON, and it treated a custom seccomp profile like a generic default. I converted the example to valid JSON and added the documented `dockerd --validate` step before restart.
- The audit script used the wrong auth header, unquoted shell expansions, and a piped `while` loop that prevented the `VIOLATIONS` counter from being preserved. I fixed the header, quoting, loop structure, and final output.
- The YAML policy template included unsupported Portainer concepts such as `host_network` and `image_signing`. I replaced them with supported Portainer-oriented controls like `stack_management` and `container_capabilities`.

## Review Notes
- `userns-remap` is supported and documented, but Docker recommends enabling it carefully, ideally on new installations, because it changes ownership mappings for container data.
- Docker already includes a default seccomp profile. A custom seccomp profile should only be configured when you have a reviewed profile to provide.
- Portainer BE policies are only available in Business Edition and currently apply to supported Edge (Standard) Agent environments, not every Portainer-managed environment type.
