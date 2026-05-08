# Validation Summary: How to Debug Network Connectivity in Podman Containers

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Podman
- Linux container networking
- Podman bridge networks
- Rootless Podman networking with pasta and slirp4netns
- firewalld, iptables, and nftables
- tcpdump and network debugging tools

## Sources Consulted
- Podman `podman run` documentation: https://docs.podman.io/en/v5.4.1/markdown/podman-run.1.html
- Podman `podman network` documentation: https://docs.podman.io/en/latest/markdown/podman-network.1.html
- Podman `podman network create` documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman `podman network connect` documentation: https://docs.podman.io/en/latest/markdown/podman-network-connect.1.html
- Podman command reference: https://docs.podman.io/en/stable/Commands.html

## Issues Found
- The container IP lookup used `.NetworkSettings.IPAddress`, which can be empty or less useful with named networks. Changed it to iterate through `.NetworkSettings.Networks` and print each network IP address.
- The container-to-container section said containers need a custom network to communicate. Podman containers need to share a network for direct communication; custom bridge networks are specifically useful for DNS-based container name resolution. Updated the wording accordingly.
- The rootless networking section labeled `podman info --format '{{.Host.NetworkBackend}}'` as the rootless network backend check. That command reports the Podman network backend, such as Netavark or CNI, not whether a container is using pasta or slirp4netns. Updated the comment and changed the process check to include both `slirp4netns` and `pasta`.
- The host tcpdump section assigned `CONTAINER_PID` but never used it, and it reused the less reliable `.NetworkSettings.IPAddress` lookup. Replaced the unused PID command with a `podman network inspect` command that shows the bridge interface, and updated the tcpdump IP lookup to use `.NetworkSettings.Networks`.

## Review Notes
- Current Podman documentation identifies pasta as the default rootless networking tool, while slirp4netns remains a supported explicit network mode when installed.
- The examples assume Linux tooling is available in the target containers. Minimal images may require installing tools such as `curl`, `ss`, `nslookup`, or `ip`.
