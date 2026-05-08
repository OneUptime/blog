# Validation Summary: How to View Last N Lines of Container Logs in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Container logging
- Shell commands
- Bash scripting
- Unix text processing with grep and sort

## Sources Consulted
- Official Podman documentation: podman-logs, https://docs.podman.io/en/v5.3.2/markdown/podman-logs.1.html
- Official Podman documentation: podman-ps, https://docs.podman.io/en/v5.7.1/markdown/podman-ps.1.html

## Issues Found
No technical issues found.

## Review Notes
The workspace does not have the podman CLI installed, so local `podman logs --help` verification was not possible. The commands and claims were checked against the official Podman documentation instead. The documented `podman logs` syntax supports one or more containers, `--tail=LINES`, `--follow`/`-f`, and `--timestamps`/`-t`; `podman ps` supports the `--filter`, `--format`, `--latest`/`-l`, and `--quiet`/`-q` usage shown in the post.
