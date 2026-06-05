# Validation Summary: How to Fix Docker Containers Not Resolving External DNS

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Docker Engine
- Docker networking
- Docker Compose
- Linux DNS resolver configuration
- systemd-resolved
- iptables and ufw

## Sources Consulted
- Docker Docs: Networking overview, DNS services - https://docs.docker.com/engine/network/
- Docker Docs: Troubleshooting the Docker daemon, Specify DNS servers for Docker - https://docs.docker.com/engine/daemon/troubleshoot/
- Docker Docs: dockerd reference, daemon DNS options and daemon.json keys - https://docs.docker.com/reference/cli/dockerd/
- Docker Docs: docker container run CLI reference - https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs: Compose file services reference, dns and dns_search - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Networking in Compose - https://docs.docker.com/compose/how-tos/networking/
- systemd-resolved manual page - https://man7.org/linux/man-pages/man8/systemd-resolved.service.8.html
- resolv.conf manual page - https://man7.org/linux/man-pages/man5/resolv.conf.5.html
- Local Docker CLI help for `docker run`, `docker network create`, and `docker info`

## Issues Found
- The opening Docker DNS explanation implied Docker simply copies `/etc/resolv.conf` into every container. Updated it to distinguish the default bridge network from user-defined networks, where Docker's embedded DNS server at 127.0.0.11 forwards external lookups to host-configured DNS servers.
- The systemd-resolved section stated that seeing 127.0.0.53 is always the problem. Updated the wording to clarify that it is a problem when 127.0.0.53 appears inside the container and DNS fails, and noted that Docker may already detect systemd-resolved and use `/run/systemd/resolve/resolv.conf`.
- The text said Docker could be configured to use the actual DNS file, but the JSON example configures DNS server IP addresses. Changed the wording to "actual upstream DNS servers."
- The "Custom Bridge Network Missing DNS Configuration" heading contradicted the section content, which describes the default bridge network lacking Docker's embedded DNS. Renamed it to "Default Bridge Network Missing Embedded DNS."
- The DNS search-domain explanation said the resolver tries `api.example.com.corp.internal` instead of `api.example.com`. Updated it to say search-expanded names may be tried in addition to the original name, depending on resolver options.
- The diagnostic command `docker info | grep -i dns` is not a reliable way to inspect daemon DNS settings. Replaced it with checking `/etc/docker/daemon.json`, matching Docker's documented daemon configuration location for standard Linux Docker Engine installs.

## Review Notes
The command examples and Compose keys are otherwise valid. The article focuses on Linux Docker Engine behavior; Docker Desktop, rootless Docker, and host-network containers can differ and would be useful caveats in a future broader revision.
