# Validation Summary: How to Use Buildah for Debugging Container Builds

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Buildah
- Podman
- Containerfiles
- Linux containers
- Ubuntu apt package management
- Alpine apk package management
- Python and Flask

## Sources Consulted
- Buildah run man page: https://man.archlinux.org/man/buildah-run.1.en
- Buildah config man page: https://www.mankier.com/1/buildah-config
- Buildah copy man page: https://www.mankier.com/1/buildah-copy
- Buildah inspect man page: https://www.mankier.com/1/buildah-inspect
- Buildah unshare man page: https://manpages.debian.org/trixie/buildah/buildah-unshare.1.en.html
- Red Hat Buildah documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/building_running_and_managing_containers/working-with-containers-using-buildah
- Podman run man page: https://man.archlinux.org/man/podman-run.1.en

## Issues Found
- The apt sources inspection command used `cat /etc/apt/sources.list.d/*.list` directly with `buildah run`. Because `buildah run` executes the command without a shell unless one is explicitly invoked, the wildcard would be passed literally to `cat` instead of expanding inside the container. I changed it to run through `sh -c` and to inspect both `/etc/apt/sources.list` and `/etc/apt/sources.list.d/*`, which also covers modern Debian-style `.sources` files used by slim Python images.

## Review Notes
- Buildah and Podman were not installed in the review workspace, so command verification was performed against official and authoritative man pages rather than local `--help` output.
- The examples are technically sound as debugging workflows. Some commands depend on network access and package repositories being reachable at execution time.
