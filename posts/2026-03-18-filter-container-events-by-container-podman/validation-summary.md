# Validation Summary: How to Filter Container Events by Container in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Linux shell commands
- Bash
- jq
- Container event monitoring

## Sources Consulted
- Podman official documentation: podman-events - https://docs.podman.io/en/stable/markdown/podman-events.1.html
- Podman official documentation: podman-container-exists - https://docs.podman.io/en/v4.4/markdown/podman-container-exists.1.html
- Podman official documentation: podman-ps - https://docs.podman.io/en/v5.7.1/markdown/podman-ps.1.html

## Issues Found
- The multiple-container JSON filtering example used Docker-style fields (`.Actor.Attributes.name`). Podman's documented JSON Lines output uses top-level fields such as `.Name`, `.Status`, `.Time`, and `.Type`, so the jq selector was changed to use `.Name`.
- The same example comment said it was using grep even though the command uses jq. The comment was corrected to avoid misleading readers.
- The monitor script read the timestamp from `.time`, but Podman's documented JSON field is `.Time`. The jq expression was corrected.
- The monitoring script alerted on `die|oom`, but Podman's documented container event status is `died`, with `die` only mapped to `died` for Docker compatibility in filters. The script was changed to alert on `died`.
- The event filter example used `event=die`. Podman documents `died` as the container event status, while `die` is only a compatibility mapping, so the example now uses `event=died`.
- Historical event examples omitted `--stream=false`, even though Podman streams by default. The examples intended to return finite historical output now include `--stream=false`.
- The absolute timestamp examples omitted a timezone suffix. Podman documents `--since` and `--until` timestamps as RFC3339Nano or Go duration strings, so the examples now use `Z` UTC timestamps.

## Review Notes
Podman was not installed in the local environment, so command behavior was verified against official Podman documentation rather than local `--help` output. The official events documentation confirms the `container`, `event`, `label`, `type`, `--since`, `--until`, and `--format json` usage shown in the post.
