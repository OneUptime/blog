# Validation Summary: How to Use Pasta Networking with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Rootless container networking
- pasta
- passt
- slirp4netns
- containers.conf

## Sources Consulted
- Podman `podman-run(1)` documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman `podman-network(1)` documentation: https://docs.podman.io/en/latest/markdown/podman-network.1.html
- Podman `podman-info(1)` documentation: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- Podman installation documentation: https://podman.io/docs/installation
- passt/pasta official documentation: https://passt.top/passt/about/
- `containers.conf` reference from containers/common: https://github.com/containers/common/blob/main/docs/containers.conf.5.md

## Issues Found
- The post expanded pasta as "Package-specific Approach to Sockets Translation Architecture"; the official passt documentation expands it as "Pack A Subtle Tap Abstraction." Updated the expansion.
- The post described pasta as Podman's "networking backend." Podman uses "network backend" for Netavark/CNI, while pasta is the rootless networking tool or mode. Updated wording to avoid conflating those concepts.
- The availability check said `podman info --format '{{ .Host.Pasta.Executable }}'` checks which network backend Podman is using. That field reports the detected pasta executable, so the comment was corrected.
- The `containers.conf` example placed `default_rootless_network_cmd` under `[containers]`; Podman documents this setting under `[network]`. Updated the configuration snippet.
- The default verification command used `.Host.NetworkBackend`, which reports Netavark/CNI rather than pasta/slirp4netns. Replaced it with a short rootless container run and `podman inspect` check of the container network mode.

## Review Notes
The examples are intended for rootless Podman on Linux. The `passt` package is the expected package name on Fedora/RHEL and Ubuntu/Debian, and it provides the pasta functionality used by Podman.
