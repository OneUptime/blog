# Validation Summary: How to Run Multiple Podman Machines Simultaneously

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman Machine
- Podman remote connections
- jq
- macOS and Windows virtualization considerations

## Sources Consulted
- Official Podman `podman-machine-start` documentation: https://docs.podman.io/en/latest/markdown/podman-machine-start.1.html
- Official Podman `podman-machine-init` documentation: https://docs.podman.io/en/latest/markdown/podman-machine-init.1.html
- Official Podman `podman-machine-list` documentation: https://docs.podman.io/en/stable/markdown/podman-machine-list.1.html
- Official Podman `podman-machine-inspect` documentation: https://docs.podman.io/en/stable/markdown/podman-machine-inspect.1.html
- Official Podman global options documentation for `--connection`: https://docs.podman.io/en/latest/markdown/podman.1.html
- Official Podman `podman-system-connection-list` documentation: https://docs.podman.io/en/v4.9.0/markdown/podman-system-connection-list.1.html

## Issues Found
- The post claimed that multiple Podman machines can run simultaneously. Official Podman documentation states that only one Podman-managed VM can be active at a time and `podman machine start` returns an error if another VM is already running. I changed the post to describe creating multiple machines and switching between them.
- The "Starting Multiple Machines" example attempted to start three machines at once. I changed it to start one machine and updated the sample `podman machine ls` output so only one machine is running.
- The "Starting All Machines with a Script" example attempted to start every configured machine. I changed it to a switching script that stops the currently running machine before starting the target machine.
- The container examples implied that containers could be launched across several simultaneously running machines. I changed the examples to start and stop machines sequentially before using `podman --connection`.
- The resource script used `podman machine inspect "$machine" | jq '.Resources.CPUs'`, but `podman machine inspect` returns a JSON array. I changed it to index the first result before reading `.Resources`.
- The total resource calculation treated `podman machine ls --format json` memory as if it were already in megabytes. Official examples show `Memory` as a byte string, so I changed the calculation to convert bytes to MiB.
- The platform note referred to "Linux with WSL." WSL is a Windows provider, so I changed the wording to "Windows with WSL."

## Review Notes
The local environment did not have the `podman` binary installed, so command behavior was verified against the current official Podman documentation rather than local `--help` output.
