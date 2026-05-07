# Validation Summary: How to Fix Podman Compose Compatibility Issues

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Podman
- podman-compose
- Docker Compose / Compose Specification
- systemd and Podman Quadlet
- YAML Compose files
- SELinux volume labels

## Sources Consulted
- Podman `podman system service` documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman `podman generate systemd` documentation: https://docs.podman.io/en/v5.2.5/markdown/podman-generate-systemd.1.html
- Podman Quadlet / `podman-systemd.unit` documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman `podman run` documentation for restart policies, SELinux labels, user namespaces, and volume behavior: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Docker Compose networking documentation: https://docs.docker.com/compose/how-tos/networking/
- Docker Compose networks reference: https://docs.docker.com/reference/compose-file/networks/
- Compose Specification for `env_file`, interpolation, profiles, `depends_on`, secrets, and resource fields: https://compose-spec.github.io/compose-spec/spec.html
- Upstream `podman-compose` README: https://github.com/containers/podman-compose
- Upstream `podman-compose` implementation: https://github.com/containers/podman-compose/blob/main/podman_compose.py

## Issues Found
- The networking verification command used `podman exec -it web ping api`, but the example did not define a container named `web`. Changed it to `podman-compose exec web ping api`, which addresses the service by Compose service name.
- The `depends_on` health check section said `podman-compose` may not fully support health conditions without version context. Updated it to reflect that recent `podman-compose` can enforce conditions with `podman wait`, while older Podman or `podman-compose` versions may not.
- The wait-loop example used `nc` inside an `nginx` container without warning that the binary may not be installed. Added a note that the image running the script must include `nc`.
- The `.env` section incorrectly implied quoted values may be invalid for Podman. Updated it to match Compose env file syntax, where quotes are valid and double-quoted values are parsed/interpolated.
- The `.env` section blurred service-level `env_file` with the CLI `--env-file` option. Clarified that service `env_file` entries are service environment files, while `--env-file` supplies interpolation variables and is resolved from the current working directory by `podman-compose`.
- The restart policy section implied `restart: always` may not work with Podman. Updated it to state that `podman-compose` passes restart policies through to Podman, while systemd is still the right production/reboot supervision mechanism.
- The systemd enable command omitted the `.service` suffix. Added it for clarity.
- The `--in-pod` example claimed to use the flag but did not include it. Updated the command to `podman-compose --in-pod true up -d`.
- The Docker Compose v2 compatibility section incorrectly listed `profiles`, `deploy.resources` CPU/memory limits, and `platform` as possibly unsupported in current `podman-compose`. Updated it to state that recent versions support those features and that upgrading is the right fix if they are ignored.
- The resource-limit fallback did not account for current `podman-compose` support. Scoped the direct `podman run` workaround to older versions where Compose resource limits are ignored.
- The secrets section incorrectly implied file-backed Compose secrets may not work with `podman-compose`. Updated it to state that recent `podman-compose` supports file-backed runtime secrets, while external secrets, environment-sourced secrets, and configs have more limited compatibility.
- The container naming guidance said to use service names but immediately showed `container_name`. Reworded it to prefer service names and only use an explicit container name when external scripts require one.

## Review Notes
- `podman generate systemd` is still available but officially deprecated; the post correctly warns that Quadlet is preferred for new deployments.
- Some examples use placeholder images such as `myapi:latest` and database services without complete application-specific environment variables. These are acceptable as migration examples, but a production-ready Compose file would need image-specific configuration.
