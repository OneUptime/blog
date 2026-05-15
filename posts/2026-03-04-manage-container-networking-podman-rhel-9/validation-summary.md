# Validation Summary: How to Manage Container Networking with Podman on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Podman
- Netavark
- pasta
- slirp4netns
- Podman bridge, macvlan, and host networking
- Container DNS and port publishing

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Building, running, and managing containers, Chapter 10 "Managing a container network" - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/building_running_and_managing_containers/assembly_managing-a-container-network_building-running-and-managing-containers
- Red Hat Enterprise Linux 9 documentation: Building, running, and managing containers, Chapter 12 "Communicating among containers" - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/building_running_and_managing_containers/assembly_communicating-among-containers_building-running-and-managing-containers
- Red Hat Enterprise Linux 9 documentation: Building, running, and managing containers, Chapter 13 "Setting container network modes" - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/building_running_and_managing_containers/assembly_setting-container-network-modes_building-running-and-managing-containers
- Red Hat Enterprise Linux 9 documentation: Considerations in adopting RHEL 9, Chapter 6 "Containers" - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/considerations_in_adopting_rhel_9/assembly_containers_considerations-in-adopting-rhel-9
- Podman documentation: podman-network-create - https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman documentation: podman-run - https://docs.podman.io/en/v5.2.0/markdown/podman-run.1.html

## Issues Found
- The post stated that RHEL uses Netavark as the default and `pasta` for rootless networking without version or upgrade caveats. Updated this to specify fresh RHEL 9 installs for Netavark, note that upgraded systems can still use CNI, and clarify that `pasta` is the rootless default starting with RHEL 9.5 while earlier RHEL 9 releases use `slirp4netns`.
- The default networking section implied all containers without an explicit network join the default `podman` bridge. Updated it to specify rootful containers, because rootless containers use the configured rootless network mode instead.
- The MariaDB example placed `-e MYSQL_ROOT_PASSWORD=secret` after the image name, which would pass it as part of the container command rather than a Podman option. Moved the environment option before the image name.
- The DNS and troubleshooting examples used `ping`, `curl`, and `nslookup` inside the `nginx` image, where those tools are not reliably present. Replaced those checks with short-lived UBI 9 containers on the same network using `getent hosts` for DNS and `curl` for HTTP connectivity.

## Review Notes
Most commands and flags were current and matched Podman documentation, including `podman network create`, `--subnet`, `--gateway`, `--ipv6`, `--driver macvlan`, `-o parent=...`, `--ip`, `--network host`, `podman network connect`, `podman network disconnect`, `podman network rm`, and `podman network prune`. The macvlan examples are rootful-only in practice; the existing surrounding text now gives clearer rootful/rootless context, but a future post could call that out directly beside the macvlan commands.
