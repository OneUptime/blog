# Validation Summary: How to Configure fixed-cidr-v6 in Docker daemon.json

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker Engine
- Docker daemon configuration (`daemon.json`)
- IPv6
- CIDR and subnetting
- Linux bridge networking

## Sources Consulted
- Docker Docs: Use IPv6 networking — https://docs.docker.com/engine/daemon/ipv6/
- Docker Docs: Bridge network driver — https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs: `dockerd` CLI reference — https://docs.docker.com/reference/cli/dockerd/
- Docker Docs: `docker inspect` CLI reference — https://docs.docker.com/reference/cli/docker/inspect/
- Docker Docs: `docker network inspect` CLI reference — https://docs.docker.com/reference/cli/docker/network/inspect/
- RFC 4193: Unique Local IPv6 Unicast Addresses — https://www.rfc-editor.org/rfc/rfc4193
- RFC 4862: IPv6 Stateless Address Autoconfiguration — https://www.rfc-editor.org/rfc/rfc4862
- RFC 5375: IPv6 Unicast Address Assignment Considerations — https://www.rfc-editor.org/rfc/rfc5375.html
- RFC 7421: Analysis of the 64-bit Boundary in IPv6 Addressing — https://www.rfc-editor.org/rfc/rfc7421

## Issues Found
- The post recommended `/80` subnets for `fixed-cidr-v6` and used `/80` throughout the examples. I corrected those references to `/64` and updated the multi-host examples to unique `/64` subnets from a shared `/48`, because Docker's current IPv6 documentation uses `/64` for the default bridge and the IPv6 RFC guidance aligns `/64` with normal SLAAC-compatible host subnetting.
- The post said Docker assigns `/128` addresses and showed simplified examples such as `::2` and `::3`. I changed this to say Docker assigns individual IPv6 addresses from the configured subnet and updated the sample output to a `/64`-based address form that better matches current Docker IPv6 examples.
- The command `docker network inspect bridge | grep -A3 "v6"` would not reliably produce the sample output shown in the post. I replaced it with `docker network inspect bridge` and marked the shown lines as an excerpt from the full output.
- The container verification section depended on `ip` being present inside the `nginx` image. I replaced that with `docker inspect --format ...` so the verification uses Docker's own inspect output instead of image-specific tooling.

## Review Notes
- Docker documents the default `bridge` network as a legacy detail and does not recommend it for production use. The post is still technically relevant because it specifically explains how to configure that default bridge.
- `ip6tables` is valid in `daemon.json`, but Docker documents it as enabled by default, so it is optional rather than required.
- Docker 28.0.0 and later can enable `"ipv6": true` without also setting `fixed-cidr-v6`, but `fixed-cidr-v6` remains the correct setting when you want to choose the IPv6 subnet for the default bridge explicitly.
