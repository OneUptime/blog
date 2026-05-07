# Validation Summary: How to Fix 'too many open files' Errors in Podman

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Podman
- Linux resource limits and file descriptors
- containers.conf
- sysctl
- PAM limits.conf
- systemd service limits
- Compose ulimits

## Sources Consulted
- Podman `podman-run(1)` official documentation: https://docs.podman.io/en/v5.4.1/markdown/podman-run.1.html
- Podman `podman-top(1)` official documentation: https://docs.podman.io/en/latest/markdown/podman-top.1.html
- `containers.conf(5)` man page: https://www.mankier.com/5/containers.conf
- Linux kernel `/proc/sys/fs` sysctl documentation: https://docs.kernel.org/admin-guide/sysctl/fs.html
- Linux `getrlimit(2)` manual page: https://www.man7.org/linux/man-pages/man2/getrlimit.2.html
- Linux `limits.conf(5)` manual page: https://man7.org/linux/man-pages/man5/limits.conf.5.html
- systemd `systemd.exec(5)` and `systemd-system.conf(5)` documentation: https://www.freedesktop.org/software/systemd/man/systemd.exec.html and https://www.freedesktop.org/software/systemd/man/latest/systemd-system.conf.html
- Compose Specification `ulimits`: https://github.com/compose-spec/compose-spec/blob/master/spec.md

## Issues Found
- The post described Podman container ulimits as inherited from the host. Current Podman documentation says `nofile` and `nproc` default to 1048576 unless overridden in `containers.conf`, with rootless containers capped by the current user's hard limit. I updated that explanation.
- The host-level section focused only on `fs.file-max`. That sysctl is the system-wide file handle limit, while `fs.nr_open` is the maximum number of file handles a process can allocate and is relevant when setting high `RLIMIT_NOFILE` hard limits. I clarified the distinction and added `fs.nr_open` checks and persistent configuration.
- The `podman top` diagnostic example used `-eo pid,args`, which relies on `ps`-style fallback behavior. Podman's documented form is to pass format descriptors after the container name, so I changed it to `podman top my-container pid args`.
- The post said setting `nofile` to 1048576 is generally safe. That is mostly true for modern applications, but official systemd documentation warns that software using `select(2)` can have problems with file descriptors above 1023. I added that caveat.

## Review Notes
The remaining commands and snippets are technically sound for current Podman and Linux systems. Changes to PAM limits and systemd manager defaults affect new sessions/services, so existing shells and containers still need to be restarted or recreated.
