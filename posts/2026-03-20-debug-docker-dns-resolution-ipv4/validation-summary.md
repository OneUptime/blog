# Validation Summary: How to Debug Docker DNS Resolution Failures for IPv4 Services

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Docker (engine networking, embedded DNS resolver at 127.0.0.11)
- Docker CLI (`docker run`, `docker exec`, `docker inspect`)
- `/etc/docker/daemon.json` configuration
- DNS tooling (`nslookup`, `dig`, `ss`)
- iptables NAT (within container network namespaces)
- Linux `nsenter`
- glibc resolver `ndots` option (`/etc/resolv.conf`)

## Sources Consulted
- Docker networking & DNS: https://docs.docker.com/engine/network/#dns-services
- `docker run` CLI reference (flags `--dns`, `--dns-option`): https://docs.docker.com/reference/cli/docker/container/run/
- `dockerd` daemon configuration file (`dns`, `dns-opts`, `dns-search` keys): https://docs.docker.com/reference/cli/dockerd/#daemon-configuration-file
- Docker libnetwork embedded resolver behavior (ephemeral high port + iptables NAT inside the container's netns)
- glibc `resolv.conf(5)` man page (semantics of the `ndots` option)

## Issues Found
1. **`--dns-opt` flag is the older alias.** The canonical, currently documented flag for setting DNS options on `docker run` is `--dns-option` (per the official `docker run` reference). Replaced two occurrences of `--dns-opt` with `--dns-option` (Step 6 example and the troubleshooting table row).
2. **iptables inspection command targeted the wrong network namespace.** The post recommended `sudo iptables -t nat -L OUTPUT -n -v | grep 53` on the host to view the NAT redirect to Docker's DNS proxy, but those rules are installed by libnetwork inside the **container's** network namespace, not the host's. Running it on the host returns nothing relevant. Replaced with `sudo nsenter -t $(docker inspect -f '{{.State.Pid}}' my-container) -n iptables -t nat -L OUTPUT -n -v` and added a one-line note explaining why, so the diagnostic actually shows what the post claims it shows.

## Review Notes
- The `ss -ulnp | grep 53` step in Step 5 may not return a match in practice: Docker's embedded resolver listens on an ephemeral high port and relies on iptables DNAT (in the container's netns) to redirect `127.0.0.11:53` to that port. The command is still a reasonable smoke test (no output is itself a hint) so it was left as-is, but readers should not be surprised if nothing matches port 53.
- The "Expected for default bridge" snippet showing `nameserver 8.8.8.8` is illustrative; on the default bridge the container actually receives a copy of the host's `/etc/resolv.conf`, so contents will vary by host.
- The post does not call out a specific Docker Engine version. The `--dns-option` rename and the embedded DNS resolver have been stable for many years, so the guidance applies to all currently supported Docker Engine releases.
