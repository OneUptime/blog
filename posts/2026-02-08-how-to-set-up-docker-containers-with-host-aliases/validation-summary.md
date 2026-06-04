# Validation Summary: How to Set Up Docker Containers with Host Aliases

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine
- Docker CLI
- Docker Compose
- Container networking
- Linux `/etc/hosts` and name resolution
- IPv4 and IPv6 host mappings

## Sources Consulted
- Docker CLI reference for `docker container run` and `--add-host`: https://docs.docker.com/reference/cli/docker/container/run/
- Docker daemon reference for `host-gateway`: https://docs.docker.com/reference/cli/dockerd/
- Docker Compose networking how-to for `extra_hosts` and `host-gateway`: https://docs.docker.com/compose/how-tos/networking/
- Docker Compose file reference for `extra_hosts`: https://docs.docker.com/reference/compose-file/services/#extra_hosts
- Compose Specification for `extra_hosts`: https://compose-spec.github.io/compose-spec/spec.html#extra_hosts
- Docker Desktop networking how-to for `host.docker.internal`: https://docs.docker.com/desktop/features/networking/networking-how-tos/
- Local Docker CLI help for `docker run --add-host`

## Issues Found
- The post described `host-gateway` as a special hostname. Docker documents `host-gateway` as a special value for `--add-host` that resolves to the host gateway IP. Updated the wording to avoid implying that `host-gateway` is itself an automatically resolvable hostname.
- The Compose section said `extra_hosts` follows only the `"hostname:ip"` format. That format is supported, but the Compose specification prefers `"hostname=ip"`. Added a note that both are supported and `=` is preferred.
- The IPv6 example used `ping6` against the documentation address `2001:db8::1`. That address is reserved for documentation and will not normally be reachable, so the command could fail even when the alias is correctly added. Changed the example to inspect `/etc/hosts` instead.

## Review Notes
The remaining examples and explanations are technically consistent with current Docker documentation. Some examples use placeholder images, domains, and documentation IP ranges, so they are illustrative rather than directly runnable without substituting real services or reachable addresses.
