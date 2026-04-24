# Validation Summary: How to Connect Portainer to a Podman Socket - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Podman
- Podman API service
- systemd socket activation
- Portainer Agent
- Linux container management

## Sources Consulted
- Podman `podman-system-service` documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman API reference index: https://docs.podman.io/en/latest/Reference.html
- Portainer Podman support FAQ: https://docs.portainer.io/faqs/installing/does-portainer-support-podman
- Portainer Add a Podman environment: https://docs.portainer.io/admin/environments/add/podman
- Portainer Connect to the Podman Socket: https://docs.portainer.io/admin/environments/add/podman/socket
- Portainer Install Portainer Agent on Podman: https://docs.portainer.io/admin/environments/add/podman/agent
- Portainer Install Portainer CE with Podman on Linux: https://docs.portainer.io/start/install-ce/server/podman/linux

## Issues Found
- The prerequisites overstated support by saying `Podman 4.0+` and implying rootful/rootless Podman were both supported. Updated this to match Portainer's current documented support: Podman 5 on CentOS Stream 9 in rootful mode, with rootless Podman noted as potentially workable but not officially supported.
- The socket API examples used Docker API `v1.44`, but Podman's documented Docker compatibility layer targets Docker API `v1.40`. Updated the examples to use `v1.40`.
- The original direct Portainer deployment used `docker run`, which conflicts with Portainer's documented Podman deployment guidance and with Portainer's limitation around mixing Docker-based Portainer server installs with Podman socket environments. Replaced it with Portainer's current `podman run` deployment pattern, including `--privileged`, the correct ports, and the `lts` image tag.
- The original `docker run` example also had a shell syntax error: a trailing line-continuation backslash followed by an inline comment. Removed that invalid construct as part of the command correction.
- The remote Podman section instructed readers to expose the Podman API on raw TCP port `2375` and add it as a `Docker Standalone` environment. Replaced this with guidance aligned to Portainer's Podman docs and Podman's security guidance: direct socket access is local-only, and remote hosts should use Portainer Agent or Edge Agent instead of an unauthenticated TCP endpoint.
- The Portainer Agent example mounted the wrong storage path and used a floating `latest` tag. Updated it to use `/var/lib/containers/storage/volumes:/var/lib/docker/volumes`, `portainer/agent:lts`, `--privileged`, and noted the `AGENT_SECRET` requirement when applicable.
- The version-inspection example queried `.Components[0].Version`, which does not match Podman's documented `podman version` JSON shape reliably. Updated it to a safer `jq '.Version // .Server.Version'` expression.
- The conclusion overstated the integration as simple socket remapping with mostly transparent behavior. Revised it to reflect the actual documented connection patterns and current Portainer support limitations.

## Review Notes
- Portainer's Podman socket and Agent pages both mark those connection methods as legacy and recommend the Edge Agent for many use cases. The post is still technically valid after correction, but future updates may want to reflect that product guidance more prominently.
- Portainer's support matrix for Podman is currently narrow and version-specific, so this post should be rechecked if Portainer broadens Podman distro or rootless support in later releases.
