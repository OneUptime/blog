# Validation Summary: How to List All Podman Machines

## Status
validated

## Post Type
Tutorial / CLI guide

## Technologies Covered
- Podman
- Podman Machine
- Shell scripting
- jq
- Go template formatting

## Sources Consulted
- Official Podman documentation: `podman-machine-list` command, options, examples, JSON fields, and Go template placeholders: https://docs.podman.io/en/latest/markdown/podman-machine-list.1.html
- Official Podman documentation: `podman-machine-init` command and platform/provider context for Podman machines: https://docs.podman.io/en/latest/markdown/podman-machine-init.1.html
- Local CLI check attempted with `podman machine ls --help`, but Podman is not installed in this environment.

## Issues Found
- The post claimed that an asterisk next to the machine name marks the active/default machine. The current official `podman machine list` documentation does not show an asterisk marker; it exposes default status through the `Default` field in JSON and Go template output. I removed the asterisk from the sample output and changed the explanation to recommend checking the `Default` field.
- The `NAME` column description repeated the asterisk behavior. I changed it to describe only the machine name.
- The JSON examples did not show how to identify the default machine after removing the asterisk claim. I added a `jq` example using `.Default == true`, which matches the documented JSON field.
- The custom format examples did not show the documented `Default` field. I added a format example for `{{.Default}}`.
- One comment said the custom memory output was "readable"; the official JSON example shows memory and disk size values can be raw byte strings. I changed the comment to avoid implying a guaranteed human-readable unit conversion.

## Review Notes
The remaining commands and flags are consistent with the official `podman-machine-list` documentation: `podman machine list`, `podman machine ls`, `--format json`, Go template formatting, and `--noheading` are documented. The official docs also list additional fields such as `IdentityPath`, `Port`, `RemoteUsername`, `Swap`, and `UserModeNetworking`, but the post does not need to enumerate every available field.
