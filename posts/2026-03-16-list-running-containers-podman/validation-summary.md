# Validation Summary: How to List Running Containers in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Containers
- Podman pods
- Bash shell commands
- jq

## Sources Consulted
- Podman official documentation: podman-ps, https://docs.podman.io/en/latest/markdown/podman-ps.1.html
- Podman official documentation: podman-stats, https://docs.podman.io/en/latest/markdown/podman-stats.1.html
- Local CLI check attempted with `podman ps --help`; Podman was not installed in the review environment.

## Issues Found
- The post said `podman ps --latest` shows the most recently created running container. Podman documents `--latest` as showing the latest container created across all states, so the description was corrected.
- The post said `podman ps --last 5` shows the last N containers without clarifying state. Podman documents `--last, -n` as printing the last created containers across all states, so the description was corrected.
- The introduction said the guide covers all ways to list and inspect running containers. This was narrowed to "common ways" because Podman supports additional options and filters not covered by the post.

## Review Notes
The remaining commands, options, and template fields checked against the official Podman documentation are current and technically accurate. The `xargs -r` example is GNU-specific and may not work on all non-GNU systems, but it is valid on common Linux environments where Podman is typically used.
