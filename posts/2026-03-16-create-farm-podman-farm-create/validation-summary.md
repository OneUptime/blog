# Validation Summary: How to Create a Farm with podman farm create

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman farm
- Podman system connections
- Remote container builds
- Multi-architecture container builds
- Bash scripting

## Sources Consulted
- Official Podman `podman-farm-create` documentation: https://docs.podman.io/en/latest/markdown/podman-farm-create.1.html
- Official Podman `podman-farm-list` documentation: https://docs.podman.io/en/latest/markdown/podman-farm-list.1.html
- Official Podman `podman-farm-update` documentation: https://docs.podman.io/en/latest/markdown/podman-farm-update.1.html
- Official Podman `podman-farm-remove` documentation: https://docs.podman.io/en/latest/markdown/podman-farm-remove.1.html
- Official Podman `podman-farm-build` documentation: https://docs.podman.io/en/latest/markdown/podman-farm-build.1.html
- Official Podman `podman-system-connection-add` documentation: https://docs.podman.io/en/latest/markdown/podman-system-connection-add.1.html
- Official Podman `podman` documentation: https://docs.podman.io/en/latest/markdown/podman.1.html

## Issues Found
- The prerequisite examples used SSH URLs with the remote socket path embedded directly in the destination. Current official examples use `--socket-path` to specify the remote Podman service socket for SSH destinations, so the examples were updated to pass `--socket-path /run/user/1000/podman/podman.sock` and use `user@host` as the destination.
- The expected `podman farm list` output omitted the `Default` and `ReadWrite` columns and formatted connections as a comma-separated string. Current official output shows `Name`, `Connections`, `Default`, and `ReadWrite`, with connections rendered as a bracketed list, so the sample output was corrected.
- The post said `podman farm create` takes one or more system connection names. Official documentation shows `podman farm create name [connections]` and states that an empty farm can be created, so the summary was changed to say the connections are optional.
- The configuration section implied that `containers.conf` was another place to check for command-created farm configuration. Official documentation says Podman-managed farms are stored in the Podman connections configuration file and that manual farm configuration should use the `[farm]` section in `containers.conf`, so the section was clarified.

## Review Notes
Podman was not installed in the local workspace, so CLI behavior was verified against the current official Podman documentation rather than local `--help` output.
