# Validation Summary: How to Install Podman on Alpine Linux

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Alpine Linux
- Podman
- OpenRC
- apk package manager
- Rootless containers
- cgroups
- containers storage and registry configuration

## Sources Consulted
- Alpine Linux Wiki: Podman - https://wiki.alpinelinux.org/wiki/Podman
- Alpine Linux Wiki: OpenRC cgroups - https://wiki.alpinelinux.org/wiki/OpenRC
- Alpine Linux package contents: shadow-subids on Alpine 3.16 - https://pkgs.alpinelinux.org/contents?arch=x86_64&branch=v3.16&name=shadow-subids&repo=community
- Alpine Linux package contents: shadow on Alpine 3.16 - https://pkgs.alpinelinux.org/contents?arch=x86_64&branch=v3.16&name=shadow&repo=community
- Podman documentation: podman(1) - https://docs.podman.io/en/v5.3.2/markdown/podman.1.html
- Red Hat documentation: Configuring container registries - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/building_running_and_managing_containers/working-with-container-registries_building-running-and-managing-containers

## Issues Found
- The install command used `shadow-uidmap` and later relied on `usermod`. On Alpine 3.16+, `/usr/bin/newuidmap` and `/usr/bin/newgidmap` are provided by `shadow-subids`, while `/usr/sbin/usermod` is provided by `shadow`. Updated the package installation command to install `shadow` and `shadow-subids`, and corrected the explanatory text.
- The cgroups step was titled "Enable cgroups v2" and implied the commands specifically switch the system to cgroups v2. Alpine's OpenRC documentation states cgroups v2/unified mode is the default on current Alpine releases, while the commands enable and start the `cgroups` service. Updated the heading and wording to avoid implying a version-mode switch.

## Review Notes
The remaining commands and configuration snippets are consistent with Alpine's Podman guidance and Podman container registry/storage behavior. The OpenRC service example runs as a system service, so it manages rootful Podman containers unless adapted to run under a specific user account.
