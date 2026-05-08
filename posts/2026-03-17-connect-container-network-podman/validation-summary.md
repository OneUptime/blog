# Validation Summary: How to Connect a Container to a Network with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Containers
- Container networking
- Multi-network container architectures
- DNS aliases
- Static container IP addresses

## Sources Consulted
- Podman official documentation: `podman network connect` - https://docs.podman.io/en/latest/markdown/podman-network-connect.1.html
- Podman official documentation: `podman network create` - https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman official documentation: `podman run` - https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman official documentation: `podman ps` - https://docs.podman.io/en/latest/markdown/podman-ps.1.html
- Podman official documentation: `podman inspect` - https://docs.podman.io/en/latest/markdown/podman-inspect.1.html

## Issues Found
- The `backend` network was created without an explicit subnet, but the static IP example used `10.10.0.50`. Podman assigns a free subnet when no subnet is provided, so that address would not necessarily be in the network's IP pool. Changed the `backend` network creation command to use `--subnet 10.10.0.0/24`.
- The static IP and alias examples attempted to connect `api-gateway` to `backend` after it had already been connected in the earlier example. Added `podman network disconnect backend api-gateway` before the alternate connection examples so the commands can run in sequence.
- The verification commands used `podman exec ... ping` inside `nginx` and `node` containers, which may not include the `ping` binary. Changed those checks to run temporary Alpine containers in the target containers' network namespaces using `--network container:<name>`.

## Review Notes
Local `podman` was not installed in the review environment, so commands were verified against official Podman CLI documentation rather than executed locally.
