# Validation Summary: How to Format Container List Output in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- `podman ps`
- Go templates
- JSON output
- `jq`
- Shell aliases and Bash scripting

## Sources Consulted
- Podman `podman-ps` official documentation: https://docs.podman.io/en/v5.7.1/markdown/podman-ps.1.html
- Podman v5.7.1 source for `podman ps` JSON and template output behavior: https://github.com/containers/podman/blob/v5.7.1/cmd/podman/containers/ps.go
- Podman v5.7.1 source for container list JSON fields: https://github.com/containers/podman/blob/v5.7.1/pkg/domain/entities/types/container_ps.go
- Containers common report package template functions: https://pkg.go.dev/github.com/containers/common/pkg/report
- `jq` manual for `@csv`: https://jqlang.github.io/jq/manual/

## Issues Found
- The post claimed to cover all available format fields, but current Podman exposes additional fields such as `.AutoRemove`, `.CIDFile`, `.ImageID`, `.CreatedHuman`, `.Restarts`, and `.StartedAt`. Changed the wording to "commonly used format fields" and "common template fields" to avoid an inaccurate completeness claim.
- The JSON examples used `.Names` as if it were a single container name. Podman's JSON output exposes `Names` as an array, while the Go template `{{.Names}}` renders the display name. Updated the `jq` examples to use `.Names[0]`.
- The CSV example generated comma-separated template output directly, which can break when fields such as port mappings contain commas. Updated it to use Podman JSON output with `jq @csv` so fields are CSV-escaped correctly.

## Review Notes
The installed environment did not have a usable `podman` binary, so runtime checks were performed against official documentation and the Podman v5.7.1 source. The template functions `upper`, `lower`, and `truncate` are provided by the containers common report package used by Podman formatting.
