# Validation Summary: How to Handle Podman Container Debugging

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Podman (container runtime)
- Container debugging workflows
- journald / journalctl logging
- slirp4netns rootless networking
- SELinux container labels
- cgroups v1 and v2 (memory.max, cpu.max, etc.)
- systemd unit generation for containers
- strace / nsenter for low-level debugging
- Alpine Linux (debug toolkit base image)
- Podman pods
- Health checks

## Sources Consulted
- Official Podman documentation: https://docs.podman.io/
- `podman` CLI command reference (logs, exec, inspect, stats, events, mount, history, build, network, generate systemd, system reset, system prune, system df)
- Podman rootless documentation: https://github.com/containers/podman/blob/main/docs/tutorials/rootless_tutorial.md
- Podman networking docs (slirp4netns, Netavark/CNI default network "podman")
- Linux exit codes documentation (POSIX signals 137=128+9 SIGKILL, 139=128+11 SIGSEGV, 143=128+15 SIGTERM)
- cgroup v2 documentation (kernel.org): paths under /sys/fs/cgroup (memory.max, memory.current, cpu.max)
- Linux kernel docs for `net.ipv4.ip_unprivileged_port_start` sysctl
- `nicolaka/netshoot` debug image reference
- Alpine `apk` package documentation for the debug toolkit packages (bind-tools, iputils, iftop, mtr, etc.)
- journald `CONTAINER_ID` field reference (Podman journald log driver)

## Issues Found
1. **Missing markdown heading marker on "Resource Constraint Debugging" section (around line 372).** The section title was rendered as plain text instead of a `##` H2 heading, which broke the document outline (subsections like "Memory Debugging" and "CPU Debugging" appeared without a visible parent section in the rendered output). Fixed by prefixing it with `## ` to match the other top-level sections.

No other technical inaccuracies were found. All commands, flags, format strings, exit-code values, signal numbers, cgroup paths, and Alpine package names verified against the relevant official documentation.

## Review Notes
- `podman generate systemd --files` (used in the Systemd Integration section) is **deprecated as of Podman 4.4** in favor of Quadlet (`.container`, `.pod`, `.network`, `.volume` unit files placed under `~/.config/containers/systemd/` or `/etc/containers/systemd/`). The command still works in Podman 5.x but is slated for eventual removal. A future revision could mention Quadlet as the modern alternative; the article was not edited to add this because the command remains functional and the task scope restricts adding new content.
- `podman inspect <image> --format '{{.Labels}}'` works for top-level labels populated from the image manifest. For some images, labels live under `.Config.Labels`. Both paths are commonly used; the article's choice is valid.
- `podman mount` / `podman umount` in rootless mode requires running inside a `podman unshare` session to access the mounted filesystem with correct UID mappings. The article shows the bare command, which is technically correct as written, but readers in rootless mode may encounter permission errors when navigating the returned mount path. Worth noting in a future revision.
- `.NetworkSettings.IPAddress` (used to find a container's IP) is populated for the default bridge network for Docker compatibility, but for non-default networks the IP is at `.NetworkSettings.Networks.<network-name>.IPAddress`. The article's example works in the common default-network case.
- Exit-code table accurately maps to POSIX signal conventions (128 + signal number). Values 125/126/127 follow OCI runtime exit-code conventions documented by both Docker and Podman.
- The Alpine 3.19 base image and listed `apk` packages all exist in the Alpine 3.19 package index.
