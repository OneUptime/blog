# Validation Summary: How to Configure Static IPs for Podman Containers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Container networking
- Static IPv4 addressing
- Static IPv6 addressing
- Podman user-defined networks

## Sources Consulted
- Podman `podman run` official documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `podman network create` official documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman `podman network connect` official documentation: https://docs.podman.io/en/latest/markdown/podman-network-connect.1.html
- Podman `podman network inspect` official documentation: https://docs.podman.io/en/v5.7.1/markdown/podman-network-inspect.1.html
- Podman `podman inspect` official documentation: https://docs.podman.io/en/latest/markdown/podman-inspect.1.html

## Issues Found
- The examples reused static IPs and IPv4 subnets that could conflict if the tutorial was followed sequentially. Updated the frontend, backend, database, cache, api, dual-stack network, and production examples to use non-conflicting addresses and subnets.
- The summary said static IPs require a user-defined network with a specified subnet. Podman requires the static address to be within the network's IP address pool, but the subnet does not have to be explicitly specified in every case. Updated the wording to recommend explicit subnets for predictable address pools and state the actual pool requirement.

## Review Notes
Podman was not installed in the local review environment, so command behavior was checked against the current official Podman documentation rather than local `--help` output. The documented `--ip`, `--ip6`, `--subnet`, `--gateway`, and `podman network connect --ip` usage matches the corrected post.
