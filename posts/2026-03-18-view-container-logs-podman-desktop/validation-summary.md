# Validation Summary: How to View Container Logs in Podman Desktop

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Podman CLI
- Podman Desktop
- Container logging and log drivers
- Shell utilities (`curl`, `grep`, `timeout`)

## Sources Consulted
- Podman `podman logs` reference: https://docs.podman.io/en/latest/markdown/podman-logs.1.html
- Podman `podman run` reference: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman Desktop "View the logs": https://podman-desktop.io/docs/containers/viewing-container-logs
- Podman Desktop API `logsContainer()`: https://podman-desktop.io/api/%40podman-desktop/namespaces/containerEngine/functions/logsContainer
- Podman CLI source for current log output handling: https://github.com/containers/podman/blob/main/cmd/podman/containers/logs.go

## Issues Found
- The log driver section incorrectly described `json-file` as Podman's default log driver and used `--log-opt max-file=3`, which is not documented in the current `podman run` reference. I updated the section to use the documented `podman info --format '{{ .Host.LogDriver }}'` check, clarified that `json-file` is a compatibility alias for `k8s-file`, and removed the unsupported option.
- The Podman Desktop debugging section listed UI behaviors that are not documented in the current Podman Desktop logging guide, including browser `Ctrl/Cmd+F` search and the specific `Scroll lock` and `Copy to clipboard` claims. I replaced those with the documented keyword search box and `Open Logs` overflow-menu shortcut.
- The comment `Append new logs to an existing file` overstated what `podman logs -f` does, because `--follow` replays existing logs before continuing. I reworded the comment so it matches the command's actual behavior.

## Review Notes
- Validation was documentation-based because `podman` is not installed in the local review environment.
- The remaining CLI examples align with current Podman documentation, including `--tail`, `--follow`, `--timestamps`, and time filtering with `--since` and `--until`.
- The post now avoids implying a host-side `journalctl` workflow as a universal Podman Desktop path, which is especially important for macOS and Windows users running Podman through a Podman machine.
