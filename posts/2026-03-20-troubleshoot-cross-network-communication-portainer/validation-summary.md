# Validation Summary: How to Troubleshoot Cross-Network Container Communication in Portainer

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker bridge networking
- Docker Compose networking
- Docker embedded DNS
- Linux iptables firewall rules
- Command-line debugging tools (`docker`, `jq`, `nslookup`, `getent`, `nc`, `curl`)

## Sources Consulted
- Docker bridge network driver documentation: https://docs.docker.com/engine/network/drivers/bridge/
- Docker Engine networking documentation: https://docs.docker.com/engine/network/
- Docker Compose networks reference: https://docs.docker.com/reference/compose-file/networks/
- Docker `network inspect` CLI reference: https://docs.docker.com/reference/cli/docker/network/inspect/
- Docker `network ls` CLI reference: https://docs.docker.com/reference/cli/docker/network/ls/
- Docker `container exec` CLI reference: https://docs.docker.com/reference/cli/docker/container/exec/
- Docker iptables/firewall documentation: https://docs.docker.com/engine/network/firewall-iptables/
- Dockerfile `HEALTHCHECK` reference: https://docs.docker.com/reference/dockerfile/#healthcheck
- Portainer container details documentation: https://docs.portainer.io/user/docker/containers/view
- Portainer container console documentation: https://docs.portainer.io/sts/user/docker/containers/console

## Issues Found
- The `docker ps` comment implied every running container should have passing health checks. Docker only reports a health status when a health check is configured, so the wording now says `"healthy"` is expected only if health checks are configured.
- The network membership section said containers can only communicate on the same Docker network. Docker bridge networks isolate direct container-to-container traffic by default, but published ports and other network modes can allow communication across network boundaries. The wording now scopes the rule to direct communication by container or service name.
- The DNS example showed `Address: 10.0.0.x` immediately after `Server: 127.0.0.11`, which can be confused with the resolver address in `nslookup` output. The example now separates Docker's embedded DNS server from the resolved target service address.
- The firewall section assumed Docker's iptables backend. Docker also documents nftables support, so the text now specifies Linux hosts using Docker's iptables backend and clarifies that the command checks for DROP policies or rules.
- The default bridge section said the default `bridge` network does not support DNS. Docker containers on the default bridge still receive DNS configuration for external lookups; the limitation is automatic container-name DNS. The wording now reflects that distinction.

## Review Notes
- The commands are valid for typical Linux Docker Engine deployments, but `nslookup`, `getent`, `nc`, and `curl` depend on the tools installed inside the source container image.
- The Compose network snippets are syntactically valid, but a complete stack must also attach the relevant services to the named network.
