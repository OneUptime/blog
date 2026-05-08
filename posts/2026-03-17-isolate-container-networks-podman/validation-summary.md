# Validation Summary: How to Isolate Container Networks in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Container networking
- Podman bridge networks
- Network isolation

## Sources Consulted
- Podman `podman-network-create` official documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman `podman-run` official documentation: https://docs.podman.io/en/v4.4/markdown/podman-run.1.html
- Podman `podman-network` official documentation: https://docs.podman.io/en/stable/markdown/podman-network.1.html

## Issues Found
- The post stated that Podman isolates containers on different user-defined networks by default. Current Podman documentation describes the bridge `isolate` option as the mechanism that blocks traffic between networks that have that option enabled. I changed the network creation commands to use `podman network create --opt isolate=1` and updated the surrounding explanation.
- The post described `--internal` as stricter isolation within the same network and used the section title "Disabling Inter-Container Communication." Podman documents `--internal` as restricting external access and, for bridge networks, disabling IP forwarding on the bridge and omitting a default route. I updated the section title and explanation to describe external access restriction instead of inter-container communication blocking.

## Review Notes
- The `podman run --network` examples are consistent with Podman's documented support for connecting a container to a user-defined network and using `--network` multiple times for additional networks.
- The `--internal` example correctly demonstrates blocked outbound access to an external IP.
