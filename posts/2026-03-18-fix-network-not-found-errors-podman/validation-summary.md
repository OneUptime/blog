# Validation Summary: How to Fix 'network not found' Errors in Podman

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Podman
- Netavark
- CNI
- Aardvark DNS
- Rootless and rootful container networking
- Docker Compose / podman-compose network configuration

## Sources Consulted
- Podman latest network command documentation: https://docs.podman.io/en/latest/markdown/podman-network.1.html
- Podman 5.2 network command documentation for CNI/Netavark backend behavior: https://docs.podman.io/en/v5.2.0/markdown/podman-network.1.html
- Podman global options documentation for `--network-config-dir` paths: https://docs.podman.io/en/v5.3.2/markdown/podman.1.html
- Podman network create documentation for `--subnet`, `--gateway`, and `--disable-dns`: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman network inspect documentation for Netavark JSON fields and `DNSEnabled`: https://docs.podman.io/en/v5.7.1/markdown/podman-network-inspect.1.html
- Podman ps documentation for `.Networks` format placeholder: https://docs.podman.io/en/v5.7.1/markdown/podman-ps.1.html
- Netavark project documentation: https://github.com/containers/netavark
- Podman project README for current networking stack overview: https://github.com/containers/podman

## Issues Found
- The post described Podman generally as supporting both CNI and Netavark. Updated this to specify Podman 4.x, and added the current upstream caveat that Netavark is the current backend while CNI was deprecated in Podman 4.x and removed from the main upstream path in Podman 5.
- The post stated that rootless Netavark network configs are stored in `~/.config/containers/networks/`. Official Podman docs state rootless Netavark uses `$graphroot/networks`, commonly `$HOME/.local/share/containers/storage/networks/`, so the path and related commands were corrected.
- The post implied the `podman` bridge network must exist for every setup. Updated this to distinguish rootful Podman's `podman` bridge network from rootless Podman's common default `pasta` networking mode.
- The CNI rollback instructions were too broad for current Podman releases. Added a Podman 4.x / CNI plugin caveat and noted that backend changes require resetting Podman state and recreating networks.
- The `podman system reset` comment said it reset only network configuration. Corrected it to state that it resets Podman's state, including containers, images, volumes, and networks.
- The reboot section used the incorrect rootless Netavark config path and referred to a generic config directory. Updated it to use the rootless graphroot path.

## Review Notes
Podman was not installed in the local environment, so CLI behavior was verified against official Podman documentation rather than local `--help` output. The post still gives destructive commands such as `podman rm -a -f` and `podman system reset`; these are technically valid, but future editorial review may want to add stronger backup/export guidance before those commands.
