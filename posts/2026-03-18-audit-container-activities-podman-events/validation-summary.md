# Validation Summary: How to Audit Container Activities with Podman Events

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman events
- Bash
- jq
- cron
- SHA-256 checksums

## Sources Consulted
- Podman official documentation: podman-events, https://docs.podman.io/en/stable/markdown/podman-events.1.html
- Podman official documentation: podman-exec, https://docs.podman.io/en/latest/markdown/podman-exec.1.html
- jq official manual, https://jqlang.org/manual/

## Issues Found
- The post used Docker-style event JSON fields such as `.Actor.Attributes.name`, `.Actor.Attributes.image`, and `.time`. Podman `podman events --format json` emits top-level fields such as `.Name`, `.Image`, `.Time`, `.Status`, `.Type`, and `.ContainerExitCode`. Updated the jq expressions throughout the post.
- The report examples used `podman events --since ...` without `--stream=false`. Podman's default is streaming mode, so those report commands could hang instead of producing a finite report. Added `--stream=false` to finite queries and reports.
- The post filtered and selected container death events as `die`. Podman reports the event status as `died`; updated the report filters and jq selectors accordingly.
- The post implied Podman events identify who created containers and capture commands run via exec. Podman event metadata records the event and object metadata, but not user identity or the full exec command by default. Updated the wording to avoid overclaiming.
- The daily report field `containers_active` was inaccurate because it listed container names seen in events, not currently active containers. Renamed it to `containers_seen`.
- The setup script described the audit file as a daily rotating log even though the script only chooses a date-stamped filename when it starts. Updated the wording to match the script behavior.

## Review Notes
Podman was not installed in the local workspace, so commands could not be executed directly. Validation was performed against current official Podman documentation. For stronger audit trails in production, Podman event logs should be combined with host authentication, sudo, shell, or journald records to attribute actions to users.
