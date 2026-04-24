# Validation Summary: How to Deploy Stacks to Podman via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Podman
- Docker Compose / Compose format
- `podman compose`
- SELinux
- Rootless and rootful container execution

## Sources Consulted
- Portainer FAQ: Does Portainer support Podman? — https://docs.portainer.io/faqs/installing/does-portainer-support-podman
- Portainer Docs: Add a Podman environment — https://docs.portainer.io/admin/environments/add/podman
- Portainer Docs: Install Portainer with Podman on Linux — https://docs.portainer.io/sts/start/install/server/podman/linux
- Portainer Docs: Add a new stack — https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer Docs: Inspect or edit a stack — https://docs.portainer.io/2.33-lts/user/docker/stacks/edit
- Portainer release notes / known Podman limitations — https://docs.portainer.io/release-notes
- Podman Docs: `podman compose` / `podman-compose(1)` — https://docs.podman.io/en/latest/markdown/podman-compose.1.html
- Podman Docs: `podman system service` — https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman Docs: `--userns=mode` — https://docs.podman.io/en/v4.4/markdown/options/userns.container.html
- Podman Docs: `podman network` — https://docs.podman.io/en/latest/markdown/podman-network.1.html
- Podman Docs: `podman network create` — https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman Docs: `podman volume create` — https://docs.podman.io/en/latest/markdown/podman-volume-create.1.html
- Podman Docs: `--security-opt` — https://docs.podman.io/en/v4.6.0/markdown/options/security-opt.html
- Podman Docs: `podman healthcheck` — https://docs.podman.io/en/latest/markdown/podman-healthcheck.1.html
- Podman Docs: `podman inspect` — https://docs.podman.io/en/latest/markdown/podman-inspect.1.html
- Docker Docs: Compose file `services` reference (`security_opt`) — https://docs.docker.com/reference/compose-file/services/
- Red Hat KB: Rootless Podman is unable to use host ports less than 1024 — https://access.redhat.com/solutions/7044059

## Issues Found
- The post implied broad Portainer-on-Podman support and listed `Podman 4.0+` as the requirement. I corrected this to Portainer's currently documented support boundary: Podman 5.x in rootful mode, with official support centered on CentOS Stream 9.
- The introduction and prerequisites implied that `podman-compose` is required for Portainer stack deployment. I corrected this so the compose provider is presented as optional for direct host-side `podman compose` usage, not as a Portainer prerequisite.
- The rootless example incorrectly stated that Podman uses `--userns=keep-id` for rootless containers. I removed that claim because Podman documents `host` as the default user namespace mode unless configured otherwise.
- The rootless networking explanation was outdated and misleading. I updated it to reflect current Podman behavior: rootless networking uses user-mode networking, current Podman defaults to `pasta`, and `slirp4netns` is also supported.
- The section on Podman pods incorrectly implied that Portainer would manage containers placed into a manually created Podman pod. I corrected this to describe manual pod creation as a separate Podman-native workflow.
- The volume-management example contained duplicate top-level `volumes:` keys in a single YAML block, which is invalid YAML. I split it into separate examples.
- The direct CLI examples used `podman-compose` commands. I updated them to use the officially documented `podman compose` wrapper.
- The healthcheck verification example depended on `jq` and did not use Podman's documented inspect formatting. I replaced it with `podman inspect --format '{{.State.Health.Status}}'`.

## Review Notes
- Portainer documentation as of April 24, 2026 still treats Podman support as limited: CentOS Stream 9, Podman 5.x, rootful mode. Other distros or rootless setups may work, but they are not the documented support target.
- Podman's rootless networking guidance changes over time; older material often assumes `slirp4netns` as the default, while current docs describe `pasta` as the default rootless networking tool.
