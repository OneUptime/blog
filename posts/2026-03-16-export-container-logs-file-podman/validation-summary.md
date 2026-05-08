# Validation Summary: How to Export Container Logs to a File in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Container logging
- Bash shell redirection and pipelines
- gzip, bzip2, tar, jq, CSV, and JSON Lines

## Sources Consulted
- Podman `logs` official documentation: https://docs.podman.io/en/v5.3.2/markdown/podman-logs.1.html
- Podman `container inspect` official documentation: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html
- Podman `run --log-driver` and `--log-opt` official documentation: https://docs.podman.io/en/v4.3/markdown/podman-run.1.html
- jq official manual for raw input and JSON construction: https://jqlang.org/manual/
- RFC 4180 CSV format: https://www.rfc-editor.org/rfc/rfc4180

## Issues Found
- The JSON Lines example manually escaped only double quotes, which could produce invalid JSON for log messages containing backslashes or other characters requiring JSON escaping. Changed it to use `jq -Rc` with a container argument so each raw log line is encoded as one compact JSON object.
- The CSV example removed quotes and replaced commas, which loses data and is not valid CSV escaping. Changed it to quote fields and escape embedded double quotes by doubling them.
- The raw log copy section used `{{.LogPath}}`, which is not listed in current Podman container inspect placeholders and current inspect output exposes the file path under `HostConfig.LogConfig.Path`. Updated the template accordingly.
- The raw log copy section implied all containers have directly copyable raw log files. Current Podman defaults may use `journald`, where `HostConfig.LogConfig.Path` is empty. Clarified that direct copying applies when using a file-based log driver.
- The rotated log copy example copied into `./log-export/` without ensuring the directory exists. Added `mkdir -p ./log-export`.

## Review Notes
Podman was not installed in the local workspace, so CLI behavior was verified against official Podman documentation rather than local `podman --help` output. The examples are otherwise consistent with the documented `podman logs` options for `--timestamps`, `--tail`, `--since`, and `--until`.
