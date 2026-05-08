# Validation Summary: How to Troubleshoot Container OOM Kills in Podman

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Podman
- Linux containers
- Linux cgroups v1 and v2
- Linux kernel OOM killer
- Docker/Compose-compatible resource limit fields
- Java and Node.js runtime memory tuning

## Sources Consulted
- Podman `podman-run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `podman-update` documentation: https://docs.podman.io/en/stable/markdown/podman-update.1.html
- Podman `podman-container-inspect` documentation: https://docs.podman.io/en/stable/markdown/podman-container-inspect.1.html
- Podman `podman-stats` documentation: https://docs.podman.io/en/latest/markdown/podman-stats.1.html
- Linux kernel cgroup v2 memory controller documentation: https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html
- Linux kernel cgroup v1 memory controller documentation: https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v1/memory.html
- Docker Compose services reference for `mem_limit`, `mem_reservation`, and `memswap_limit`: https://docs.docker.com/reference/compose-file/services/
- Docker Compose deploy resources reference: https://docs.docker.com/reference/compose-file/deploy/

## Issues Found
- The post used `{{json .HostConfig.Resources}}`, but Podman's documented inspect output exposes resource fields directly under `.HostConfig`, not under `.HostConfig.Resources`. Changed the command to print `.HostConfig`.
- The cgroup file examples used cgroups v2 paths without saying so. Updated the comments to specify that `memory.current` and `memory.max` are cgroups v2 files.
- The `--memory-swap 512m` example was described as disabling swap with `--memory 512m`, but current Podman documentation says `--memory-swap` is total memory plus swap and must be larger than `--memory`. Changed the example to a larger total limit and changed the summary from "disable swap" to "cap swap".
- The `/proc/self/maps` command inspected the short-lived `cat` process, not the application process. Changed it to `/proc/1/maps` for the container's main process.
- The `/proc/meminfo` comment implied container-specific memory details. Clarified that it shows host-level memory information visible inside the container.
- The Node.js example comment said it enabled heap snapshots, but `--max-old-space-size` caps V8 old-space memory. Updated the comment accordingly.
- The final Podman run strategy used `--memory 1g --memory-swap 1g`, which conflicted with current Podman documentation requiring the swap total to be larger than memory. Changed it to `--memory-swap 1536m`.
- The Compose example used `memswap_limit: 512m` with `mem_limit: 512m`. Changed it to `768m` to keep the Podman-oriented example aligned with Podman's documented memory-swap semantics.

## Review Notes
Podman was not installed in the local workspace, so CLI behavior was checked against official documentation instead of local `--help` output. Exit code 137 remains correctly described as SIGKILL and often, but not exclusively, associated with OOM kills.
