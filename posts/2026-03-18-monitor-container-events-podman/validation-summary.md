# Validation Summary: How to Monitor Container Events with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Container events
- Bash
- jq

## Sources Consulted
- Podman official documentation: podman-events manual, https://docs.podman.io/en/stable/markdown/podman-events.1.html

## Issues Found
- The introductory `podman events` example described the command as viewing "all recent events". The official Podman documentation says `podman events` streams new events by default, and previous events require `--since` or `--until`, so the comment was changed to "Stream new events".
- The post referred to "die events" and described them as unexpected termination events. Podman's documented container event status is `died`; the `die` filter is mapped to `died` for Docker compatibility. The wording was updated to "died events" while keeping the compatible `--filter event=die` command, and the stop example was narrowed to only claim it triggers stop events.
- The timestamp example for `--since` omitted a timezone. Podman's documentation specifies RFC3339Nano timestamps or Go duration strings, so the example was changed to `2026-03-18T10:00:00Z`.
- The Bash monitor script used Docker-style JSON fields (`.time`, `.Actor.Attributes.name`, `.Actor.ID`). Podman's documented JSON Lines output uses top-level fields such as `.Time`, `.Status`, `.Name`, and `.ID`, so the script was updated to read those fields.

## Review Notes
Podman was not installed in the local environment, so command behavior was verified against the current official Podman `podman-events` documentation rather than local `--help` output.
