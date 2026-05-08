# Validation Summary: How to Configure Podman Machine for Rootless Mode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman Machine
- Rootless containers
- Linux user namespaces
- Subordinate UID/GID mappings
- Rootless networking
- Container storage configuration

## Sources Consulted
- Podman machine init documentation: https://docs.podman.io/en/latest/markdown/podman-machine-init.1.html
- Podman machine set documentation: https://docs.podman.io/en/stable/markdown/podman-machine-set.1.html
- Podman machine inspect documentation: https://docs.podman.io/en/stable/markdown/podman-machine-inspect.1.html
- Podman machine SSH documentation: https://docs.podman.io/en/v4.4/markdown/podman-machine-ssh.1.html
- Podman network documentation: https://docs.podman.io/en/latest/markdown/podman-network.1.html
- Podman top documentation: https://docs.podman.io/en/stable/markdown/podman-top.1.html
- Official Podman rootless tutorial: https://github.com/containers/podman/blob/main/docs/tutorials/rootless_tutorial.md
- Official Podman for Windows rootful/rootless notes: https://github.com/containers/podman/blob/main/docs/tutorials/podman-for-windows.md

## Issues Found
- `podman machine inspect my-machine | jq '.Rootful'` was incorrect because `podman machine inspect` returns a JSON array. Changed it to `jq '.[0].Rootful'` in the main example and quick reference so it returns the documented `Rootful` field.
- The user namespace note said container root maps to the user's UID range. In rootless Podman, container UID 0 maps to the user's host UID, while additional container UIDs map into subordinate ID ranges. Updated the comment to reflect this accurately.
- The storage configuration example said to edit `~/.config/containers/storage.conf` but used `cat`, which only displays the file. Changed it to `vi` so the command matches the instruction.
- The custom network example used `ping` from a `node:20` container. That image may not reliably include `ping`, and ICMP can also depend on rootless network configuration. Changed the verification command to `getent hosts web`, which demonstrates same-network name resolution without relying on ICMP tooling.

## Review Notes
The port-binding guidance is technically correct, but lowering `net.ipv4.ip_unprivileged_port_start` is a machine-wide change inside the Podman VM and should be evaluated carefully for shared environments. The post remains version-neutral and aligns with current Podman documentation as of 2026-05-08.
