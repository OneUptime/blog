# Validation Summary: How to Create a Bridge Network with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Netavark
- Aardvark DNS
- Linux bridge networking
- Linux networking commands

## Sources Consulted
- Podman `podman-network-create` official documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman `podman-network-inspect` official documentation: https://docs.podman.io/en/v5.7.1/markdown/podman-network-inspect.1.html
- Podman `podman-network` official documentation: https://docs.podman.io/en/latest/markdown/podman-network.1.html
- Podman `podman-run` official documentation: https://docs.podman.io/en/v5.4.1/markdown/podman-run.1.html

## Issues Found
- The DNS example used `podman network create --dns-enabled app-bridge`, but current Podman documentation does not list a `--dns-enabled` flag for `podman network create`; it provides `--disable-dns` to turn DNS off. Changed the command to `podman network create app-bridge`, preserving the explanation that DNS is enabled by default on custom bridge networks.
- The connectivity example used the `node:20` image for a container that runs `ping`. That image is not a reliable choice for a networking diagnostic command. Changed it to `alpine:latest`, which includes BusyBox networking tools.
- The host bridge interface example assumed the bridge interface is always `podman0`. Official inspect output exposes `.NetworkInterface`, and user-created networks can use other bridge interface names. Changed the example to inspect the network interface name first.
- The multiple-network isolation example implied separate Podman bridge networks are automatically isolated from each other. Podman documents the `--opt isolate` bridge option for blocking traffic between isolated networks. Added `--opt isolate` to both network creation commands and adjusted the surrounding wording.
- The multiple-network ping example used an `nginx` container to run `ping`, which is not reliable because web server images may not include that diagnostic command. Changed the test container image to `alpine:latest`.

## Review Notes
Podman was not installed in the local environment, so CLI behavior was validated against official Podman documentation rather than local `--help` output. The post is otherwise aligned with current Podman Netavark bridge-network behavior.
