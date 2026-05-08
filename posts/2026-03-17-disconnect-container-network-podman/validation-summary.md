# Validation Summary: How to Disconnect a Container from a Network with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Container networking
- CLI workflows
- Network isolation

## Sources Consulted
- Podman official documentation: `podman-network-disconnect` - https://docs.podman.io/en/stable/markdown/podman-network-disconnect.1.html
- Podman official documentation: `podman-network-connect` - https://docs.podman.io/en/stable/markdown/podman-network-connect.1.html
- Podman official documentation: `podman-ps` - https://docs.podman.io/en/v5.7.1/markdown/podman-ps.1.html
- Podman official documentation: `podman-network-rm` - https://docs.podman.io/en/latest/markdown/podman-network-rm.1.html
- Podman official documentation: `podman-inspect` - https://docs.podman.io/en/latest/markdown/podman-inspect.1.html

## Issues Found
- The network removal workflow used `podman ps --filter network=staging`, which only lists running containers by default. Because `podman network rm` fails when a network is in use by a container or pod, stopped containers should be included too. Changed the examples to use `podman ps -a --filter network=staging`.
- The verification command used `podman ps --filter network=mynetwork`, which only confirms that no running containers are attached. Changed it to `podman ps -a --filter network=mynetwork` so it checks all containers.
- The `--force` comment said it disconnects even if there are active connections. The official documentation describes the option as forcing the container to disconnect from the network, without making an active-connection-specific claim. Reworded the comment to match the documented behavior.

## Review Notes
The command syntax for `podman network disconnect [options] network container`, `podman network connect network container`, Go-template inspect output, and the behavior that a container with all networks disconnected has no network connectivity are consistent with current official Podman documentation.
