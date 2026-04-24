# Validation Summary: How to Set Up Log Rotation for Containers in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose / Compose files
- Docker `json-file` logging driver
- Docker `journald` logging driver
- systemd `journald`
- Bash

## Sources Consulted
- Docker Docs: Configure logging drivers - https://docs.docker.com/engine/logging/configure/
- Docker Docs: JSON File logging driver - https://docs.docker.com/engine/logging/drivers/json-file/
- Docker Docs: Journald logging driver - https://docs.docker.com/engine/logging/drivers/journald/
- Docker Docs: Define services in Docker Compose (`logging`) - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Deploy a stack to a swarm - https://docs.docker.com/engine/swarm/stack-deploy/
- Docker Docs: `docker service create` - https://docs.docker.com/reference/cli/docker/service/create/
- Portainer Docs: Add a new stack - https://docs.portainer.io/user/docker/stacks/add?fallback=true
- Portainer Docs: Inspect or edit a stack - https://docs.portainer.io/sts/user/docker/stacks/edit
- systemd manual: `journald.conf` - https://www.freedesktop.org/software/systemd/man/journald.conf.html
- systemd manual: `systemd.time` - https://www.freedesktop.org/software/systemd/man/systemd.time.html

## Issues Found
- The post described the `json-file` log path and `/etc/docker/daemon.json` location too broadly. I clarified both as Linux-host examples, and clarified the restart command as applying to systemd-based hosts, because the official Docker docs scope those paths and restart steps to Linux-style engine installations.
- The Compose example used a top-level `version: "3.8"` key. I removed it because current Compose documentation marks the top-level `version` field as obsolete and warns when it is used.
- The manual recreation example used `docker run ... my-container`, which is ambiguous/incorrect because the trailing token is interpreted as the image, not the container name. I corrected it to a valid self-contained example using `--name my-container`, `--log-driver json-file`, and the same log options shown elsewhere in the post.
- The expected `docker inspect` output omitted `"compress": "true"` even though the earlier `api` example explicitly configured `compress`. I added that field so the example matches the configuration being demonstrated.

## Review Notes
- Portainer stack behavior differs between Docker Standalone and Swarm. Portainer supports Compose-style stack files, and its update flow redeploys changed stack definitions. On Swarm, the underlying `docker stack deploy` flow still uses the legacy Compose v3 model, so readers should expect some Compose feature differences there.
- Docker currently recommends the `local` logging driver for many non-Kubernetes use cases because it rotates by default. This post remains technically valid as a `json-file` guide, which is still Docker's default logging driver.
- No other technical issues were found in the commands, YAML/JSON snippets, or journald retention example after the above corrections.
