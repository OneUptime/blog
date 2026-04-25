# Validation Summary: How to Configure Podman with IPv6 Networking

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Netavark
- IPv6
- Podman pods
- Rootless Podman
- `pasta` / `passt`
- Compose / `podman compose`

## Sources Consulted
- Podman network docs: https://docs.podman.io/en/latest/markdown/podman-network.1.html
- Podman network create docs: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman run docs: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman pod create docs: https://docs.podman.io/en/latest/markdown/podman-pod-create.1.html
- Podman compose docs: https://docs.podman.io/en/latest/markdown/podman-compose.1.html
- Official Podman rootless tutorial: https://github.com/containers/podman/blob/main/docs/tutorials/rootless_tutorial.md
- Compose Specification: https://compose-spec.github.io/compose-spec/spec.html
- Docker Compose network reference for `enable_ipv6`: https://docs.docker.com/reference/compose-file/networks/
- RFC 4193, Unique Local IPv6 Unicast Addresses: https://www.rfc-editor.org/rfc/rfc4193
- RFC 4291, IPv6 Addressing Architecture: https://datatracker.ietf.org/doc/rfc4291/

## Issues Found
- The post incorrectly described Podman networking as CNI-based by default and referenced `/etc/cni/net.d/87-podman.conflist`. Current Podman documentation describes Netavark as the networking backend, so I updated the explanation, tags, IPv6 check command, and default-network configuration section accordingly.
- Multiple IPv6 examples used invalid address literals such as `fd00:podman::/64`, `fd00:podman-ipv6::/64`, and `fd00:compose::/64`. IPv6 hextets must be hexadecimal, so I replaced them with valid ULA examples.
- The container reachability example assumed a hard-coded IPv6 address. I made the container IPv6 assignment explicit with `--ip6` so the example is deterministic and the `curl -6` command matches the configured address.
- The Compose example used the obsolete top-level `version` field and older `podman-compose` command spelling. I updated it to a current `compose.yaml` example and `podman compose` usage, while keeping the note that Podman Compose runs through an external compose provider.
- The Compose verification command only listed services and did not actually verify IPv6. I changed it to an `exec` command that shows the service's IPv6 addresses.
- The rootless section described `slirp4netns` as the required default and `pasta` as merely newer. Current Podman documentation says `pasta` is the default rootless networking tool, so I corrected that description and kept the explicit `containers.conf` example.
- The verification section used a placeholder `ping6` target that could not work as written. I replaced it with a concrete second container attached to the same custom network and a real `ping -6` test.

## Review Notes
- `podman compose` is a thin wrapper around an external Compose provider such as `docker-compose` or `podman-compose`, so the example assumes one of those providers is installed.
- Recreating the default `podman` bridge requires stopping and removing containers attached to that network first.
- The examples target Linux hosts, which matches the post tags; Podman networking behavior differs on `podman machine` environments.
