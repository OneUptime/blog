# Validation Summary: How to List Farms with podman farm list

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman farm commands
- Podman remote system connections
- Bash scripting
- Go template formatting
- JSON output

## Sources Consulted
- Official Podman documentation: podman-farm-list, https://docs.podman.io/en/stable/markdown/podman-farm-list.1.html
- Official Podman documentation: podman-farm, https://docs.podman.io/en/v5.3.0/markdown/podman-farm.1.html
- Official Podman documentation: podman-farm-create, https://docs.podman.io/en/v4.9.0/markdown/podman-farm-create.1.html
- Official Podman documentation: podman, global --connection option, https://docs.podman.io/en/latest/markdown/podman.1.html
- Official Podman documentation: podman-info, https://docs.podman.io/en/stable/markdown/podman-info.1.html

## Issues Found
- The post treated `.Connections` as a comma-separated string in table output, JSON output, and shell examples. Official Podman documentation shows `.Connections` as a list/slice: table and Go template output render it like `[f38 f37]`, while JSON renders it as an array. Updated the default output and JSON examples accordingly.
- The examples for counting farms with more than one connection and listing connections for a specific farm split `.Connections` on commas. Updated them to use Go template `range` output and whitespace-based shell processing.
- The status script used a dynamically quoted Go template and comma splitting for `.Connections`. Updated it to render each farm with its connections via `range` and select the matching farm with `awk`.
- The empty-list example showed only `Name` and `Connections` headers. Official output includes `Default` and `ReadWrite` columns, so the comment was corrected.

## Review Notes
The local environment does not have `podman` installed, so command behavior was validated against official Podman documentation rather than local `--help` output. The `podman --connection` global option and `podman info --format` usage are documented and current.
