# Validation Summary: How to Filter Container Events by Event Status in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Container events
- Shell scripting
- jq
- Container health checks

## Sources Consulted
- Podman `events` official documentation: https://docs.podman.io/en/stable/markdown/podman-events.1.html
- Podman `run` official documentation for health check options: https://docs.podman.io/en/stable/markdown/podman-run.1.html
- Podman `healthcheck` official documentation: https://docs.podman.io/en/latest/markdown/podman-healthcheck.1.html

## Issues Found
- The post used `die` as the event status throughout. Updated the examples and prose to use the documented Podman status `died`, while noting that `event=die` is accepted as a Docker-compatible alias.
- The available container status list was incomplete and claimed broader coverage than it provided. Added documented container event statuses such as `attach`, `checkpoint`, `cleanup`, `connect`, `disconnect`, `exec_died`, `exited`, `import`, `prune`, `restore`, `sync`, and `update`, and softened the introduction from "all" statuses to the main container statuses covered by the guide.
- The alert script parsed Docker-style JSON at `.Actor.Attributes.name`, but Podman `events --format json` documents top-level fields such as `.Name`, `.Status`, and `.ContainerExitCode`. Updated the script to read `.Name` and prefer `.ContainerExitCode` before falling back to `podman inspect`.
- The alert script comment mentioned `oom` events, but the command did not filter for an `oom` event and Podman's documented container event statuses do not list `oom`. Updated the comment to match the actual `died` and `kill` filters.
- The summary and metadata referred to `die` events as the primary status. Updated them to use `died` for consistency with Podman documentation.

## Review Notes
The local environment did not have the `podman` binary installed, so command behavior was verified against official Podman documentation rather than local `--help` output. The shell snippets pass `bash -n` syntax validation after extracting the README's bash code blocks.
