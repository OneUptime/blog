# Validation Summary: How to Filter Container List by Status in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman CLI
- Container status filtering
- Shell commands
- jq
- awk

## Sources Consulted
- Official Podman `podman-ps` documentation: https://docs.podman.io/en/v5.7.1/markdown/podman-ps.1.html
- Local environment check: `podman ps --help` and `podman version` attempted, but `podman` is not installed in this workspace.

## Issues Found
- The available status filter list included `dead` and `removing`, which are not valid `podman ps --filter status=` values in the current official Podman documentation. Replaced them with the documented `initialized` and `unknown` statuses.
- The "everything except running" command omitted documented non-running states. Updated it to include `initialized` and `unknown`.
- The cleanup example used `status=dead`, which is not a documented Podman container status filter. Updated it to use `status=unknown`.
- The dashboard loop included `dead` and omitted `initialized` and `unknown`. Updated the loop to use the documented status filter values.
- The "all non-running containers (exited + created)" comment overstated the command's coverage. Changed it to "common non-running containers" because it only filters two non-running states.

## Review Notes
- The official documentation states that multiple filters with the same key are inclusive, except for `label`, so the multiple `--filter status=...` examples are correct.
- The `--format` placeholders used in the post, including `.Names`, `.Status`, `.ExitCode`, `.Created`, and `.Image`, are documented by Podman.
