# Validation Summary: How to Configure Default Network Backend in containers.conf

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Podman
- containers.conf
- Netavark
- Aardvark-dns
- CNI
- Container networking and DNS

## Sources Consulted
- Podman network documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-network.1.html
- Podman network create documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-network-create.1.html
- Podman system reset documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-system-reset.1.html
- containers.conf(5) manual: https://man.archlinux.org/man/containers.conf.5.en
- Red Hat documentation for switching Podman network stacks: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/building_running_and_managing_containers/assembly_setting-container-network-modes_building-running-and-managing-containers
- Podman blog on Netavark and Aardvark-dns: https://podman.io/blogs/2022/02/04/network-usage

## Issues Found
- The DNS configuration example placed `dns_servers` under `[network]`. The current `containers.conf(5)` manual documents `dns_servers` under the container defaults, so the example was updated to use `[containers]` for default container DNS servers while keeping `network_backend` under `[network]`.
- The summary incorrectly grouped DNS servers with `[network]` settings. It now distinguishes default subnets and subnet pools in `[network]` from default container DNS servers in `[containers]`.
- The Netavark/Aardvark verification commands used `which`, but these helper binaries are commonly installed under `/usr/libexec/podman` and may not be on `PATH`. The commands now check both `PATH` and the common helper-binary path.
- The CNI DNS bullet stated that CNI "uses dnsmasq for DNS" as a blanket rule. This was narrowed to plugin-based DNS when configured, matching the plugin-based nature of CNI networking.

## Review Notes
The backend switching guidance is intentionally destructive because `podman system reset` removes pods, containers, images, networks, volumes, build cache, and related state. Official migration guidance recommends resetting when existing containers or pods are present, and Red Hat documentation also recommends rebooting after switching the network stack.
