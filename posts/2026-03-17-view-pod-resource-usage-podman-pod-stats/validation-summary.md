# Validation Summary: How to View Pod Resource Usage with podman pod stats

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman pods
- Container resource monitoring
- Bash scripting

## Sources Consulted
- Official Podman `podman-pod-stats` documentation: https://docs.podman.io/en/latest/markdown/podman-pod-stats.1.html
- Official Podman `podman-pod-create` documentation: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- Official Podman `podman-run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html

## Issues Found
- The custom format examples used Docker-style or incorrect template placeholders for `podman pod stats`: `.CPUPerc`, `.MemPerc`, and `.PIDs`. The official Podman documentation lists `.CPU`, `.Mem`, and `.PIDS` for these values. Updated the custom table, CPU filtering, CSV logging, and memory alert examples accordingly.

## Review Notes
- The local environment did not have `podman` installed, so command behavior was verified against official Podman documentation rather than local `--help` output.
- Official Podman documentation notes that rootless stats are supported only on cgroups v2; the post does not discuss rootless/cgroups compatibility, but its core commands and explanations are otherwise current.
