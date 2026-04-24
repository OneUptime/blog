# Validation Summary: How to Troubleshoot DNS Resolution Issues in Portainer

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Portainer
- Docker Engine networking
- Docker bridge and user-defined networks
- Docker Compose / Compose Specification
- DNS resolution and `/etc/resolv.conf`

## Sources Consulted
- Docker networking overview: https://docs.docker.com/engine/network/
- Docker bridge network driver: https://docs.docker.com/engine/network/drivers/bridge/
- Docker daemon troubleshooting (`dns` in `daemon.json`): https://docs.docker.com/engine/daemon/troubleshoot/
- Docker Compose services reference (`dns`, `dns_opt`, `dns_search`): https://docs.docker.com/reference/compose-file/services/
- Docker Compose networks reference: https://docs.docker.com/reference/compose-file/networks/
- Docker with iptables: https://docs.docker.com/engine/network/firewall-iptables/
- `resolv.conf(5)` Linux manual page: https://man7.org/linux/man-pages/man5/resolv.conf.5.html
- Portainer stack documentation: https://docs.portainer.io/sts/user/docker/stacks/add

## Issues Found
1. **Overstated use of `127.0.0.11`.** The post originally implied Docker containers generally use `127.0.0.11` for DNS. Docker documents that containers on the default `bridge` network receive a copy of the host's `/etc/resolv.conf`, while containers on custom networks use Docker's embedded DNS server at `127.0.0.11`. I updated the external-DNS and embedded-DNS sections to distinguish those cases.
2. **Incorrect Compose DNS example for intermittent failures.** The original fix set `dns: 127.0.0.11` and `dns_search: .`. I removed that configuration and replaced it with a documented `dns_opt` example, because the post was mixing Docker's embedded resolver address with user-configured upstream DNS settings.
3. **Incorrect `ndots` default claim.** The post said `ndots:1` reduced the default from `5`. The Linux `resolv.conf(5)` documentation states the default `ndots` value is `1`. I changed the wording so `ndots:1` is recommended only when the environment already sets a higher value.
4. **Incorrect "per-network DNS" claim in Compose.** The original section said DNS could be overridden per network, but the example only changed a bridge driver option and Compose DNS configuration is defined per service. I replaced that section with a correct per-service Compose DNS example.
5. **Misleading default-bridge and embedded-DNS troubleshooting guidance.** The post said the default `docker0` bridge "doesn't support DNS" and suggested checking `iptables -L DOCKER -n | grep 53` on the host. Docker's docs are more specific: the default bridge lacks automatic container-name DNS resolution, and DNS-related iptables rules are created in the container's network namespace. I corrected the bridge wording and replaced the iptables check with a network-attachment check.
6. **Diagnostic commands assumed tools that may not exist in the image.** I added a short qualifier that `nslookup` and `dig` must be present in the container image for those commands to work as written.

## Review Notes
- The article is technically about Docker networking behavior underneath Portainer-managed containers and stacks. The Portainer framing is reasonable, but the troubleshooting steps themselves are Docker-level.
- Docker CLI binaries were not available in this workspace, so command syntax was verified against Docker's official documentation rather than local `--help` output.
- The `/etc/docker/daemon.json` path is correct for standard Linux Docker Engine installs. Rootless Docker uses `~/.config/docker/daemon.json`.
