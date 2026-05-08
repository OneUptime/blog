# Validation Summary: How to Inspect a Podman Machine Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman Machine
- Virtual machines
- JSON and jq
- Bash scripting

## Sources Consulted
- Podman machine inspect official documentation: https://docs.podman.io/en/stable/markdown/podman-machine-inspect.1.html
- Podman machine list official documentation: https://docs.podman.io/en/latest/markdown/podman-machine-list.1.html
- Podman machine init official documentation: https://docs.podman.io/en/latest/markdown/podman-machine-init.1.html
- Podman Go package documentation for machine inspect structures: https://pkg.go.dev/github.com/containers/podman/v6/pkg/machine

## Issues Found
- `podman machine inspect` output was described as a JSON object, and the `jq` examples used top-level object paths such as `.Resources.CPUs`. Official Podman documentation shows the command returns a JSON array, even for a single machine. Updated the sample output and all single-machine `jq` examples to use `.[0]`.
- The SSH connection example queried `.ConnectionInfo`, which contains socket or pipe information, not SSH configuration. Updated it to query `.[0].SSHConfig`.
- Memory and disk units were labeled as MB and GB. Podman machine initialization and inspect fields are documented in MiB and GiB for memory and disk sizing, so labels were updated accordingly.
- The Linux configuration directory example pointed at `~/.local/share/containers/podman/machine/`. Official Podman documentation states the machine configuration file is managed under `$XDG_CONFIG_HOME/containers/podman/machine/`, so the default example was updated to `~/.config/containers/podman/machine/`.

## Review Notes
- `podman` was not installed in the review workspace, so command behavior was verified against official Podman documentation rather than local `--help` output.
- The Podman inspect output can vary by host platform, provider, and Podman version. The examples now use fields documented by current Podman documentation where possible.
