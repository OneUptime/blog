# Validation Summary: How to Handle Podman System Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman (container runtime)
- systemd (service manager, units, timers, watchdog)
- Quadlet (declarative Podman unit files, Podman 4.4+)
- journald (logging)
- SELinux (volume contexts, `:Z`/`:z` flags)
- PostgreSQL container example
- Nginx container example
- Bash scripting (blue-green deploy, health monitoring)
- Podman secrets

## Sources Consulted
- podman-run(1): https://docs.podman.io/en/latest/markdown/podman-run.1.html
- `--sdnotify` option reference: https://docs.podman.io/en/v4.6.1/markdown/options/sdnotify.html
- podman-generate-systemd(1): https://docs.podman.io/en/latest/markdown/podman-generate-systemd.1.html
- podman-systemd.unit(5) / Quadlet: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- podman-secret-exists(1): https://docs.podman.io/en/v4.6.1/markdown/podman-secret-exists.1.html
- Red Hat blog on Quadlet (Podman 4.4): https://www.redhat.com/en/blog/quadlet-podman
- systemd.service(5) and systemd.unit(5) for `BindsTo=`, `Requires=`, `After=`, `WatchdogSec=`, `NotifyAccess=`, `StartLimitIntervalSec=`, `StartLimitBurst=` semantics
- systemd specifier reference for `%n`, `%N`, `%t`

## Issues Found

1. **Watchdog example used wrong `--sdnotify` mode.** The Systemd Watchdog Integration section combined `WatchdogSec=60` with `--sdnotify=conmon`. Under `--sdnotify=conmon`, conmon only sends `READY=1` on container start and never forwards `WATCHDOG=1`, so systemd would treat the service as hung and restart it every 60 s. Changed `--sdnotify=conmon` to `--sdnotify=container` (which proxies `NOTIFY_SOCKET` into the container so the workload can send `WATCHDOG=1`) and updated the inline comments to note that the container's main process must call `sd_notify` for watchdog pings to actually be sent.

2. **Misleading comment on Podman secret creation.** In the Using Podman Secrets section, the first `echo "supersecretpassword" | podman secret create db_password -` example was labelled `# Create a secret from a file`, which contradicts what the command does (reads from stdin via `-`). Changed the comment to `# Create a secret from stdin`. The second example (`podman secret create api_key /path/to/api_key.txt`) genuinely creates from a file and was left intact.

3. **Missing Markdown heading markers.** Two section headers were rendered as plain text because the `#`/`##`/`###` prefixes were missing:
   - `Resource Management` → changed to `## Resource Management` (top-level section, matching the surrounding hierarchy).
   - `Resource Monitoring` → changed to `### Resource Monitoring` (subsection under Resource Management).

## Review Notes

- `podman generate systemd` is officially deprecated as of Podman 4.4 (Feb 2023) in favor of Quadlet (`podman-systemd.unit(5)`). The post already devotes a section to Quadlet, but the "Automatic Generation from Running Containers" section presents `podman generate systemd` without flagging the deprecation. Not corrected (the command still works and the post does promote Quadlet later), but worth noting for future updates.
- The watchdog example still relies on the application container implementing `sd_notify` (sending `READY=1` and periodic `WATCHDOG=1`). With the fix in place, the systemd-side configuration is correct, but a generic Nginx or "myapi:latest" image won't actually send those notifications. The new inline comment calls this out explicitly.
- The Quadlet `WantedBy=default.target` in the example is correct for the rootless path (`~/.config/containers/systemd/`); for system Quadlets in `/etc/containers/systemd/` it would typically be `multi-user.target` instead.
- The `BindsTo=postgres.service` + `Requires=postgres.service` pairing in the webapp example is slightly redundant — `BindsTo=` implies `Requires=` — but not incorrect, and reflects a common defensive style. Left as-is.
- `--sdnotify=conmon` is used throughout the rest of the post (postgres, webapp, secrets examples) and is appropriate there because those examples don't use `WatchdogSec=`. Only the watchdog example needed `--sdnotify=container`.
- `host.containers.internal`, `podman secret exists`, `AutoUpdate=registry`, the Quadlet directory layout, `--sdnotify` mode set, journald log driver options, `--health-*` flags, and the systemd specifiers (`%n`, `%N`, `%t`) were all verified against current Podman docs.
