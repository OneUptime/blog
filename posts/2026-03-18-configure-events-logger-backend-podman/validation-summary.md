# Validation Summary: How to Configure Events Logger Backend in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- containers.conf
- systemd journald
- Container event logging
- Bash shell commands

## Sources Consulted
- Official Podman `podman-events` documentation: https://docs.podman.io/en/stable/markdown/podman-events.1.html
- Official Podman `podman` global options documentation: https://docs.podman.io/en/v4.3/markdown/podman.1.html
- Official Podman `podman-info` documentation: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- containers/common `containers.conf.5.md` source used by Podman/container engines: https://github.com/containers/common/blob/main/docs/containers.conf.5.md

## Issues Found
- The examples used `podman events --since ...` as if the command exits after printing recent events. Podman's events command streams by default, so I added `--stream=false` to examples intended to return after listing recent events.
- The file backend section listed `~/.local/share/containers/storage/events/events.log` as the default rootless path. Podman documents the default file backend path as `<tmpdir>/events/events.log`, so I corrected the explanation and example directory check.
- The event log file location section said the path could be configured in `storage.conf` or unspecified containers.conf engine options. The current containers.conf key is `events_logfile_path`, so I replaced the vague/incorrect claim with that key.
- The event log size section used the incorrect key `events_log_file_size` and an unsupported `podman info` template field. I changed it to the documented `events_logfile_max_size = "1m"` setting.
- The verification script referenced unsupported `podman info` template fields for event logfile path and size. I removed those lines and kept the supported event logger check.

## Review Notes
Podman was not installed in the local review environment, so command verification was performed against current official Podman documentation and containers.conf source documentation rather than local `podman --help` output.
