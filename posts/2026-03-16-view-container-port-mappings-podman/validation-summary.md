# Validation Summary: How to View Container Port Mappings with podman port

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Container networking
- Published container ports and port mappings
- Linux networking tools: curl, ss, netstat
- Shell scripting

## Sources Consulted
- Official Podman `podman-port` documentation: https://docs.podman.io/en/v4.8.1/markdown/podman-port.1.html
- Official Podman `podman-run --publish` documentation: https://docs.podman.io/en/v5.2.0/markdown/podman-run.1.html#publish-p-ip-hostport-containerport-protocol
- Official Podman `podman-ps` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-ps.1.html
- Official Podman `podman-inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-inspect.1.html
- Official Podman `podman-container-inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html

## Issues Found
- The `podman inspect web --format '{{json .Config.ExposedPorts}}'` example was described as reading exposed ports from the image config, but the command inspects the container named `web`. Changed the comment to say "container config."
- The host port listening check redirected stderr only on `grep` in part of the pipeline and could emit an error if `ss` was missing. Updated it to redirect stderr from `ss` and use `netstat` as a fallback before filtering.
- The troubleshooting command for checking whether host port `8080` is in use only used `ss`, so it could incorrectly print that the port was free if `ss` was unavailable. Added the same `netstat` fallback.
- The in-container `ss` check assumes the container image includes `ss`; many minimal images do not. Added a short caveat to the comment.

## Review Notes
Podman was not installed in the review environment, so CLI behavior was verified against official Podman documentation rather than local command execution. The main `podman port`, `podman run -p`, `podman ps --format`, and `podman inspect --format` usage is consistent with the official documentation.
