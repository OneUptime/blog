# Validation Summary: How to Set Disk Size for a Podman Machine

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman Machine
- Virtual machines on macOS and Windows
- Container images, containers, volumes, and build cache cleanup

## Sources Consulted
- Podman machine init documentation: https://docs.podman.io/en/latest/markdown/podman-machine-init.1.html
- Podman machine set documentation: https://docs.podman.io/en/stable/markdown/podman-machine-set.1.html
- Podman machine inspect documentation: https://docs.podman.io/en/stable/markdown/podman-machine-inspect.1.html
- Podman machine ssh documentation: https://docs.podman.io/en/v4.4/markdown/podman-machine-ssh.1.html
- Podman system df documentation: https://docs.podman.io/en/latest/markdown/podman-system-df.1.html
- Podman system prune documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-system-prune.1.html
- Podman images documentation: https://docs.podman.io/en/stable/markdown/podman-images.1.html
- Podman ps documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-ps.1.html
- Podman run documentation: https://docs.podman.io/en/v5.2.0/markdown/podman-run.1.html
- Podman volume prune documentation: https://docs.podman.io/en/stable/markdown/podman-volume-prune.1.html
- Podman network prune documentation: https://docs.podman.io/en/v4.3/markdown/podman-network-prune.1.html

## Issues Found
- The disk-size unit was described as GB for `podman machine init --disk-size`. Current Podman documentation describes this value as GiB, so the wording was corrected.
- The post used `podman builder prune`, including `--dry-run`, for build cache cleanup. Current Podman documentation does not list `podman builder prune`; documented build cleanup is handled through `podman system prune --build`, so those commands were replaced with `podman system df -v` for inspection and `podman system prune --build -f` for cleanup.
- The automated cleanup script used the same unsupported `podman builder prune` command. It was changed to `podman system prune --build -f`.
- The log rotation example used Docker-style `--log-opt max-file=3`. Podman documents `max-size`, `path`, and `tag` for `--log-opt`, but not `max-file`, so the example was changed to use the documented `--log-opt max-size=10mb`.

## Review Notes
The `podman machine set --disk-size` guidance is accurate for QEMU-backed machines: the value can only be increased and is only supported for QEMU machines. The post correctly notes that non-QEMU providers such as Apple HV generally require recreating the machine to change disk size.
