# Validation Summary: How to Profile Podman Container Resource Usage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Linux cgroups v2
- Linux process and resource profiling tools (`perf`, `pidstat`, `iotop`, `strace`, `nsenter`, `ss`, `iftop`, `tcpdump`)
- Bash scripting
- `jq`

## Sources Consulted
- Podman `stats` documentation: https://docs.podman.io/en/latest/markdown/podman-stats.1.html
- Podman `top` documentation: https://docs.podman.io/en/stable/markdown/podman-top.1.html
- Podman `inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-inspect.1.html
- Podman container inspect documentation: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html
- Podman healthcheck documentation: https://docs.podman.io/en/latest/markdown/podman-healthcheck.1.html
- Linux kernel cgroup v2 documentation: https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html
- Linux cgroups manual page: https://man7.org/linux/man-pages/man7/cgroups.7.html
- Local `perf record --help`
- Local `pidstat(1)` manual / `pidstat --help`
- Local `strace --help`
- Local `nsenter --help`

## Issues Found
- The memory cgroup example hard-coded one rootless systemd cgroup path. Changed it to derive the path from `podman inspect --format '{{.State.CgroupPath}}'` and prepend `/sys/fs/cgroup/`, which works across rootful and rootless cgroup path layouts.
- The `pidstat -t -p $CPID` example claimed to monitor all processes in the container process tree. `pidstat -t` reports threads for the selected PID, so the comment now accurately says it monitors the main process and its threads.
- The memory leak script emitted `timestamp,rss_bytes,cache_bytes` but only wrote Podman's `mem_usage` string. Updated the CSV header to `timestamp,mem_usage`.
- The `iotop -p $CPID` example claimed to watch all container processes, but it selects the specified PID. Updated the comment to identify it as the container main process.
- The `strace` example attached only to the main PID and used `open` without `openat`. Updated the comment and command to use `-f` and include `openat`, which better reflects modern Linux file-open syscalls while keeping the example scoped to the main process and descendants.
- The network section implied `podman stats` always reports network usage. Added Podman's documented caveat that rootless environments may not report network usage.
- The JSON export example used `net_io` and `block_io`, but Podman's documented JSON output uses `netio` and `blocki`. Updated the `jq` projection and included `mem_percent`.

## Review Notes
The post is technically relevant and broadly accurate after the corrections. Some examples still depend on host privileges, cgroup v2, and optional tools being installed inside the container or on the host; those constraints are already implied by the commands and comments.
