# Validation Summary: How to Filter Container Events by Type in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman events CLI
- Bash
- jq
- Go template formatting

## Sources Consulted
- Official Podman `podman-events` documentation: https://docs.podman.io/en/stable/markdown/podman-events.1.html
- Official Podman `podman-pod-rm` documentation: https://docs.podman.io/en/v5.4.0/markdown/podman-pod-rm.1.html

## Issues Found
- The post said Podman supports five event types, but current Podman documentation also lists `network` and `secret` event types. Updated the description, introduction, event type list, and summary to include them.
- The container event status list was incomplete and used `die` instead of the documented `died` status. Updated the list to match the current official status names and changed the JSON filter example to `event=died`.
- The image event status list was incomplete. Added the documented `loadFromArchive`, `mount`, `pull-error`, and `unmount` statuses.
- The volume example included `podman volume inspect`, but current Podman event documentation lists volume statuses as `create`, `prune`, and `remove`; `inspect` is not a documented volume event status. Removed that command from the event-generation example.
- The multi-type monitor used Docker-style JSON fields under `.Actor`, but Podman `events --format json` documents top-level fields such as `.Type`, `.Status`, `.Name`, and `.ID`. Updated the `jq` expression to read `.Name // .ID`.

## Review Notes
Local `podman` was not installed in the review environment, so command behavior was validated against official Podman documentation rather than local `--help` output. The official docs also note that `die` is mapped to `died` for Docker compatibility, but the post now uses Podman's documented `died` status directly.
