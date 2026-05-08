# Validation Summary: How to Remove a Farm with podman farm remove

## Status
validated

## Post Type
Tutorial / CLI guide

## Technologies Covered
- Podman
- Podman farm commands
- Podman system connections
- Shell scripting

## Sources Consulted
- Official Podman documentation: podman-farm-remove, https://docs.podman.io/en/v4.9.0/markdown/podman-farm-remove.1.html
- Official Podman documentation: podman-farm-list, https://docs.podman.io/en/stable/markdown/podman-farm-list.1.html
- Official Podman documentation: podman-farm-create, https://docs.podman.io/en/v4.9.0/markdown/podman-farm-create.1.html
- Official Podman documentation: podman-farm-build, https://docs.podman.io/en/stable/markdown/podman-farm-build.1.html
- Official Podman documentation: podman-manifest-push, https://docs.podman.io/en/latest/markdown/podman-manifest-push.1.html
- Official Podman documentation: podman-system-connection-remove, https://docs.podman.io/en/stable/markdown/podman-system-connection-remove.1.html

## Issues Found
- The cleanup script treated `.Connections` from `podman farm list --format` as comma-separated output. Official examples show `.Connections` renders as a Go-template list such as `[f38 f37]`. Updated the script to iterate over `.Connections` in the Go template and emit space- or newline-separated connection names.
- The cleanup script used a regex `grep` check for connection names. Updated it to `grep -Fxq -- "${CONN}"` so connection names are matched exactly and not interpreted as regular expressions.
- The lifecycle example ran `podman manifest push` after `podman farm build`. Official `podman farm build` documentation states that tagged farm builds push the image instances and manifest list to the registry. Replaced the extra push command with a comment explaining that behavior.

## Review Notes
Podman was not installed in the local environment, so command behavior was verified against official Podman documentation rather than local `--help` output.
