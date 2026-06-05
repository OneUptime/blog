# Validation Summary: How to Configure Docker with IPv6-Only Networking

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Docker Engine
- Docker bridge networking
- IPv6 and IPv6-only container networks
- Docker Compose networking
- Linux ip6tables and IPv6 forwarding
- DNS resolution in Docker containers

## Sources Consulted
- Docker Docs: Use IPv6 networking: https://docs.docker.com/engine/daemon/ipv6/
- Docker Docs: Bridge network driver: https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs: docker network create CLI reference: https://docs.docker.com/reference/cli/docker/network/create/
- Docker Docs: Port publishing and mapping: https://docs.docker.com/engine/network/port-publishing/
- Docker Docs: Compose networks reference: https://docs.docker.com/reference/compose-file/networks/
- Docker Docs: Docker with iptables: https://docs.docker.com/engine/network/firewall-iptables/
- Docker Docs: Networking overview and DNS services: https://docs.docker.com/engine/network/
- Docker CLI help from local Docker 29.4.2 for `docker network create` and `docker run`.
- RFC 4193: Unique Local IPv6 Unicast Addresses: https://www.rfc-editor.org/rfc/rfc4193
- RFC 3849: IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849
- RFC 8200: Internet Protocol, Version 6 (IPv6) Specification: https://www.rfc-editor.org/rfc/rfc8200

## Issues Found
- The daemon configuration examples used `//` comments inside `json` code blocks, which would make `/etc/docker/daemon.json` invalid JSON. Removed the comments from the snippets and moved the file path into prose.
- The daemon example included `"experimental": true` and described it as required for older IPv6 features. Current Docker IPv6 documentation does not require experimental mode for the documented features, so the setting and bullet were removed.
- The default bridge IPv6 range used `fd00:dead:beef::/48`. Docker documentation recommends normal IPv6 bridge subnets at `/64` or shorter and uses `/64` in its examples, so the example was changed to `fd00:dead:beef::/64` for consistency with current guidance.
- The custom network described as IPv6-only did not disable IPv4. Docker enables IPv4 address assignment by default on user-defined bridge networks, so `--ipv4=false` was added to IPv6-only `docker network create` examples.
- The Postgres static IPv6 example placed `-e POSTGRES_PASSWORD=secret` after the image name, which would pass it to the container command rather than to Docker. Moved the environment option before `postgres:16-alpine`.
- The DNS section said IPv6-only custom networks return both A and AAAA records. With IPv4 disabled, container name resolution should return AAAA records for that network, so the wording was corrected.
- The Compose IPv6-only example omitted IPv4 disablement. Added `enable_ipv4: false` and noted that this requires Docker Compose 2.33.1 or later, matching the Compose networks reference.
- The NAT66 example used a source prefix that did not match the article's custom IPv6-only network. Changed the source to `fd00:1::/64` and clarified that Docker bridge networks masquerade by default unless that behavior is disabled or firewall rules are managed manually.
- The globally routed prefix example used `2001:db8:1::/64` without noting that `2001:db8::/32` is reserved for documentation. Added a note to replace it with the reader's actual routed prefix.

## Review Notes
The main Docker and Compose examples are now aligned with current Docker documentation and local Docker CLI help. The full Compose example was also parsed successfully with `docker compose -f - config -q`. No live containers were started during validation, so runtime connectivity was reviewed against official behavior rather than exercised on this host.
