# Validation Summary: How to Use File Events Logger with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- containers.conf
- Podman events
- JSON Lines event logs
- Bash
- jq
- logrotate

## Sources Consulted
- Podman events official documentation: https://docs.podman.io/en/stable/markdown/podman-events.1.html
- Podman info official documentation: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- containers.conf upstream documentation: https://raw.githubusercontent.com/containers/common/main/docs/containers.conf.5.md
- containers/common engine config source: https://raw.githubusercontent.com/containers/common/main/pkg/config/config.go
- containers/common defaults source: https://raw.githubusercontent.com/containers/common/main/pkg/config/default.go
- Podman file eventer source: https://raw.githubusercontent.com/containers/podman/main/libpod/events/logfile.go
- Podman eventer setup source: https://raw.githubusercontent.com/containers/podman/main/libpod/events.go

## Issues Found
- The post used `podman info --format '{{.Store.EventsLogFilePath}}'` and `{{.Store.EventsLogFileSize}}`, but the official `podman info` documentation exposes `.Store` for storage information and does not document those event-log fields. I replaced those examples with an explicit `events_logfile_path` setting and a matching shell variable.
- The post listed rootless and rootful event log defaults under container storage paths. Podman defaults the file event log under the engine temporary directory when `events_logfile_path` is not configured. I changed the guide to configure a persistent explicit path instead of relying on those incorrect defaults.
- The post used the wrong size configuration key, `events_log_file_size`. The documented key is `events_logfile_max_size`, so I corrected the TOML snippet and used the documented size-string format.
- The post treated the raw event file as whitespace-delimited text. Podman's file eventer writes JSON Lines, so the `awk` and `grep " die "` parsing examples were incorrect. I updated the parsing and monitor examples to use `jq` and the JSON `.Status` and `.Time` fields.
- The summary claimed the file could be parsed with grep and awk as the main approach. I updated it to describe JSON Lines parsing with JSON tools such as `jq`.

## Review Notes
Podman was not installed in the local review environment, so CLI behavior was verified against official Podman documentation and upstream Podman/containers source code rather than local `podman --help` output.
