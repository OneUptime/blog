# Validation Summary: How to Disable Seccomp for a Podman Container

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Linux seccomp
- Linux capabilities
- Podman Compose / Compose security options
- Container debugging and profiling tools (`strace`, `perf`)

## Sources Consulted
- Podman `podman run` documentation for `--security-opt seccomp=unconfined`: https://docs.podman.io/en/v5.4.1/markdown/podman-run.1.html
- Podman `podman compose` documentation: https://docs.podman.io/en/v4.8.3/markdown/podman-compose.1.html
- Compose Specification for `security_opt`: https://compose-spec.github.io/compose-spec/spec.html
- Linux `seccomp(2)` man page: https://man7.org/linux/man-pages/man2/seccomp.2.html
- Linux `/proc/pid/status` man page for `Seccomp` values: https://www.man7.org/linux/man-pages/man5/proc_pid_status.5.html
- Linux `capabilities(7)` man page for `CAP_PERFMON`: https://man7.org/linux/man-pages/man7/capabilities.7.html
- Linux `perf_event_open(2)` man page for perf permissions: https://www.man7.org/linux/man-pages/man2/perf_event_open.2.html
- containers/common default seccomp profile used by Podman-family tooling: https://raw.githubusercontent.com/containers/common/main/pkg/seccomp/seccomp.json
- Podman container inspect documentation for `.HostConfig.SecurityOpt`: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html

## Issues Found
- The original post implied that basic `strace` commonly fails under Podman's default seccomp profile because of `ptrace`. Current containers/common default seccomp profile allows `ptrace`, so I changed the initial restriction example to `perf`, which uses `perf_event_open`, a syscall restricted by the default profile unless the right capability/profile is present.
- The `strace` section overstated seccomp as the usual blocker. I updated it to clarify that disabling seccomp is relevant when the active profile blocks `ptrace`, while current Podman defaults usually require `SYS_PTRACE` for attaching to existing processes.
- The performance profiling example used `SYS_ADMIN`, which is broader than needed on modern Linux. I changed it to `PERFMON`, which is the capability documented for performance monitoring and `perf_event_open`.
- The commented `podman-compose` command placed `-f` after `up`. I changed it to `podman-compose -f /tmp/debug-compose.yml up -d`, which matches compose-style option ordering.

## Review Notes
Podman was not installed in the local environment, so commands could not be executed directly. CLI and behavior checks were performed against official documentation and authoritative source profiles instead.
