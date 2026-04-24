# Validation Summary: How to Restrict Management Ports in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer CE
- Docker Engine
- Docker Compose
- UFW
- iptables / netfilter
- Nmap

## Sources Consulted
- Portainer install CE with Docker on Linux: https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer connect to the Docker API: https://docs.portainer.io/admin/environments/add/docker/api
- Docker `docker container run` reference: https://docs.docker.com/reference/cli/docker/container/run
- Docker port publishing and mapping: https://docs.docker.com/engine/network/port-publishing/
- Docker packet filtering and firewalls: https://docs.docker.com/engine/network/packet-filtering-firewalls/
- Docker with iptables: https://docs.docker.com/engine/network/firewall-iptables/
- Docker remote access for the daemon: https://docs.docker.com/engine/daemon/remote-access/
- Protect the Docker daemon socket: https://docs.docker.com/engine/security/protect-access/
- Docker Compose version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Ubuntu `ufw` man page: https://manpages.ubuntu.com/manpages/focal/man8/ufw.8.html
- Nmap reference guide: https://nmap.org/data/nmap_manpage.html
- Tecnativa docker-socket-proxy repository: https://github.com/Tecnativa/docker-socket-proxy

## Issues Found
- The UFW section implied plain UFW rules would control Docker-published ports. I added a Docker/UFW caveat because Docker documents that published ports can bypass UFW's normal filtering path.
- The iptables example targeted the `INPUT` chain, which is not the right place to filter Docker-published container traffic. I replaced it with `DOCKER-USER` rules using `conntrack`, which matches Docker's documented firewall behavior.
- The `docker run` example had an inline comment after a line-continuation backslash, which breaks the shell command. I moved the comment out of the command and updated the Portainer image tags to the current STS channel. I also removed obsolete top-level Compose `version` keys.
- The Docker TCP disable step only looked at `daemon.json`. I updated it to check systemd overrides too and noted Docker's documented conflict between daemon flags and `daemon.json` `hosts` settings.
- The socket-proxy example used `DOCKER_HOST` for Portainer and set `POST: 0`, which makes the proxy read-only. I changed it to use Portainer's documented `-H` flag, restored persistent `/data` storage, switched the proxy image to the official GHCR location, and clarified that `POST: 1` is required for management actions.
- The expected `nmap` output used non-standard service labels and overly specific states. I rewrote the scan expectations to focus on reliable port states instead.
- The UFW rules omitted `proto tcp`, which would allow or deny more broadly than intended. I narrowed them to TCP to match the services discussed in the post.
- The intro and management-port table treated Portainer port `9000` like a normal default exposure. I clarified that it is a legacy HTTP port and only a risk if enabled.

## Review Notes
- The post is now accurate against current Portainer STS and current Docker Engine documentation.
- If a host uses Docker's nftables backend instead of iptables, equivalent nftables rules are required because `DOCKER-USER` is specific to the iptables backend.
- Port `8000` remains optional and should only be published when Edge Agent connectivity is needed. If edge nodes have fixed egress IPs, it can be restricted more tightly than the broad example shown.
- Docker is continuing to tighten remote unauthenticated TCP access to the daemon. Remote `2375` should be avoided except for tightly controlled local or proxy-only scenarios.
