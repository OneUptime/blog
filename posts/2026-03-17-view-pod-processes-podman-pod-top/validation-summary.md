# Validation Summary: How to View Pod Processes with podman pod top

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman pods
- Container process inspection
- Linux process format descriptors
- Shell utilities such as watch, head, tail, and sort

## Sources Consulted
- Official Podman `podman-pod-top` documentation: https://docs.podman.io/en/latest/markdown/podman-pod-top.1.html
- Official Podman `podman-top` documentation: https://docs.podman.io/en/stable/markdown/podman-top.1.html
- Local Linux `ps(1)` manual page for process output format specifiers

## Issues Found
- The default output example said the default view shows only `USER`, `PID`, `PPID`, and `COMMAND`, but the official Podman documentation says `podman pod top` prints output similar to `ps -ef` by default, including fields such as `%CPU`, `ELAPSED`, `TTY`, and `TIME`. Updated the description and example output to match the documented default shape.
- The examples used `pmem` and `rss` as common `podman pod top` descriptors. The current official Podman `podman-top` descriptor list explicitly documents `vsz` but not `pmem` or `rss`, so the examples were adjusted to use `vsz` for memory-related output.

## Review Notes
Podman was not installed in the local workspace, so command behavior was verified against the current official Podman documentation rather than local `--help` output. The pod creation and container startup commands are syntactically valid Podman commands.
