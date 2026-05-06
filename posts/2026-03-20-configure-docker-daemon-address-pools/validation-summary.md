# Validation Summary: How to Configure Docker Daemon Default Address Pools for IPv4

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker Engine
- Docker networking
- IPv4
- `daemon.json`
- Linux `systemd`

## Sources Consulted
- Docker docs, Networking overview: https://docs.docker.com/engine/network/
- Docker docs, `dockerd` CLI reference: https://docs.docker.com/reference/cli/dockerd/
- Docker docs, `docker network create` CLI reference: https://docs.docker.com/reference/cli/docker/network/create/
- Docker docs, Docker daemon configuration overview: https://docs.docker.com/engine/daemon/

## Issues Found
- The post stated that Docker "will pick" specific `/24` subnets in a fixed sequence. Docker documents automatic allocation from default pools, but it also attempts to avoid address prefixes already in use on the host. I changed the wording to an example-based claim (`can allocate`) so it stays accurate.
- The verification step used `docker network inspect ... | grep '"Subnet"'`, which works but is less precise than Docker's built-in formatting. I changed it to `docker network inspect test-pool --format '{{(index .IPAM.Config 0).Subnet}}'` so the command prints the subnet directly.
- The explanation of `bip` said it controls only the subnet. Docker documents `bip` as the IPv4 address for the default bridge, so I corrected the wording to say it sets the default bridge IP address and subnet.
- The post said Docker exhausts the first pool before moving to the second and that `/28` means "14 hosts max". I replaced that with wording that stays accurate without overcommitting to undocumented allocation-order behavior, and I noted that Docker also assigns a gateway address inside the subnet.

## Review Notes
- The post is Linux-specific because it uses `/etc/docker/daemon.json` and `systemctl restart docker`. Docker's daemon configuration path differs in rootless mode and on non-Linux platforms.
- I validated the JSON configuration syntax locally with `dockerd --validate` using the documented `default-address-pools` structure.
