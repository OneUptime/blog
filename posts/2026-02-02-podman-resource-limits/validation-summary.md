# Validation Summary: How to Handle Podman Resource Limits

## Status
validated

## Post Type
Tutorial / Practical guide

## Technologies Covered
- Podman (CLI flags: `--memory`, `--memory-swap`, `--memory-reservation`, `--cpus`, `--cpu-shares`, `--cpu-period`, `--cpu-quota`, `--cpuset-cpus`, `--blkio-weight`, `--device-read-bps`, `--device-write-bps`, `--device-read-iops`, `--pids-limit`, `--ulimit`, `--oom-kill-disable`, `--oom-score-adj`)
- Linux cgroups v2 (CPU, memory, I/O, pids controllers)
- `podman stats`, `podman inspect`, `podman update`, `podman events`, `podman pod create`
- Podman rootless mode and systemd cgroup delegation (`Delegate=`)
- `containers.conf` configuration
- Quadlet / `podman-systemd.unit` (5.x)
- systemd user services
- Bash scripting with `jq`

## Sources Consulted
- Podman CLI reference: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman `--blkio-weight`, `--device-read-bps`, `--cpu-shares`, `--memory-swap`, `--memory-reservation` flag definitions
- containers.conf reference: https://github.com/containers/common/blob/main/docs/containers.conf.5.md
- Quadlet reference: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- systemd `Delegate=` and `CPUQuota=` resource-control directives (systemd.resource-control(5))
- Linux kernel OOM exit code semantics (SIGKILL → 128 + 9 = 137)

## Issues Found

1. **containers.conf used invalid field names.** The rootless section claimed that `default_memory = "1g"` and `default_cpus = 1.0` could be placed in the `[containers]` section of `containers.conf`. These keys do not exist in the containers-common schema — there are no default-memory or default-CPU fields. Only `pids_limit` from the original snippet was valid. I rewrote the example to use only documented `[containers]` keys (`pids_limit` and `default_ulimits`) and reworded the surrounding prose to clarify that per-container memory/CPU defaults must be supplied via CLI flags, not containers.conf.

2. **Quadlet `[Container]` section used keys that do not exist there.** The original Quadlet file used `MemoryReservation=1g` and `CPUQuota=150%` inside `[Container]`. Per the `podman-systemd.unit(5)` man page, there is no `MemoryReservation=` Quadlet key (it must be passed via `PodmanArgs=--memory-reservation=…`), and `CPUQuota=` is a systemd resource-control directive that belongs in the `[Service]` section (where systemd applies it to the unit's cgroup), not in `[Container]`. I moved `--memory-reservation` into `PodmanArgs=` and relocated `CPUQuota=150%` to `[Service]`. `Memory=`, `PidsLimit=`, and `Ulimit=` are valid `[Container]` keys and were left as-is.

## Review Notes

- `--blkio-weight` is implemented via the cgroups v1 blkio controller. On cgroups v2 systems it maps to `io.weight`, which is honored only by I/O schedulers that support proportional weights (e.g., BFQ). On the common `mq-deadline` / `none` schedulers the weight is effectively ignored. The post does not mention this caveat — worth flagging if the section is ever expanded.
- `--cpu-shares` likewise maps from the legacy cgroup v1 `cpu.shares` to cgroup v2's `cpu.weight`. The 1024-default framing in the post is accurate from the user-facing flag perspective.
- The post has three sub-headings missing their `###`/`##` prefix ("Resource Profile Script", "Resource Inspection", "Resource Limit Troubleshooting"). These are formatting/style issues, not technical errors, and were left alone per the review scope.
- Exit code 137 for OOM kills is correctly stated (128 + SIGKILL=9).
- The `--cpu-period 100000 / --cpu-quota 150000 = 1.5 CPUs` example is arithmetically correct; the prose order ("150000 microseconds out of 100000") reads awkwardly but is not wrong.
- `Delegate=cpu cpuset io memory pids` for rootless cgroup delegation is correct.
- `podman events --filter event=oom --format json` is valid; the `oom` event type is emitted when the kernel OOM-kills a container.
