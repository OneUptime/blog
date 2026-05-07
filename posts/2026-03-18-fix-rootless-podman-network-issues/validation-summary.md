# Validation Summary: How to Fix Rootless Podman Network Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Podman
- Rootless containers
- slirp4netns
- pasta / passt
- containers.conf
- Linux networking
- firewalld
- nftables
- systemd-resolved

## Sources Consulted
- Podman `podman-run(1)` official documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman `podman-network(1)` official documentation: https://docs.podman.io/en/latest/markdown/podman-network.1.html
- Podman `podman-network-create(1)` official documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman `podman-system-reset(1)` official documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-system-reset.1.html
- Podman rootless tutorial: https://github.com/containers/podman/blob/main/docs/tutorials/rootless_tutorial.md
- containers/common `containers.conf(5)` documentation: https://github.com/containers/common/blob/main/docs/containers.conf.5.md
- Podman basic networking guide: https://github.com/containers/podman/blob/main/docs/tutorials/basic_networking.md

## Issues Found
- The post described `podman info --format '{{.Host.NetworkBackend}}'` as checking the rootless networking backend. That field identifies Podman's network backend, such as netavark or CNI, not whether a rootless container is using pasta or slirp4netns. I changed the surrounding text to distinguish the Podman network backend from rootless networking tools.
- The introduction and rootless networking section overstated that rootless Podman cannot create real bridges or manipulate iptables. Modern Podman rootless networking has multiple modes, while the default rootless path uses pasta or slirp4netns. I narrowed the wording to the default rootless path.
- The connectivity tests used `ping`. Podman's own rootless documentation notes that ping can require additional host configuration on some systems, so it is not a reliable proof of rootless container networking. I changed the examples to use HTTP requests with `wget`.
- The `podman system reset` example did not warn that the command removes much more than network state. Official documentation says it removes containers, pods, images, networks, volumes, machines, and storage directories. I added a warning comment to the command block.
- The firewalld example added `podman0` to the trusted zone. `podman0` is associated with rootful bridge networking and is not the right general fix for rootless published ports. I replaced it with allowing the published host port through firewalld.

## Review Notes
- Podman was not installed in the local workspace, so CLI behavior was verified against official Podman documentation rather than local `--help` output.
- The post uses public DNS resolvers such as `8.8.8.8`; technically valid, but readers in controlled environments may need organization-approved resolvers.
