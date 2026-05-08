# Validation Summary: How to Configure systemd to Restart Podman Containers on Failure

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman Quadlet
- systemd service units
- systemd restart policies
- systemctl
- journalctl

## Sources Consulted
- Podman Quadlet documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- systemd.service(5), systemd 255: https://www.freedesktop.org/software/systemd/man/255/systemd.service.html
- systemd.unit(5), systemd 255: https://www.freedesktop.org/software/systemd/man/255/systemd.unit.html
- systemd.exec(5), systemd 255: https://www.freedesktop.org/software/systemd/man/255/systemd.exec.html
- Local systemd 255 man pages and `systemctl --help` output

## Issues Found
- The basic `Restart=on-failure` comment and restart policy table described `on-failure` as only non-zero exits. Updated them to include unclean signals, timeouts, and watchdog failures, matching systemd.service(5).
- The rate limiting explanation described `StartLimitBurst=5` as restart attempts only. Updated it to say start attempts, because systemd.unit(5) applies the limit to all starts, including manual starts.
- The rate limiting result said systemd marks the service failed immediately after 5 restarts. Updated the wording to clarify that the next start after the permitted burst is refused and restart attempts stop until the interval passes or the failed state is reset.
- The `RestartSteps` section said "newer systemd versions." Updated it to "systemd 254 and newer" because `RestartSteps=` and `RestartMaxDelaySec=` were added in systemd 254.
- The `ExecStopPost=` example claimed it ran when the service failed permanently. Updated the wording because `ExecStopPost=` runs after stops, failed starts, and restart stop phases. The command now checks `$SERVICE_RESULT` rather than `$EXIT_STATUS`, which is the documented service result variable for failure monitoring in `ExecStopPost=`.

## Review Notes
The Quadlet examples use valid `.container` structure, and Podman documents that `[Service]` options pass through to generated systemd service units. The post does not show the `systemctl --user daemon-reload` step after adding a Quadlet file, which could be useful in a future expansion, but the restart policy content is now technically accurate.
