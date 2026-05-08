# Validation Summary: How to Set CPU and Memory Limits for a Podman Machine

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman Machine
- Virtual machines on macOS and Windows
- Container CPU and memory resource limits
- macOS shell commands
- Windows PowerShell commands

## Sources Consulted
- Podman `podman machine init` official documentation: https://docs.podman.io/en/latest/markdown/podman-machine-init.1.html
- Podman `podman machine set` official documentation: https://docs.podman.io/en/stable/markdown/podman-machine-set.1.html
- Podman `podman machine inspect` official documentation: https://docs.podman.io/en/stable/markdown/podman-machine-inspect.1.html
- Podman `podman machine list` official documentation: https://docs.podman.io/en/stable/markdown/podman-machine-list.1.html
- Podman `podman machine ssh` official documentation: https://docs.podman.io/en/latest/markdown/podman-machine-ssh.1.html
- Podman `podman stats` official documentation: https://docs.podman.io/en/latest/markdown/podman-stats.1.html
- Podman `podman run` official documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html

## Issues Found
- The PostgreSQL example used `--memory 4g` with `--memory-swap 4g`. Podman documents `--memory-swap` as the total memory plus swap limit, and it must be larger than `--memory`. Changed the example to `--memory-swap 8g`.
- The memory performance test streamed 1GB from `/dev/zero` to `/dev/null`, which does not meaningfully allocate 1GB of container memory. Changed the example to mount a tmpfs and write the 1GB test file there under the container's `--memory 2g` limit.

## Review Notes
Podman was not installed in the local environment, so command behavior was verified against the current official Podman documentation rather than local `--help` output. The post's QEMU caveat for `podman machine set --cpus` and `--memory` matches the official documentation, which states those options are only supported for QEMU machines.
